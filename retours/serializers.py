from rest_framework import serializers
from .models import RetourClient, LigneRetour
from products.models import Produit


class LigneRetourSerializer(serializers.ModelSerializer):
    produit_nom = serializers.CharField(source='produit.nom', read_only=True)
    produit_code = serializers.CharField(source='produit.code', read_only=True)
    bouteilles_par_carton = serializers.IntegerField(source='produit.bouteilles_par_carton', read_only=True)
    unite_retour_label = serializers.CharField(source='get_unite_retour_display', read_only=True)

    class Meta:
        model = LigneRetour
        fields = [
            'id',
            'produit', 'produit_nom', 'produit_code',
            'bouteilles_par_carton',
            'unite_retour', 'unite_retour_label',
            'quantite', 'quantite_en_cartons',
            'prix_unitaire', 'sous_total',
        ]
        read_only_fields = ['quantite_en_cartons', 'sous_total']

    def validate(self, data):
        produit = data.get('produit')
        unite = data.get('unite_retour', 'carton')
        quantite = data.get('quantite', 0)

        if quantite <= 0:
            raise serializers.ValidationError("La quantité doit être positive.")

        if unite == 'bouteille':
            bpc = produit.bouteilles_par_carton if produit else 1
            if bpc <= 0:
                raise serializers.ValidationError(
                    f"Le produit '{produit.nom}' n'a pas de bouteilles_par_carton défini (valeur = {bpc})."
                )
        return data


class RetourClientSerializer(serializers.ModelSerializer):
    lignes = LigneRetourSerializer(many=True, read_only=True)
    client_nom = serializers.CharField(source='client.nom', read_only=True)
    vente_reference = serializers.CharField(source='vente_origine.reference', read_only=True, default=None)
    statut_label = serializers.CharField(source='get_statut_display', read_only=True)
    mode_remboursement_label = serializers.CharField(source='get_mode_remboursement_display', read_only=True)
    cree_par_nom = serializers.SerializerMethodField()

    class Meta:
        model = RetourClient
        fields = [
            'id', 'reference',
            'client', 'client_nom',
            'vente_origine', 'vente_reference',
            'date', 'statut', 'statut_label',
            'motif', 'mode_remboursement', 'mode_remboursement_label',
            'montant_total',
            'cree_par', 'cree_par_nom',
            'notes',
            'lignes',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['reference', 'montant_total', 'created_at', 'updated_at']

    def get_cree_par_nom(self, obj):
        if obj.cree_par:
            return obj.cree_par.get_full_name() or obj.cree_par.username
        return None


class RetourClientCreateSerializer(serializers.ModelSerializer):
    """Serializer pour la création/modification d'un retour (avec lignes en écriture)."""

    lignes = LigneRetourSerializer(many=True)

    class Meta:
        model = RetourClient
        fields = [
            'id', 'reference',
            'client', 'vente_origine',
            'date', 'statut',
            'motif', 'mode_remboursement',
            'notes',
            'lignes',
        ]
        read_only_fields = ['reference']

    def create(self, validated_data):
        from decimal import Decimal
        lignes_data = validated_data.pop('lignes')

        retour = RetourClient.objects.create(**validated_data)

        montant_total = Decimal('0')
        for ligne_data in lignes_data:
            ligne = LigneRetour(retour=retour, **ligne_data)
            ligne.save()  # save() recalcule quantite_en_cartons et sous_total
            montant_total += ligne.sous_total

        retour.montant_total = montant_total
        retour.save(update_fields=['montant_total'])

        return retour

    def update(self, instance, validated_data):
        from decimal import Decimal
        lignes_data = validated_data.pop('lignes', None)

        # Mise à jour des champs de l'en-tête
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if lignes_data is not None:
            # Remplacer toutes les lignes existantes
            instance.lignes.all().delete()
            montant_total = Decimal('0')
            for ligne_data in lignes_data:
                ligne = LigneRetour(retour=instance, **ligne_data)
                ligne.save()
                montant_total += ligne.sous_total
            instance.montant_total = montant_total
            instance.save(update_fields=['montant_total'])

        return instance
