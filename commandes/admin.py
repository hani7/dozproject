from django.contrib import admin
from .models import Commande, LigneCommande

class LigneCommandeInline(admin.TabularInline):
    model = LigneCommande
    extra = 0

@admin.register(Commande)
class CommandeAdmin(admin.ModelAdmin):
    list_display = ['reference', 'client', 'type_commande', 'statut', 'montant_total', 'created_at']
    search_fields = ['reference', 'client__nom']
    list_filter = ['statut', 'type_commande']
    inlines = [LigneCommandeInline]
