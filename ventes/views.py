from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from .models import Vente, LigneVente
from .serializers import VenteSerializer, VenteCreateSerializer
from stock.models import MouvementStock
from products.models import Produit


class VenteViewSet(viewsets.ModelViewSet):
    queryset = Vente.objects.select_related('client', 'cree_par', 'livreur').prefetch_related('lignes__produit').all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        'type_vente': ['exact'], 
        'statut': ['exact'], 
        'client': ['exact'], 
        'mode_paiement': ['exact'],
        'date': ['gte', 'lte', 'exact'],
        'created_at': ['gte', 'lte']
    }
    search_fields = ['reference', 'client__nom']
    ordering_fields = ['date', 'created_at', 'montant_total']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return VenteCreateSerializer
        return VenteSerializer

    def perform_create(self, serializer):
        with transaction.atomic():
            vente = serializer.save(cree_par=self.request.user)
            # Decrease stock for each line
            for ligne in vente.lignes.all():
                produit = ligne.produit
                stock_avant = produit.stock_actuel
                stock_apres = stock_avant - ligne.quantite
                Produit.objects.filter(pk=produit.pk).update(stock_actuel=stock_apres)
                MouvementStock.objects.create(
                    produit=produit,
                    type_mouvement='sortie',
                    motif='vente',
                    quantite=ligne.quantite,
                    stock_avant=stock_avant,
                    stock_apres=stock_apres,
                    reference=vente.reference,
                    cree_par=self.request.user,
                )

    @action(detail=True, methods=['post'])
    def retour(self, request, pk=None):
        """Process a product return: restore stock, update sale total."""
        vente = self.get_object()
        lignes_retour = request.data.get('lignes', [])
        # lignes_retour: [{produit_id, quantite_retournee}]
        if not lignes_retour:
            return Response({'error': 'Aucune ligne de retour fournie.'}, status=400)

        with transaction.atomic():
            valeur_retour_totale = 0
            for item in lignes_retour:
                qte = int(item.get('quantite', 0))
                if qte <= 0:
                    continue
                try:
                    ligne = vente.lignes.get(produit_id=item['produit_id'])
                except LigneVente.DoesNotExist:
                    return Response({'error': f"Produit {item['produit_id']} introuvable dans cette vente."}, status=400)

                if qte > ligne.quantite:
                    return Response({'error': f"Quantité retournée ({qte}) > quantité vendue ({ligne.quantite}) pour {ligne.produit.nom}."}, status=400)

                produit = ligne.produit
                stock_avant = produit.stock_actuel
                stock_apres = stock_avant + qte
                Produit.objects.filter(pk=produit.pk).update(stock_actuel=stock_apres)

                valeur_retour = qte * float(ligne.prix_unitaire)
                valeur_retour_totale += valeur_retour

                MouvementStock.objects.create(
                    produit=produit,
                    type_mouvement='entree',
                    motif='retour',
                    quantite=qte,
                    stock_avant=stock_avant,
                    stock_apres=stock_apres,
                    reference=vente.reference,
                    notes=f"Retour de {qte} carton(s) — Vente {vente.reference}",
                    cree_par=request.user,
                )

            # Deduct returned value from the vente
            nouveau_total = float(vente.montant_total) - valeur_retour_totale
            nouveau_paye = max(0, float(vente.montant_paye) - valeur_retour_totale)
            vente.montant_total = max(0, nouveau_total)
            vente.montant_paye = nouveau_paye
            vente.save()

        return Response(VenteSerializer(vente).data)
