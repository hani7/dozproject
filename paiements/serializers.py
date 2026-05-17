from rest_framework import serializers
from .models import Paiement, Virement


class PaiementSerializer(serializers.ModelSerializer):
    cree_par_nom = serializers.SerializerMethodField()

    class Meta:
        model = Paiement
        fields = [
            'id', 'reference', 'type_paiement', 'mode', 'montant', 'statut',
            'vente_ref', 'achat_ref', 'client_nom', 'fournisseur_nom',
            'date', 'notes', 'cree_par', 'cree_par_nom', 'created_at',
        ]
        read_only_fields = ['cree_par', 'created_at']

    def get_cree_par_nom(self, obj):
        return obj.cree_par.get_full_name() if obj.cree_par else ''


class VirementSerializer(serializers.ModelSerializer):
    employe_nom = serializers.SerializerMethodField()

    class Meta:
        model = Virement
        fields = [
            'id', 'employe', 'employe_nom', 'montant', 'date',
            'reference_bancaire', 'banque', 'motif', 'statut',
            'notes', 'cree_par', 'created_at',
        ]
        read_only_fields = ['cree_par', 'created_at']

    def get_employe_nom(self, obj):
        return f"{obj.employe.prenom} {obj.employe.nom}" if obj.employe else ''

