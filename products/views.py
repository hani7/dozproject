from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Produit
from .serializers import ProduitSerializer, ProduitListSerializer


class ProduitViewSet(viewsets.ModelViewSet):
    queryset = Produit.objects.all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['actif']
    search_fields = ['nom', 'code', 'description']
    ordering_fields = ['nom', 'prix_detail', 'prix_gros', 'stock_actuel', 'created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return ProduitListSerializer
        return ProduitSerializer

    def destroy(self, request, *args, **kwargs):
        from django.db.models import ProtectedError
        from rest_framework.response import Response
        from rest_framework import status
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {"error": "Impossible de supprimer ce produit car il est lié à des commandes, achats ou mouvements de stock. Désactivez-le plutôt."},
                status=status.HTTP_400_BAD_REQUEST
            )
