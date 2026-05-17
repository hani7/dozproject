from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Client
from .serializers import ClientSerializer


class ClientViewSet(viewsets.ModelViewSet):
    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['type_client', 'wilaya']
    search_fields = ['nom', 'phone', 'wilaya']
    ordering_fields = ['nom', 'created_at', 'solde']
