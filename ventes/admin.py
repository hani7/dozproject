from django.contrib import admin
from .models import Vente, LigneVente

class LigneVenteInline(admin.TabularInline):
    model = LigneVente
    extra = 0

@admin.register(Vente)
class VenteAdmin(admin.ModelAdmin):
    list_display = ['reference', 'client', 'type_vente', 'statut', 'montant_total', 'date']
    search_fields = ['reference', 'client__nom']
    list_filter = ['statut', 'type_vente', 'mode_paiement']
    inlines = [LigneVenteInline]
