from django.urls import path
from .dashboard_views import dashboard_stats

urlpatterns = [
    path('stats/', dashboard_stats, name='dashboard_stats'),
]
