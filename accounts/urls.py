from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import CustomTokenObtainPairView, UserViewSet, me

router = DefaultRouter()
router.register('users', UserViewSet)

urlpatterns = [
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', me, name='me'),
    path('', include(router.urls)),
]
