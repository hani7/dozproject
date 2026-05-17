from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BonAchatViewSet

router = DefaultRouter()
router.register('', BonAchatViewSet)

urlpatterns = [path('', include(router.urls))]
