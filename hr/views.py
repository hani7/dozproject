from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import Employe, Presence, Paie
from .serializers import EmployeSerializer, PresenceSerializer, PaieSerializer


from django.utils.text import slugify
from django.contrib.auth.hashers import make_password
from accounts.models import CustomUser

class EmployeViewSet(viewsets.ModelViewSet):
    queryset = Employe.objects.all()
    serializer_class = EmployeSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['poste', 'actif']
    search_fields = ['nom', 'prenom', 'phone']

    def perform_create(self, serializer):
        employe = serializer.save()
        
        # Auto-create user for specific roles if not already linked
        if not employe.user and employe.poste.startswith(('admin', 'prevendeur', 'livreur')):
            base_username = slugify(f"{employe.prenom}.{employe.nom}", allow_unicode=True).replace('-', '.')
            if not base_username:
                base_username = f"user_{employe.id}"
            username = base_username
            counter = 1
            while CustomUser.objects.filter(username=username).exists():
                username = f"{base_username}{counter}"
                counter += 1
            
            if employe.poste == 'admin':
                role = 'admin'
                specialite = 'les_deux'
            elif employe.poste.startswith('prevendeur'):
                role = 'prevendeur'
                specialite = 'gros' if 'gros' in employe.poste else 'detail'
            elif employe.poste.startswith('livreur'):
                role = 'livreur'
                specialite = 'gros' if 'gros' in employe.poste else 'detail'
            
            user = CustomUser.objects.create(
                username=username,
                first_name=employe.prenom,
                last_name=employe.nom,
                email=employe.email,
                phone=employe.phone,
                role=role,
                specialite=specialite,
                password=make_password('123456')  # Default password
            )
            employe.user = user
            employe.save()


class PresenceViewSet(viewsets.ModelViewSet):
    queryset = Presence.objects.select_related('employe').all()
    serializer_class = PresenceSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['employe', 'date', 'statut']
    ordering_fields = ['date']


class PaieViewSet(viewsets.ModelViewSet):
    queryset = Paie.objects.select_related('employe').all()
    serializer_class = PaieSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['employe', 'mois', 'statut']
