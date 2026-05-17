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
                # ligne.quantite = number of palettes bought
                cartons_recus = ligne.quantite * produit.cartons_par_palette
                stock_avant = produit.stock_actuel
                stock_apres = stock_avant + cartons_recus
                Produit.objects.filter(pk=produit.pk).update(
                    stock_actuel=stock_apres,
                    prix_achat=ligne.prix_unitaire  # price per palette
                )
                MouvementStock.objects.create(
                    produit=produit,
                    type_mouvement='entree',
                    motif='achat',
                    quantite=cartons_recus,
                    stock_avant=stock_avant,
                    stock_apres=stock_apres,
                    reference=bon.reference,
                    notes=f"{ligne.quantite} palette(s) × {produit.cartons_par_palette} cartons",
                    cree_par=request.user,
                )
            bon.statut = 'recu'
            bon.save()

        return Response(BonAchatSerializer(bon).data)
