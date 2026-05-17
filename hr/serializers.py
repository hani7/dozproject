from rest_framework import serializers
from .models import Employe, Presence, Paie


class EmployeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employe
        fields = '__all__'


class PresenceSerializer(serializers.ModelSerializer):
    employe_nom = serializers.SerializerMethodField()

    class Meta:
        model = Presence
        fields = '__all__'

    def get_employe_nom(self, obj):
        return str(obj.employe)


class PaieSerializer(serializers.ModelSerializer):
    employe_nom = serializers.CharField(source='employe.__str__', read_only=True)

    class Meta:
        model = Paie
        fields = '__all__'
        read_only_fields = ['net_a_payer']
