from django.contrib import admin
from .models import Fournisseur

@admin.register(Fournisseur)
class FournisseurAdmin(admin.ModelAdmin):
    list_display = ['nom', 'phone', 'email', 'solde']
    search_fields = ['nom', 'code_fournisseur', 'telephone']
    list_filter = []
