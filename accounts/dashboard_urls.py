from django.urls import path
from .dashboard_views import dashboard_stats, benefices_detail

urlpatterns = [
    path('stats/',     dashboard_stats,   name='dashboard_stats'),
    path('benefices/', benefices_detail,  name='dashboard_benefices'),
]
