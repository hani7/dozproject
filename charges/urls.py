from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ChargeViewSet

router = DefaultRouter()
router.register(r'', ChargeViewSet, basename='charges')

urlpatterns = [
    path('', include(router.urls)),
]
