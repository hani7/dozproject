from rest_framework import serializers
from .models import BonAchat, LigneAchat


# ── Read serializer (for responses) ────────────────────────────
class LigneAchatSerializer(serializers.ModelSerializer):
    produit_nom = serializers.CharField(source='produit.nom', read_only=True)

    class Meta:
        model = LigneAchat
        fields = '__all__'
        read_only_fields = ['sous_total', 'bon_achat']


# ── Input serializer (for writes — no bon_achat, no sous_total) ─
class LigneAchatInputSerializer(serializers.ModelSerializer):
    class Meta:
        model = LigneAchat
        fields = ['produit', 'quantite', 'prix_unitaire']


class BonAchatSerializer(serializers.ModelSerializer):
    lignes         = LigneAchatSerializer(many=True, read_only=True)
    fournisseur_nom = serializers.CharField(source='fournisseur.nom', read_only=True)
    reste_a_payer  = serializers.ReadOnlyField()

    class Meta:
        model = BonAchat
        fields = '__all__'
        read_only_fields = ['montant_total']


class BonAchatCreateSerializer(serializers.ModelSerializer):
    # Use the clean input serializer — avoids the silent bon_achat drop bug
    lignes = LigneAchatInputSerializer(many=True)

    class Meta:
        model = BonAchat
        fields = '__all__'
        read_only_fields = ['montant_total', 'cree_par']

    def create(self, validated_data):
        lignes_data = validated_data.pop('lignes')
        bon = BonAchat.objects.create(**validated_data)
        total = 0
        for ligne_data in lignes_data:
            ligne = LigneAchat.objects.create(bon_achat=bon, **ligne_data)
            total += ligne.sous_total
        bon.montant_total = total
        bon.save()
        return bon
