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
            return Response({'status': 'Location updated'})
        return Response({'error': 'Invalid data'}, status=400)

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def me(request):
    serializer = UserSerializer(request.user)
    return Response(serializer.data)
