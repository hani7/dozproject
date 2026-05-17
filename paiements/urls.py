from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PaiementViewSet, VirementViewSet

router = DefaultRouter()
router.register('paiements', PaiementViewSet)
router.register('virements', VirementViewSet)

urlpatterns = [path('', include(router.urls))]
