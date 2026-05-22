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
        # Allow any authenticated user to list/retrieve (for livreur picker, etc.)
        # Also allow them to update their own location
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
        try:
            call_command('makemigrations', 'accounts', interactive=False)
            call_command('migrate', 'accounts', interactive=False)
            return Response({"status": "Migrated successfully"})
        except Exception as e:
            return Response({"error": str(e)})

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
