from rest_framework import serializers
from .models import Commande, LigneCommande
from accounts.serializers import UserSerializer


class LigneCommandeSerializer(serializers.ModelSerializer):
    produit_nom = serializers.CharField(source='produit.nom', read_only=True)

    class Meta:
        model = LigneCommande
        fields = ['id', 'produit', 'produit_nom', 'quantite', 'prix_unitaire', 'sous_total']
        read_only_fields = ['sous_total']


class LigneCommandeInputSerializer(serializers.ModelSerializer):
    """Used only for writing — excludes commande (set automatically)"""
    class Meta:
        model = LigneCommande
        fields = ['produit', 'quantite', 'prix_unitaire']


class CommandeSerializer(serializers.ModelSerializer):
    lignes = LigneCommandeSerializer(many=True, read_only=True)
    client_nom = serializers.CharField(source='client.nom', read_only=True)
    client_phone = serializers.CharField(source='client.phone', read_only=True)
    client_adresse = serializers.CharField(source='client.adresse', read_only=True)
    client_latitude = serializers.DecimalField(source='client.latitude', max_digits=9, decimal_places=6, read_only=True)
    client_longitude = serializers.DecimalField(source='client.longitude', max_digits=9, decimal_places=6, read_only=True)
    prevendeur_nom = serializers.SerializerMethodField()
    livreur_nom = serializers.SerializerMethodField()

    class Meta:
        model = Commande
        fields = '__all__'

    def get_prevendeur_nom(self, obj):
        return obj.prevendeur.get_full_name() if obj.prevendeur else ''

    def get_livreur_nom(self, obj):
        return obj.livreur.get_full_name() if obj.livreur else ''


class CommandeCreateSerializer(serializers.ModelSerializer):
    lignes = LigneCommandeInputSerializer(many=True)

    class Meta:
        model = Commande
        fields = ['client', 'type_commande', 'lignes', 'notes', 'date_livraison_souhaitee']

    def create(self, validated_data):
        lignes_data = validated_data.pop('lignes')
        commande = Commande.objects.create(**validated_data)
        total = 0
        for ligne_data in lignes_data:
            ligne = LigneCommande.objects.create(commande=commande, **ligne_data)
            total += ligne.sous_total
        commande.montant_total = total
        commande.save()
        return commande
