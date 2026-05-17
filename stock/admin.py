from django.contrib import admin
from .models import MouvementStock

@admin.register(MouvementStock)
class MouvementStockAdmin(admin.ModelAdmin):
    list_display = ['produit', 'type_mouvement', 'motif', 'quantite', 'stock_avant', 'stock_apres', 'created_at']
    search_fields = ['produit__nom', 'reference']
    list_filter = ['type_mouvement', 'motif']
