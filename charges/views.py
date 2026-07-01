from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum
from .models import Charge
from .serializers import ChargeSerializer


class ChargeViewSet(viewsets.ModelViewSet):
    queryset = Charge.objects.select_related('cree_par').all()
    serializer_class = ChargeSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        'type_charge': ['exact'],
        'date': ['gte', 'lte', 'exact'],
    }
    search_fields = ['description', 'type_charge']
    ordering_fields = ['date', 'montant', 'created_at']

    def perform_create(self, serializer):
        serializer.save(cree_par=self.request.user)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Total par type de charge"""
        qs = self.get_queryset()
        total = qs.aggregate(total=Sum('montant'))['total'] or 0
        par_type = (
            qs.values('type_charge')
            .annotate(total=Sum('montant'))
            .order_by('-total')
        )
        return Response({
            'total_global': total,
            'par_type': list(par_type),
        })
