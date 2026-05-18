from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from .models import Commande, LigneCommande
from .serializers import CommandeSerializer, CommandeCreateSerializer


class CommandeViewSet(viewsets.ModelViewSet):
    # Use the fully-optimized base queryset everywhere (including custom actions)
    queryset = Commande.objects.select_related(
        'client', 'prevendeur', 'livreur'
    ).prefetch_related('lignes__produit').all()

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        'statut': ['exact'],
        'type_commande': ['exact'],
        'prevendeur': ['exact'],
        'livreur': ['exact'],
        'created_at': ['gte', 'lte'],
    }
    search_fields = ['reference', 'client__nom']
    ordering_fields = ['created_at', 'montant_total']

    def get_serializer_class(self):
        if self.action == 'create':
            return CommandeCreateSerializer
        return CommandeSerializer

    def get_queryset(self):
        user = self.request.user
        qs = super().get_queryset()

        # Prévendeur: sees only their own orders
        if user.role == 'prevendeur':
            return qs.filter(prevendeur=user)

        # Livreur: sees only orders assigned to them
        if user.role == 'livreur':
            return qs.filter(livreur=user)

        return qs

    def perform_create(self, serializer):
        user = self.request.user
        type_commande = serializer.validated_data.get('type_commande')
        if user.role == 'prevendeur' and user.specialite != 'les_deux':
            if user.specialite != type_commande:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({
                    'type_commande': f'Vous êtes spécialisé en "{user.specialite}" uniquement.'
                })
        serializer.save(prevendeur=user)

    @action(detail=True, methods=['post'])
    def confirmer(self, request, pk=None):
        commande = self.get_object()
        commande.statut = 'confirmee'
        commande.confirmed_at = timezone.now()
        commande.save(update_fields=['statut', 'confirmed_at', 'updated_at'])
        return Response(CommandeSerializer(commande).data)

    @action(detail=True, methods=['post'])
    def assigner_livreur(self, request, pk=None):
        from accounts.models import CustomUser
        commande = self.get_object()
        livreur_id = request.data.get('livreur_id')
        if not livreur_id:
            return Response({'error': 'livreur_id requis'}, status=400)
        try:
            livreur = CustomUser.objects.get(pk=livreur_id, role='livreur')
        except CustomUser.DoesNotExist:
            return Response({'error': 'Livreur introuvable'}, status=400)

        if livreur.specialite != 'les_deux' and livreur.specialite != commande.type_commande:
            return Response({
                'error': f'Ce livreur est spécialisé "{livreur.specialite}" et ne peut pas livrer une commande "{commande.type_commande}".'
            }, status=400)

        commande.livreur = livreur
        commande.statut = 'en_livraison'
        commande.save(update_fields=['livreur', 'statut', 'updated_at'])
        return Response(CommandeSerializer(commande).data)

    @action(detail=True, methods=['post'])
    def livrer(self, request, pk=None):
        commande = self.get_object()
        commande.statut = 'livree'
        commande.delivered_at = timezone.now()
        commande.save(update_fields=['statut', 'delivered_at', 'updated_at'])
        return Response(CommandeSerializer(commande).data)

    @action(detail=False, methods=['get'])
    def en_attente(self, request):
        """For polling — returns pending orders using the optimized base queryset."""
        qs = self.get_queryset().filter(statut='en_attente').order_by('-created_at')
        return Response(CommandeSerializer(qs, many=True).data)
