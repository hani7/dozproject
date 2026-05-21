from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Paiement, Virement, PaiementPlan, VersementPlan
from .serializers import PaiementSerializer, VirementSerializer, PaiementPlanSerializer, VersementPlanSerializer


class PaiementViewSet(viewsets.ModelViewSet):
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


class PaiementPlanViewSet(viewsets.ModelViewSet):
    queryset = PaiementPlan.objects.prefetch_related('versements').select_related('cree_par').all()
    serializer_class = PaiementPlanSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_fields = {
        'statut':    ['exact'],
        'type_plan': ['exact'],
        'date_debut': ['gte', 'lte'],
    }
    search_fields = ['client_nom', 'fournisseur_nom', 'reference']
    ordering_fields = ['date_debut', 'created_at', 'montant_total']

    def perform_create(self, serializer):
        serializer.save(cree_par=self.request.user)


class VersementPlanViewSet(viewsets.ModelViewSet):
    queryset = VersementPlan.objects.select_related('plan', 'cree_par').all()
    serializer_class = VersementPlanSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = {
        'plan':   ['exact'],
        'mode':   ['exact'],
        'date':   ['gte', 'lte', 'exact'],
    }
    ordering_fields = ['date', 'created_at']

    def perform_create(self, serializer):
        serializer.save(cree_par=self.request.user)
