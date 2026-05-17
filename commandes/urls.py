from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CommandeViewSet

router = DefaultRouter()
router.register('', CommandeViewSet)

urlpatterns = [path('', include(router.urls))]
