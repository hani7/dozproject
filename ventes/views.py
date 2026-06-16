from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from django.db.models import F
from .models import Vente, LigneVente
from .serializers import VenteSerializer, VenteListSerializer, VenteCreateSerializer
from stock.models import MouvementStock
from products.models import Produit

def deduct_stock_if_needed(vente, user):
    """
    Deducts stock for a sale only if its status is confirmed or later,
    and guarantees it is never deducted twice by checking MouvementStock.
    """
    if vente.statut not in ['confirmee', 'en_livraison', 'livree', 'cloturee']:
        return

    if MouvementStock.objects.filter(reference=vente.reference, type_mouvement='sortie', motif='vente').exists():
        return

    for ligne in vente.lignes.all():
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
            reference=vente.reference,
            cree_par=user,
        )


class VenteViewSet(viewsets.ModelViewSet):
    queryset = Vente.objects.select_related(
        'client', 'cree_par', 'livreur'
    ).prefetch_related('lignes__produit').order_by('-created_at').all()

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        'type_vente':    ['exact'],
        'statut':        ['exact'],
        'client':        ['exact'],
        'mode_paiement': ['exact'],
        'date':          ['gte', 'lte', 'exact'],
        'created_at':    ['gte', 'lte'],
    }
    search_fields  = ['reference', 'client__nom']
    ordering_fields = ['date', 'created_at', 'montant_total']

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return VenteCreateSerializer
        if self.action == 'list':
            return VenteListSerializer
        return VenteSerializer

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()
        # Livreur: only sees ventes assigned to them
        if user.role == 'livreur':
            return qs.filter(livreur=user)
        return qs

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return VenteCreateSerializer
        return VenteSerializer

    def perform_create(self, serializer):
        with transaction.atomic():
            vente = serializer.save(cree_par=self.request.user)
            deduct_stock_if_needed(vente, self.request.user)

    def perform_update(self, serializer):
        with transaction.atomic():
            vente = serializer.save()
            deduct_stock_if_needed(vente, self.request.user)

    @action(detail=True, methods=['post'])
    def retour(self, request, pk=None):
        """Process a product return: restore stock, update sale total."""
        from decimal import Decimal
        vente = self.get_object()
        lignes_retour = request.data.get('lignes', [])
        if not lignes_retour:
            return Response({'error': 'Aucune ligne de retour fournie.'}, status=400)

        with transaction.atomic():
            valeur_retour_totale = Decimal('0')
            for item in lignes_retour:
                qte = Decimal(str(item.get('quantite', 0)))
                if qte <= 0:
                    continue
                try:
                    ligne = vente.lignes.get(produit_id=item['produit_id'])
                except LigneVente.DoesNotExist:
                    return Response(
                        {'error': f"Produit {item['produit_id']} introuvable dans cette vente."},
                        status=400,
                    )

                if qte > ligne.quantite:
                    return Response(
                        {'error': f"Quantité retournée ({qte}) > quantité vendue ({ligne.quantite}) pour {ligne.produit.nom}."},
                        status=400,
                    )

                # Race-condition-safe stock update (+qte = return to stock)
                Produit.objects.filter(pk=ligne.produit_id).update(
                    stock_actuel=F('stock_actuel') + qte
                )
                produit = Produit.objects.only('stock_actuel').get(pk=ligne.produit_id)

                valeur_retour_totale += qte * ligne.prix_unitaire

                MouvementStock.objects.create(
                    produit_id=ligne.produit_id,
                    type_mouvement='entree',
                    motif='retour',
                    quantite=qte,
                    stock_avant=produit.stock_actuel - qte,
                    stock_apres=produit.stock_actuel,
                    reference=vente.reference,
                    notes=f"Retour de {qte} carton(s) — Vente {vente.reference}",
                    cree_par=request.user,
                )

            nouveau_total = vente.montant_total - valeur_retour_totale
            nouveau_paye  = max(Decimal('0'), vente.montant_paye - valeur_retour_totale)
            vente.montant_total = max(Decimal('0'), nouveau_total)
            vente.montant_paye  = nouveau_paye
            vente.save(update_fields=['montant_total', 'montant_paye', 'updated_at'])

        return Response(VenteSerializer(vente).data)

    @action(detail=True, methods=['post'])
    def confirmer(self, request, pk=None):
        with transaction.atomic():
            vente = self.get_object()
            vente.statut = 'confirmee'
            vente.save(update_fields=['statut', 'updated_at'])
            deduct_stock_if_needed(vente, request.user)
        return Response(VenteSerializer(vente).data)

    @action(detail=True, methods=['post'])
    def assigner_livreur(self, request, pk=None):
        from accounts.models import CustomUser
        vente = self.get_object()
        livreur_id = request.data.get('livreur_id')
        if not livreur_id:
            return Response({'error': 'livreur_id requis'}, status=400)
        try:
            livreur = CustomUser.objects.get(pk=livreur_id, role='livreur')
        except CustomUser.DoesNotExist:
            return Response({'error': 'Livreur introuvable'}, status=400)

        with transaction.atomic():
            vente.livreur = livreur
            vente.statut = 'en_livraison'
            vente.save(update_fields=['livreur', 'statut', 'updated_at'])
            deduct_stock_if_needed(vente, request.user)
        return Response(VenteSerializer(vente).data)

    @action(detail=True, methods=['post'])
    def livrer(self, request, pk=None):
        with transaction.atomic():
            vente = self.get_object()
            vente.statut = 'livree'
            vente.save(update_fields=['statut', 'updated_at'])
            deduct_stock_if_needed(vente, request.user)
        return Response(VenteSerializer(vente).data)

    @action(detail=True, methods=['post'])
    def approuver(self, request, pk=None):
        with transaction.atomic():
            vente = self.get_object()
            vente.statut = 'cloturee'
            vente.save(update_fields=['statut', 'updated_at'])
            deduct_stock_if_needed(vente, request.user)
        return Response(VenteSerializer(vente).data)

    @action(detail=True, methods=['post'])
    def non_conforme(self, request, pk=None):
        from decimal import Decimal
        vente = self.get_object()
        lignes_retour = request.data.get('lignes', [])
        if not lignes_retour:
            return Response({'error': 'Aucune ligne de retour fournie.'}, status=400)

        with transaction.atomic():
            valeur_retour_totale = Decimal('0')
            for item in lignes_retour:
                qte = Decimal(str(item.get('quantite', 0)))
                if qte <= 0:
                    continue
                try:
                    ligne = vente.lignes.get(produit_id=item['produit_id'])
                except LigneVente.DoesNotExist:
                    return Response({'error': f"Produit {item['produit_id']} introuvable."}, status=400)

                if qte > ligne.quantite:
                    return Response({'error': f"Quantité ({qte}) > vendue ({ligne.quantite})."}, status=400)

                valeur_retour = qte * ligne.prix_unitaire
                valeur_retour_totale += valeur_retour

                # 1. Reverse the sale first to avoid double deduction
                Produit.objects.filter(pk=ligne.produit_id).update(stock_actuel=F('stock_actuel') + qte)
                p_temp = Produit.objects.only('stock_actuel').get(pk=ligne.produit_id)
                MouvementStock.objects.create(
                    produit_id=ligne.produit_id,
                    type_mouvement='entree',
                    motif='retour',
                    quantite=qte,
                    stock_avant=p_temp.stock_actuel - qte,
                    stock_apres=p_temp.stock_actuel,
                    reference=vente.reference,
                    notes=f"Retour (avant perte) — Vente {vente.reference}",
                    cree_par=request.user,
                )

                # 2. Now log the actual loss
                Produit.objects.filter(pk=ligne.produit_id).update(stock_actuel=F('stock_actuel') - qte)
                produit = Produit.objects.only('stock_actuel').get(pk=ligne.produit_id)
                MouvementStock.objects.create(
                    produit_id=ligne.produit_id,
                    type_mouvement='sortie',
                    motif='non_conforme',
                    quantite=qte,
                    stock_avant=produit.stock_actuel + qte,
                    stock_apres=produit.stock_actuel,
                    reference=vente.reference,
                    notes=f"Déclaration non-conforme — {qte} carton(s) perdu(s) — Vente {vente.reference}",
                    cree_par=request.user,
                )

                # Diminue la quantité de la ligne
                ligne.quantite  = ligne.quantite - qte
                ligne.sous_total = ligne.prix_unitaire * ligne.quantite
                ligne.save(update_fields=['quantite', 'sous_total'])

            nouveau_total = vente.montant_total - valeur_retour_totale
            nouveau_paye  = max(Decimal('0'), vente.montant_paye - valeur_retour_totale)
            vente.montant_total = max(Decimal('0'), nouveau_total)
            vente.montant_paye  = nouveau_paye
            vente.save(update_fields=['montant_total', 'montant_paye', 'updated_at'])

        return Response(VenteSerializer(vente).data)

    @action(detail=True, methods=['post'])
    def marquer_non_paye(self, request, pk=None):
        """Mark vente as non-payé (mode_paiement = non_paye, no payment recorded)."""
        vente = self.get_object()
        vente.mode_paiement = 'non_paye'
        vente.save(update_fields=['mode_paiement', 'updated_at'])
        return Response(VenteSerializer(vente).data)

    @action(detail=True, methods=['post'])
    def payer(self, request, pk=None):
        from paiements.models import Paiement
        from django.utils import timezone
        from decimal import Decimal
        vente = self.get_object()
        montant = Decimal(str(request.data.get('montant', 0)))
        if montant <= 0:
            return Response({'error': 'Montant invalide.'}, status=400)

        with transaction.atomic():
            vente.montant_paye = vente.montant_paye + montant
            vente.save(update_fields=['montant_paye', 'updated_at'])

            Paiement.objects.create(
                type_paiement='vente',
                mode=request.data.get('mode_paiement', 'especes'),
                montant=montant,
                vente_ref=vente.reference,
                client_nom=vente.client.nom if vente.client else '',
                date=timezone.now().date(),
                notes=request.data.get('notes', ''),
                cree_par=request.user,
            )

        return Response(VenteSerializer(vente).data)

    @action(detail=True, methods=['post'])
    def annuler(self, request, pk=None):
        from stock.models import MouvementStock
        from products.models import Produit
        from django.db.models import F

        with transaction.atomic():
            vente = self.get_object()
            if vente.statut == 'annulee':
                return Response({'error': 'Déjà annulée.'}, status=400)

            # Check if stock was deducted (statut was confirmée, en_livraison, etc.)
            mouvements_sortie = MouvementStock.objects.filter(reference=vente.reference, type_mouvement='sortie', motif='vente')
            if mouvements_sortie.exists():
                for mvt in mouvements_sortie:
                    Produit.objects.filter(pk=mvt.produit_id).update(stock_actuel=F('stock_actuel') + mvt.quantite)
                    produit = Produit.objects.only('stock_actuel').get(pk=mvt.produit_id)
                    MouvementStock.objects.create(
                        produit_id=mvt.produit_id,
                        type_mouvement='entree',
                        motif='retour',
                        quantite=mvt.quantite,
                        stock_avant=produit.stock_actuel - mvt.quantite,
                        stock_apres=produit.stock_actuel,
                        reference=vente.reference,
                        notes=f"Annulation vente — {vente.reference}",
                        cree_par=request.user,
                    )

            vente.statut = 'annulee'
            vente.save(update_fields=['statut', 'updated_at'])
            
        return Response(VenteSerializer(vente).data)
