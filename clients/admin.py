from django.contrib import admin
from .models import Client

@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ['nom', 'type_client', 'phone', 'solde']
    search_fields = ['nom', 'code_client', 'telephone']
    list_filter = ['type_client']
