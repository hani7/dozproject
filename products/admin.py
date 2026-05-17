from django.contrib import admin
from .models import Produit

@admin.register(Produit)
class ProduitAdmin(admin.ModelAdmin):
    list_display = ['nom', 'code', 'prix_achat', 'prix_detail', 'prix_gros', 'stock_actuel']
    search_fields = ['nom', 'code']
