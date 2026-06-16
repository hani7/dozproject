from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from django.db.models import F

from .models import RetourClient, LigneRetour
from .serializers import RetourClientSerializer, RetourClientCreateSerializer
from stock.models import MouvementStock
from products.models import Produit


class RetourClientViewSet(viewsets.ModelViewSet):
    """
    CRUD complet sur les retours clients.

    Actions supplémentaires :
      POST /retours/{id}/valider/  → Valide le retour et remet le stock
      POST /retours/{id}/refuser/  → Passe le retour en statut refusé
    """

    queryset = RetourClient.objects.select_related(
        'client', 'vente_origine', 'cree_par'
    ).prefetch_related('lignes__produit').all()

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = {
        'client':             ['exact'],
        'vente_origine':      ['exact'],
        'statut':             ['exact'],
        'mode_remboursement': ['exact'],
        'date':               ['gte', 'lte', 'exact'],
        'created_at':         ['gte', 'lte'],
    }
    search_fields  = ['reference', 'client__nom', 'vente_origine__reference']
    ordering_fields = ['date', 'created_at', 'montant_total']

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return RetourClientCreateSerializer
        return RetourClientSerializer

    def perform_create(self, serializer):
        serializer.save(cree_par=self.request.user)

    # ─────────────────────────────────────────────────────────────────────────
    # Action : valider
    # ─────────────────────────────────────────────────────────────────────────
    @action(detail=True, methods=['post'])
    def valider(self, request, pk=None):
        """
        Valide le retour et remet les quantités en stock.

        Pour chaque LigneRetour :
          - Si unite_retour == 'bouteille' → quantite_en_cartons = quantite / bouteilles_par_carton
          - Si unite_retour == 'carton'    → quantite_en_cartons = quantite
          - stock_actuel += quantite_en_cartons
          - MouvementStock créé pour la traçabilité
        """
        retour = self.get_object()

        if retour.statut == 'valide':
            return Response({'error': 'Ce retour est déjà validé.'}, status=400)

        if retour.statut == 'refuse':
            return Response({'error': 'Ce retour a été refusé, impossible de le valider.'}, status=400)

        with transaction.atomic():
            for ligne in retour.lignes.select_related('produit').all():
                qte_cartons = ligne.quantite_en_cartons  # déjà calculé dans save()

                # Remise en stock (race-condition safe)
                Produit.objects.filter(pk=ligne.produit_id).update(
                    stock_actuel=F('stock_actuel') + qte_cartons
                )
                produit = Produit.objects.only('stock_actuel').get(pk=ligne.produit_id)

                # Description lisible selon l'unité
                if ligne.unite_retour == 'bouteille':
                    detail_unite = (
                        f"{ligne.quantite} bouteille(s) "
                        f"= {qte_cartons} carton(s)"
                    )
                else:
                    detail_unite = f"{qte_cartons} carton(s)"

                MouvementStock.objects.create(
                    produit_id=ligne.produit_id,
                    type_mouvement='entree',
                    motif='retour',
                    quantite=qte_cartons,
                    stock_avant=produit.stock_actuel - qte_cartons,
                    stock_apres=produit.stock_actuel,
                    reference=retour.reference,
                    notes=(
                        f"Retour client validé — {detail_unite} "
                        f"— Ref: {retour.reference}"
                        + (f" (Vente: {retour.vente_origine.reference})" if retour.vente_origine else "")
                    ),
                    cree_par=request.user,
                )

            retour.statut = 'valide'
            retour.save(update_fields=['statut', 'updated_at'])

        return Response(RetourClientSerializer(retour).data)

    # ─────────────────────────────────────────────────────────────────────────
    # Action : refuser
    # ─────────────────────────────────────────────────────────────────────────
    @action(detail=True, methods=['post'])
    def refuser(self, request, pk=None):
        """Marque le retour comme refusé. Aucun mouvement de stock n'est effectué."""
        retour = self.get_object()

        if retour.statut == 'valide':
            return Response({'error': 'Ce retour est déjà validé, impossible de le refuser.'}, status=400)

        retour.statut = 'refuse'
        retour.notes = (retour.notes or '') + f"\n[Refusé par {request.user}]"
        retour.save(update_fields=['statut', 'notes', 'updated_at'])

        return Response(RetourClientSerializer(retour).data)
