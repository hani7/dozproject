from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from django.utils import timezone
from .models import Commande, LigneCommande
from .serializers import CommandeSerializer, CommandeCreateSerializer
from stock.models import MouvementStock
from products.models import Produit
from django.db.models import F

def deduct_stock_if_needed_commande(commande, user):
    """
    Deducts stock for an order only if its status is confirmed or later,
    and guarantees it is never deducted twice by checking MouvementStock.
    """
    if commande.statut not in ['confirmee', 'en_livraison', 'livree', 'cloturee']:
        return

    if MouvementStock.objects.filter(reference=commande.reference, type_mouvement='sortie', motif='vente').exists():
        return

    for ligne in commande.lignes.all():
        if ligne.quantite <= 0:
            continue
        Produit.objects.filter(pk=ligne.produit_id).update(
            stock_actuel=F('stock_actuel') - ligne.quantite
        )
        produit = Produit.objects.only('stock_actuel').get(pk=ligne.produit_id)
        MouvementStock.objects.create(
            produit_id=ligne.produit_id,
            type_mouvement='sortie',
            motif='vente',
            quantite=ligne.quantite,
            stock_avant=produit.stock_actuel + ligne.quantite,
            stock_apres=produit.stock_actuel,
            reference=commande.reference,
            cree_par=user,
        )
class CommandeViewSet(viewsets.ModelViewSet):
    # Use the fully-optimized base queryset everywhere (including custom actions)
    queryset = Commande.objects.select_related(
        'client', 'prevendeur', 'livreur'
    ).prefetch_related('lignes__produit').all()

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        'statut': ['exact'],
        'type_commande': ['exact'],
        'prevendeur': ['exact'],
        'livreur': ['exact'],
        'created_at': ['gte', 'lte'],
    }
    search_fields = ['reference', 'client__nom']
    ordering_fields = ['created_at', 'montant_total']

    def get_serializer_class(self):
        if self.action == 'create':
            return CommandeCreateSerializer
        return CommandeSerializer

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()

        # Prévendeur: sees only their own orders
        if user.role == 'prevendeur':
            return qs.filter(prevendeur=user)

        # Livreur: sees only orders assigned to them
        if user.role == 'livreur':
            return qs.filter(livreur=user)

        return qs

    def perform_create(self, serializer):
        user = self.request.user
        type_commande = serializer.validated_data.get('type_commande')
        if user.role == 'prevendeur' and user.specialite != 'les_deux':
            if user.specialite != type_commande:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({
                    'type_commande': f'Vous êtes spécialisé en "{user.specialite}" uniquement.'
                })
        serializer.save(prevendeur=user)

    @action(detail=True, methods=['post'])
    def confirmer(self, request, pk=None):
        with transaction.atomic():
            commande = self.get_object()
            commande.statut = 'confirmee'
            commande.confirmed_at = timezone.now()
            commande.save(update_fields=['statut', 'confirmed_at', 'updated_at'])
            deduct_stock_if_needed_commande(commande, request.user)
        return Response(CommandeSerializer(commande).data)

    @action(detail=True, methods=['post'])
    def assigner_livreur(self, request, pk=None):
        from accounts.models import CustomUser
        commande = self.get_object()
        livreur_id = request.data.get('livreur_id')
        if not livreur_id:
            return Response({'error': 'livreur_id requis'}, status=400)
        try:
            livreur = CustomUser.objects.get(pk=livreur_id, role='livreur')
        except CustomUser.DoesNotExist:
            return Response({'error': 'Livreur introuvable'}, status=400)

        if livreur.specialite != 'les_deux' and livreur.specialite != commande.type_commande:
            return Response({
                'error': f'Ce livreur est spécialisé "{livreur.specialite}" et ne peut pas livrer une commande "{commande.type_commande}".'
            }, status=400)

        with transaction.atomic():
            commande.livreur = livreur
            commande.statut = 'en_livraison'
            commande.save(update_fields=['livreur', 'statut', 'updated_at'])
            deduct_stock_if_needed_commande(commande, request.user)
        return Response(CommandeSerializer(commande).data)

    @action(detail=True, methods=['post'])
    def livrer(self, request, pk=None):
        with transaction.atomic():
            commande = self.get_object()
            commande.statut = 'livree'
            commande.delivered_at = timezone.now()
            commande.save(update_fields=['statut', 'delivered_at', 'updated_at'])
            deduct_stock_if_needed_commande(commande, request.user)
        return Response(CommandeSerializer(commande).data)

    @action(detail=True, methods=['post'])
    def approuver(self, request, pk=None):
        commande = self.get_object()
        if commande.statut == 'cloturee':
            return Response({'error': 'Commande déjà clôturée'}, status=400)

        with transaction.atomic():
            commande.statut = 'cloturee'
            commande.save(update_fields=['statut', 'updated_at'])
            deduct_stock_if_needed_commande(commande, request.user)
        return Response(CommandeSerializer(commande).data)

    @action(detail=True, methods=['post'])
    def retour(self, request, pk=None):
        from django.db import transaction
        from .models import LigneCommande
        
        commande = self.get_object()
        lignes_retour = request.data.get('lignes', [])
        if not lignes_retour:
            return Response({'error': 'Aucune ligne de retour fournie.'}, status=400)

        with transaction.atomic():
            from decimal import Decimal
            valeur_retour_totale = Decimal('0')
            for item in lignes_retour:
                qte = Decimal(str(item.get('quantite', 0)))
                if qte <= 0:
                    continue
                try:
                    ligne = commande.lignes.get(produit_id=item['produit_id'])
                except LigneCommande.DoesNotExist:
                    return Response({'error': f"Produit {item['produit_id']} introuvable."}, status=400)
                
                if qte > ligne.quantite:
                    return Response({'error': f"Quantité ({qte}) > commandée ({ligne.quantite})."}, status=400)

                valeur_retour = qte * ligne.prix_unitaire
                valeur_retour_totale += valeur_retour
                
                ligne.quantite -= qte
                ligne.sous_total = ligne.prix_unitaire * ligne.quantite
                ligne.save(update_fields=['quantite', 'sous_total'])

                # Trace le retour dans les mouvements de stock sans modifier stock_actuel (déjà pris en compte par la réduction de quantité)
                from stock.models import MouvementStock
                from products.models import Produit
                produit = Produit.objects.only('stock_actuel').get(pk=ligne.produit_id)
                MouvementStock.objects.create(
                    produit_id=ligne.produit_id,
                    type_mouvement='entree',
                    motif='retour',
                    quantite=qte,
                    stock_avant=produit.stock_actuel,
                    stock_apres=produit.stock_actuel,
                    reference=commande.reference,
                    notes=f"Retour de {qte} carton(s) — Commande {commande.reference}",
                    cree_par=request.user,
                )

            # Commande : Le retour ne touche pas au stock, il diminue juste le total
            nouveau_total = commande.montant_total - valeur_retour_totale
            nouveau_paye  = max(Decimal('0'), commande.montant_paye - valeur_retour_totale)
            commande.montant_total = max(Decimal('0'), nouveau_total)
            commande.montant_paye  = nouveau_paye
            commande.save(update_fields=['montant_total', 'montant_paye', 'updated_at'])

        return Response(CommandeSerializer(commande).data)

    @action(detail=True, methods=['post'])
    def non_conforme(self, request, pk=None):
        from django.db import transaction
        from stock.models import MouvementStock
        from django.db.models import F
        from products.models import Produit
        from .models import LigneCommande
        
        commande = self.get_object()
        lignes_retour = request.data.get('lignes', [])
        if not lignes_retour:
            return Response({'error': 'Aucune ligne de retour fournie.'}, status=400)

        with transaction.atomic():
            from decimal import Decimal
            valeur_retour_totale = Decimal('0')
            for item in lignes_retour:
                qte = Decimal(str(item.get('quantite', 0)))
                if qte <= 0:
                    continue
                try:
                    ligne = commande.lignes.get(produit_id=item['produit_id'])
                except LigneCommande.DoesNotExist:
                    return Response({'error': f"Produit {item['produit_id']} introuvable."}, status=400)
                
                if qte > ligne.quantite:
                    return Response({'error': f"Quantité ({qte}) > commandée ({ligne.quantite})."}, status=400)

                # Sortie de stock immédiate pour produit cassé (perte)
                Produit.objects.filter(pk=ligne.produit_id).update(
                    stock_actuel=F('stock_actuel') - qte
                )
                produit = Produit.objects.only('stock_actuel').get(pk=ligne.produit_id)
                MouvementStock.objects.create(
                    produit_id=ligne.produit_id,
                    type_mouvement='sortie',
                    motif='non_conforme',
                    quantite=qte,
                    stock_avant=produit.stock_actuel + qte,
                    stock_apres=produit.stock_actuel,
                    reference=commande.reference,
                    notes=f"Produit non conforme — Commande {commande.reference}",
                    cree_par=request.user,
                )

                valeur_retour = qte * ligne.prix_unitaire
                valeur_retour_totale += valeur_retour
                
                ligne.quantite -= qte
                ligne.sous_total = ligne.prix_unitaire * ligne.quantite
                ligne.save(update_fields=['quantite', 'sous_total'])

            nouveau_total = commande.montant_total - valeur_retour_totale
            nouveau_paye  = max(Decimal('0'), commande.montant_paye - valeur_retour_totale)
            commande.montant_total = max(Decimal('0'), nouveau_total)
            commande.montant_paye  = nouveau_paye
            commande.save(update_fields=['montant_total', 'montant_paye', 'updated_at'])

        return Response(CommandeSerializer(commande).data)

    @action(detail=True, methods=['post'])
    def payer(self, request, pk=None):
        from paiements.models import Paiement
        from decimal import Decimal
        commande = self.get_object()
        montant = Decimal(str(request.data.get('montant', 0)))
        if montant <= 0:
            return Response({'error': 'Montant invalide.'}, status=400)

        with transaction.atomic():
            commande.montant_paye = commande.montant_paye + montant
            commande.save(update_fields=['montant_paye', 'updated_at'])

            Paiement.objects.create(
                type_paiement='vente',
                mode=request.data.get('mode_paiement', 'especes'),
                montant=montant,
                vente_ref=commande.reference,
                client_nom=commande.client.nom if commande.client else '',
                date=timezone.now().date(),
                notes=request.data.get('notes', ''),
                cree_par=request.user,
            )

        return Response(CommandeSerializer(commande).data)

    @action(detail=False, methods=['get'])
    def en_attente(self, request):
        """For polling — returns pending orders using the optimized base queryset."""
        qs = self.get_queryset().filter(statut='en_attente').order_by('-created_at')
        return Response(CommandeSerializer(qs, many=True).data)
