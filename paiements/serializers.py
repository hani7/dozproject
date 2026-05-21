from rest_framework import serializers
from .models import Paiement, Virement, PaiementPlan, VersementPlan


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


# ── Plan de paiement échelonné ────────────────────────────────────
class VersementPlanSerializer(serializers.ModelSerializer):
    cree_par_nom = serializers.SerializerMethodField()

    class Meta:
        model = VersementPlan
        fields = [
            'id', 'plan', 'montant', 'date', 'mode',
            'notes', 'cree_par', 'cree_par_nom', 'created_at',
        ]
        read_only_fields = ['cree_par', 'created_at']

    def get_cree_par_nom(self, obj):
        return obj.cree_par.get_full_name() if obj.cree_par else ''


class PaiementPlanSerializer(serializers.ModelSerializer):
    versements     = VersementPlanSerializer(many=True, read_only=True)
    montant_paye   = serializers.SerializerMethodField()
    montant_restant = serializers.SerializerMethodField()
    pct_paye       = serializers.SerializerMethodField()
    cree_par_nom   = serializers.SerializerMethodField()

    class Meta:
        model = PaiementPlan
        fields = [
            'id', 'reference', 'type_plan', 'client_nom', 'fournisseur_nom',
            'montant_total', 'montant_paye', 'montant_restant', 'pct_paye',
            'statut', 'date_debut', 'notes',
            'cree_par', 'cree_par_nom', 'created_at',
            'versements',
        ]
        read_only_fields = ['reference', 'cree_par', 'created_at']

    def get_montant_paye(self, obj):
        return float(obj.montant_paye)

    def get_montant_restant(self, obj):
        return float(obj.montant_restant)

    def get_pct_paye(self, obj):
        return obj.pct_paye

    def get_cree_par_nom(self, obj):
        return obj.cree_par.get_full_name() if obj.cree_par else ''
