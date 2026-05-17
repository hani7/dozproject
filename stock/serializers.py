from rest_framework import serializers
from .models import MouvementStock
from products.serializers import ProduitListSerializer


class MouvementStockSerializer(serializers.ModelSerializer):
    produit_nom = serializers.CharField(source='produit.nom', read_only=True)
    cree_par_nom = serializers.CharField(source='cree_par.get_full_name', read_only=True)

    class Meta:
        model = MouvementStock
        fields = '__all__'
        read_only_fields = ['stock_avant', 'stock_apres', 'cree_par']


class MouvementStockCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = MouvementStock
        fields = ['produit', 'type_mouvement', 'motif', 'quantite', 'reference', 'notes']
