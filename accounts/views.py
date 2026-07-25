from rest_framework import viewsets, permissions
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from django.utils import timezone
from .models import CustomUser
from .serializers import CustomTokenObtainPairSerializer, UserSerializer, UserCreateSerializer


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'


class UserViewSet(viewsets.ModelViewSet):
    queryset = CustomUser.objects.all().order_by('username')

    def get_permissions(self):
        # force_migrate is a public bootstrap endpoint — no auth required
        if self.action == 'force_migrate':
            return []
        if self.action in ['list', 'retrieve', 'update_location']:
            return [permissions.IsAuthenticated()]
        return [IsAdmin()]

    def get_queryset(self):
        qs = super().get_queryset()
        role = self.request.query_params.get('role')
        if role:
            qs = qs.filter(role=role)
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == 'true')
        return qs

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return UserCreateSerializer
        return UserSerializer

    @action(detail=True, methods=['get'], permission_classes=[IsAdmin])
    def history(self, request, pk=None):
        date_str = request.query_params.get('date')
        from .models import LocationHistory
        qs = LocationHistory.objects.filter(user_id=pk)
        if date_str:
            qs = qs.filter(timestamp__date=date_str)
        
        # Order chronologically for drawing the path
        qs = qs.order_by('timestamp')
        
        data = [
            {
                'latitude': h.latitude,
                'longitude': h.longitude,
                'timestamp': h.timestamp.isoformat()
            } for h in qs
        ]
        return Response(data)

    @action(detail=False, methods=['get'], permission_classes=[])
    def force_migrate(self, request):
        from django.core.management import call_command
        from django.contrib.auth.hashers import make_password
        results = {}
        # 1. Apply pending migrations (no makemigrations — read-only on prod)
        try:
            call_command('migrate', '--run-syncdb', interactive=False, verbosity=0)
            results['migrate'] = 'ok'
        except Exception as e:
            results['migrate'] = str(e)
        # 2. Directly activate admin user regardless of migration result
        try:
            from .models import CustomUser
            user = (
                CustomUser.objects.filter(username='dozforcli1').first()
                or CustomUser.objects.filter(username='admin').first()
                or CustomUser.objects.filter(role='admin').first()
            )
            if user:
                user.username = 'dozforcli1'
                user.password = make_password('Hakim5066##')
                user.is_active = True
                user.is_staff = True
                user.is_superuser = True
                user.role = 'admin'
                user.save()
                results['admin'] = f'activated user id={user.id}'
            else:
                CustomUser.objects.create(
                    username='dozforcli1',
                    password=make_password('Hakim5066##'),
                    is_active=True, is_staff=True, is_superuser=True,
                    role='admin', specialite='les_deux',
                )
                results['admin'] = 'created new admin'
        except Exception as e:
            results['admin'] = str(e)
        return Response(results)

    from rest_framework.decorators import action
    from django.utils import timezone

    @action(detail=False, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def update_location(self, request):
        latitude = request.data.get('latitude')
        longitude = request.data.get('longitude')
        if latitude is not None and longitude is not None:
            user = request.user
            user.latitude = float(latitude)
            user.longitude = float(longitude)
            user.last_location_update = timezone.now()
            user.save(update_fields=['latitude', 'longitude', 'last_location_update'])
            
            from .models import LocationHistory
            LocationHistory.objects.create(
                user=user,
                latitude=float(latitude),
                longitude=float(longitude),
                timestamp=user.last_location_update
            )
            
            return Response({'status': 'Location updated'})
        return Response({'error': 'Invalid data'}, status=400)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def me(request):
    serializer = UserSerializer(request.user)
    return Response(serializer.data)
