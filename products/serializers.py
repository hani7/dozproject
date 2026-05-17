from rest_framework import serializers
from .models import Produit


class ProduitSerializer(serializers.ModelSerializer):
    stock_faible = serializers.BooleanField(read_only=True)
    stock_palettes = serializers.IntegerField(read_only=True)
    stock_cartons_restants = serializers.IntegerField(read_only=True)

    class Meta:
        model = Produit
        fields = '__all__'


class ProduitListSerializer(serializers.ModelSerializer):
    stock_faible = serializers.BooleanField(read_only=True)
    stock_palettes = serializers.IntegerField(read_only=True)
    stock_cartons_restants = serializers.IntegerField(read_only=True)

    class Meta:
        model = Produit
        fields = [
            'id', 'nom', 'code', 'cartons_par_palette',
            'prix_detail', 'prix_gros', 'prix_achat',
            'stock_actuel', 'stock_minimum', 'stock_faible',
            'stock_palettes', 'stock_cartons_restants',
            'image', 'actif', 'description',
        ]
