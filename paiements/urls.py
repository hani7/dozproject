from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PaiementViewSet, VirementViewSet, PaiementPlanViewSet, VersementPlanViewSet

router = DefaultRouter()
router.register('paiements',      PaiementViewSet)
router.register('virements',      VirementViewSet)
router.register('plans',          PaiementPlanViewSet)
router.register('versements-plan', VersementPlanViewSet)

urlpatterns = [path('', include(router.urls))]
