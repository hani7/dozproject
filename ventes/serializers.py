from rest_framework import serializers
from .models import Vente, LigneVente


# ── Read serializer (for responses) ────────────────────────────
class LigneVenteSerializer(serializers.ModelSerializer):
    produit_nom = serializers.CharField(source='produit.nom', read_only=True)

    class Meta:
        model = LigneVente
        fields = '__all__'
        read_only_fields = ['sous_total']


class VenteSerializer(serializers.ModelSerializer):
    lignes         = LigneVenteSerializer(many=True, read_only=True)
    client_nom     = serializers.CharField(source='client.nom', read_only=True)
    cree_par_nom   = serializers.CharField(source='cree_par.get_full_name', read_only=True)
    reste_a_payer  = serializers.ReadOnlyField()

    class Meta:
        model = Vente
        fields = '__all__'


# ── Input serializer for ligne items (write) ────────────────────
class LigneVenteInputSerializer(serializers.ModelSerializer):
    class Meta:
        model = LigneVente
        fields = ['produit', 'quantite', 'prix_unitaire']


# ── Create/Update serializer — explicit safe field list ─────────
class VenteCreateSerializer(serializers.ModelSerializer):
    lignes = LigneVenteInputSerializer(many=True)

    class Meta:
        model = Vente
        # Explicit field list — cree_par and livreur are excluded from client input.
        # cree_par is set automatically in perform_create (view layer).
        # livreur can be assigned via a separate admin action if needed.
        fields = [
            'reference', 'type_vente', 'client', 'date',
            'statut', 'mode_paiement', 'montant_paye', 'remise',
            'notes', 'lignes',
        ]

    def create(self, validated_data):
        lignes_data = validated_data.pop('lignes')
        vente = Vente.objects.create(**validated_data)
        total = 0
        for ligne_data in lignes_data:
            ligne = LigneVente.objects.create(vente=vente, **ligne_data)
            total += ligne.sous_total
        # Apply percentage discount
        remise = vente.remise / 100
        vente.montant_total = total * (1 - remise)
        vente.save()
        return vente
