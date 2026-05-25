from rest_framework import serializers
from .models import MouvementStock
from products.serializers import ProduitListSerializer


class MouvementStockSerializer(serializers.ModelSerializer):
    produit_nom  = serializers.CharField(source='produit.nom', read_only=True)
    cree_par_nom = serializers.CharField(source='cree_par.get_full_name', read_only=True)
    client_nom   = serializers.SerializerMethodField()

    def get_client_nom(self, obj):
        if not obj.reference:
            return ''
        # Try Vente first, then Commande
        try:
            from ventes.models import Vente
            v = Vente.objects.select_related('client').get(reference=obj.reference)
            return v.client.nom if v.client else ''
        except Exception:
            pass
        try:
            from commandes.models import Commande
            c = Commande.objects.select_related('client').get(reference=obj.reference)
            return c.client.nom if c.client else ''
        except Exception:
            pass
        return ''

    class Meta:
        model = MouvementStock
        fields = '__all__'
        read_only_fields = ['stock_avant', 'stock_apres', 'cree_par']


class MouvementStockCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MouvementStock
        fields = ['produit', 'type_mouvement', 'motif', 'quantite', 'reference', 'notes']
