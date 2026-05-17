from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MouvementStockViewSet

router = DefaultRouter()
router.register('', MouvementStockViewSet)

urlpatterns = [path('', include(router.urls))]
