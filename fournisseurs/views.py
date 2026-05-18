from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Fournisseur
from .serializers import FournisseurSerializer


class FournisseurViewSet(viewsets.ModelViewSet):
    queryset = Fournisseur.objects.all()
    serializer_class = FournisseurSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = []
    search_fields = ['nom', 'phone', 'contact_nom']
    ordering_fields = ['nom', 'created_at']
