from django.contrib import admin
from .models import Commande, LigneCommande

class LigneCommandeInline(admin.TabularInline):
    model = LigneCommande
    extra = 0

@admin.register(Commande)
class CommandeAdmin(admin.ModelAdmin):
    list_display = ['reference', 'client', 'type_commande', 'statut', 'montant_total', 'etat_paiement', 'created_at']
    search_fields = ['reference', 'client__nom']
    list_filter = ['statut', 'type_commande']
    fields = ['reference', 'type_commande', 'client', 'prevendeur', 'livreur', 'statut', 'montant_total', 'montant_paye', 'etat_paiement', 'notes', 'date_livraison_souhaitee', 'photo']
    readonly_fields = ['etat_paiement']
    inlines = [LigneCommandeInline]

    def etat_paiement(self, obj):
        if not obj.montant_paye or obj.montant_paye <= 0:
            return "Non payé"
        elif obj.montant_paye < obj.montant_total:
            return "Versé"
        else:
            return "Payé"
    etat_paiement.short_description = "État Paiement"
