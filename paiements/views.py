from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Paiement, Virement
from .serializers import PaiementSerializer, VirementSerializer


class PaiementViewSet(viewsets.ModelViewSet):
    # Add select_related for cree_par to avoid N+1 in list view
    queryset = Paiement.objects.select_related('cree_par').all()
    serializer_class = PaiementSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = {
        'type_paiement': ['exact'],
        'mode':          ['exact'],
        'statut':        ['exact'],
        'date':          ['gte', 'lte', 'exact'],
        'created_at':    ['gte', 'lte'],
    }
    ordering_fields = ['date', 'created_at']

    def perform_create(self, serializer):
        serializer.save(cree_par=self.request.user)


class VirementViewSet(viewsets.ModelViewSet):
    queryset = Virement.objects.select_related('employe', 'cree_par').all()
    serializer_class = VirementSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = {
        'employe': ['exact'],
        'statut':  ['exact'],
        'date':    ['gte', 'lte', 'exact'],
        'created_at': ['gte', 'lte'],
    }
    ordering_fields = ['date', 'created_at']

    def perform_create(self, serializer):
        serializer.save(cree_par=self.request.user)
