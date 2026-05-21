from rest_framework import viewsets, filters
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import MouvementStock
from .serializers import MouvementStockSerializer, MouvementStockCreateSerializer
from products.models import Produit


class MouvementStockViewSet(viewsets.ModelViewSet):
    queryset = MouvementStock.objects.select_related('produit', 'cree_par').all()
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = {
        'produit': ['exact'],
        'type_mouvement': ['exact'],
        'motif': ['exact'],
        'reference': ['exact'],
        'created_at': ['gte', 'lte']
    }
    ordering_fields = ['created_at']

    def get_serializer_class(self):
        if self.action == 'create':
            return MouvementStockCreateSerializer
        return MouvementStockSerializer

    def perform_create(self, serializer):
        produit = serializer.validated_data['produit']
        quantite = serializer.validated_data['quantite']
        type_mouvement = serializer.validated_data['type_mouvement']

        stock_avant = produit.stock_actuel
        if type_mouvement == 'entree':
            stock_apres = stock_avant + quantite
        elif type_mouvement == 'sortie':
            stock_apres = stock_avant - quantite
        else:
            stock_apres = quantite  # ajustement = set to value

        # Update product stock
        Produit.objects.filter(pk=produit.pk).update(stock_actuel=stock_apres)

        serializer.save(
            stock_avant=stock_avant,
            stock_apres=stock_apres,
            cree_par=self.request.user
        )
