from rest_framework import serializers
from .models import Charge


class ChargeSerializer(serializers.ModelSerializer):
    type_charge_label = serializers.CharField(source='get_type_charge_display', read_only=True)
    cree_par_nom = serializers.SerializerMethodField()

    class Meta:
        model = Charge
        fields = [
            'id', 'type_charge', 'type_charge_label',
            'montant', 'date', 'description',
            'cree_par', 'cree_par_nom', 'created_at',
        ]
        read_only_fields = ['id', 'cree_par', 'created_at']

    def get_cree_par_nom(self, obj):
        if obj.cree_par:
            return getattr(obj.cree_par, 'full_name', obj.cree_par.username)
        return None
