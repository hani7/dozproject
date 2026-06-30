import json
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
        fields = ['produit', 'quantite', 'quantite_offerte', 'prix_unitaire']


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

    def to_internal_value(self, data):
        # If data is a QueryDict (from multipart form data) or standard dict,
        # it might contain 'lignes' as a JSON-serialized string.
        if isinstance(data, dict) or hasattr(data, 'getlist'):
            # Create a mutable copy if it's a QueryDict
            if hasattr(data, 'copy'):
                data = data.copy()
            
            lignes_data = data.get('lignes')
            if isinstance(lignes_data, str):
                try:
                    data['lignes'] = json.loads(lignes_data)
                except (json.JSONDecodeError, TypeError):
                    pass
        return super().to_internal_value(data)

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

    def update(self, instance, validated_data):
        lignes_data = validated_data.pop('lignes', None)
        
        # Update the BonAchat instance fields (e.g. reference, date, mode_paiement, notes, facture_pdf)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # If lines are provided in the update, replace them
        if lignes_data is not None:
            instance.lignes.all().delete()
            total = 0
            for ligne_data in lignes_data:
                ligne = LigneAchat.objects.create(bon_achat=instance, **ligne_data)
                total += ligne.sous_total
            instance.montant_total = total
            instance.save()
            
        return instance
