from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EmployeViewSet, PresenceViewSet, PaieViewSet

router = DefaultRouter()
router.register('employes', EmployeViewSet)
router.register('presences', PresenceViewSet)
router.register('paies', PaieViewSet)

urlpatterns = [path('', include(router.urls))]
