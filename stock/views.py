import django_filters
from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import MouvementStock
from .serializers import MouvementStockSerializer, MouvementStockCreateSerializer
from products.models import Produit


class MouvementStockFilter(django_filters.FilterSet):
    date_from = django_filters.DateFilter(field_name='created_at__date', lookup_expr='gte')
    date_to   = django_filters.DateFilter(field_name='created_at__date', lookup_expr='lte')
    # Also keep the original datetime filters for compatibility
    created_at__gte = django_filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    created_at__lte = django_filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')
    # Support created_at__date__gte / created_at__date__lte from frontend
    created_at__date__gte = django_filters.DateFilter(field_name='created_at__date', lookup_expr='gte')
    created_at__date__lte = django_filters.DateFilter(field_name='created_at__date', lookup_expr='lte')

    class Meta:
        model = MouvementStock
        fields = ['produit', 'type_mouvement', 'motif', 'reference']


class MouvementStockViewSet(viewsets.ModelViewSet):
    queryset = MouvementStock.objects.select_related('produit', 'cree_par').all()
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_class = MouvementStockFilter
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
