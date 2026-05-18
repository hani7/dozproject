from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from django.db.models import F
from .models import Vente, LigneVente
from .serializers import VenteSerializer, VenteCreateSerializer
from stock.models import MouvementStock
from products.models import Produit


class VenteViewSet(viewsets.ModelViewSet):
    queryset = Vente.objects.select_related(
        'client', 'cree_par', 'livreur'
    ).prefetch_related('lignes__produit').all()

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
        if self.action in ['create', 'update', 'partial_update']:
            return VenteCreateSerializer
        return VenteSerializer

    def perform_create(self, serializer):
        with transaction.atomic():
            vente = serializer.save(cree_par=self.request.user)
            # Use F() expressions for race-condition-safe stock update
            for ligne in vente.lignes.all():
                Produit.objects.filter(pk=ligne.produit_id).update(
                    stock_actuel=F('stock_actuel') - ligne.quantite
                )
                # Read fresh stock values for the movement log
                produit = Produit.objects.only(
                    'stock_actuel'
                ).get(pk=ligne.produit_id)
                MouvementStock.objects.create(
                    produit_id=ligne.produit_id,
                    type_mouvement='sortie',
                    motif='vente',
                    quantite=ligne.quantite,
                    stock_avant=produit.stock_actuel + ligne.quantite,
                    stock_apres=produit.stock_actuel,
                    reference=vente.reference,
                    cree_par=self.request.user,
                )

    @action(detail=True, methods=['post'])
    def retour(self, request, pk=None):
        """Process a product return: restore stock, update sale total."""
        vente = self.get_object()
        lignes_retour = request.data.get('lignes', [])
        if not lignes_retour:
            return Response({'error': 'Aucune ligne de retour fournie.'}, status=400)

        with transaction.atomic():
            valeur_retour_totale = 0
            for item in lignes_retour:
                qte = int(item.get('quantite', 0))
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

                # Race-condition-safe update
                Produit.objects.filter(pk=ligne.produit_id).update(
                    stock_actuel=F('stock_actuel') + qte
                )
                produit = Produit.objects.only('stock_actuel').get(pk=ligne.produit_id)

                valeur_retour = qte * float(ligne.prix_unitaire)
                valeur_retour_totale += valeur_retour

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

            nouveau_total = float(vente.montant_total) - valeur_retour_totale
            nouveau_paye  = max(0, float(vente.montant_paye) - valeur_retour_totale)
            vente.montant_total = max(0, nouveau_total)
            vente.montant_paye  = nouveau_paye
            vente.save(update_fields=['montant_total', 'montant_paye', 'updated_at'])

        return Response(VenteSerializer(vente).data)

    @action(detail=True, methods=['post'])
    def confirmer(self, request, pk=None):
        vente = self.get_object()
        vente.statut = 'confirmee'
        vente.save(update_fields=['statut', 'updated_at'])
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

        vente.livreur = livreur
        vente.statut = 'en_livraison'
        vente.save(update_fields=['livreur', 'statut', 'updated_at'])
        return Response(VenteSerializer(vente).data)

    @action(detail=True, methods=['post'])
    def livrer(self, request, pk=None):
        vente = self.get_object()
        vente.statut = 'livree'
        vente.save(update_fields=['statut', 'updated_at'])
        return Response(VenteSerializer(vente).data)
