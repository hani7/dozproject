from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from .models import BonAchat, LigneAchat
from .serializers import BonAchatSerializer, BonAchatCreateSerializer
from stock.models import MouvementStock
from products.models import Produit


class BonAchatViewSet(viewsets.ModelViewSet):
    queryset = BonAchat.objects.select_related('fournisseur', 'cree_par').prefetch_related('lignes__produit').all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        'statut': ['exact'],
        'fournisseur': ['exact'],
        'date': ['gte', 'lte', 'exact'],
        'created_at': ['gte', 'lte']
    }
    search_fields = ['reference', 'fournisseur__nom']
    ordering_fields = ['date', 'created_at', 'montant_total']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return BonAchatCreateSerializer
        return BonAchatSerializer

    def perform_create(self, serializer):
        serializer.save(cree_par=self.request.user)

    @action(detail=True, methods=['post'])
    def recevoir(self, request, pk=None):
        """Mark purchase as received and update stock"""
        bon = self.get_object()
        if bon.statut == 'recu':
            return Response({'error': 'Déjà reçu'}, status=400)

        with transaction.atomic():
            for ligne in bon.lignes.all():
                produit = ligne.produit
                # ── Paid palettes → main product ──────────────────────────
                cartons_payes = ligne.quantite * produit.cartons_par_palette
                stock_avant = produit.stock_actuel
                stock_apres = stock_avant + cartons_payes
                Produit.objects.filter(pk=produit.pk).update(
                    stock_actuel=stock_apres,
                    prix_achat=ligne.prix_unitaire
                )
                MouvementStock.objects.create(
                    produit=produit,
                    type_mouvement='entree',
                    motif='achat',
                    quantite=cartons_payes,
                    stock_avant=stock_avant,
                    stock_apres=stock_apres,
                    reference=bon.reference,
                    notes=f"{ligne.quantite} palette(s) achetée(s) × {produit.cartons_par_palette} cartons",
                    cree_par=request.user,
                )

                # ── Offered palettes → produit_offert (or same product) ──
                if ligne.quantite_offerte and ligne.quantite_offerte > 0:
                    produit_off = ligne.produit_offert if ligne.produit_offert else produit
                    cartons_offerts = ligne.quantite_offerte * produit_off.cartons_par_palette
                    produit_off.refresh_from_db()
                    sv_off = produit_off.stock_actuel
                    sa_off = sv_off + cartons_offerts
                    Produit.objects.filter(pk=produit_off.pk).update(stock_actuel=sa_off)
                    MouvementStock.objects.create(
                        produit=produit_off,
                        type_mouvement='entree',
                        motif='achat',
                        quantite=cartons_offerts,
                        stock_avant=sv_off,
                        stock_apres=sa_off,
                        reference=bon.reference,
                        notes=f"🎁 {ligne.quantite_offerte} palette(s) offerte(s) × {produit_off.cartons_par_palette} cartons",
                        cree_par=request.user,
                    )

            bon.statut = 'recu'
            bon.save()

        return Response(BonAchatSerializer(bon).data)
