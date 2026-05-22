from django.contrib import admin
from .models import Vente, LigneVente

class LigneVenteInline(admin.TabularInline):
    model = LigneVente
    extra = 0

@admin.register(Vente)
class VenteAdmin(admin.ModelAdmin):
    list_display = ['reference', 'client', 'type_vente', 'statut', 'montant_total', 'etat_paiement', 'date']
    search_fields = ['reference', 'client__nom']
    list_filter = ['statut', 'type_vente', 'mode_paiement']
    readonly_fields = ['etat_paiement']
    inlines = [LigneVenteInline]

    def etat_paiement(self, obj):
        if not obj.montant_paye or obj.montant_paye <= 0:
            return "Non payé"
        elif obj.montant_paye < obj.montant_total:
            return "Versé"
        else:
            return "Payé"
    etat_paiement.short_description = "État Paiement"
