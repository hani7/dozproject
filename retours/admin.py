from django.contrib import admin
from .models import RetourClient, LigneRetour


class LigneRetourInline(admin.TabularInline):
    model = LigneRetour
    extra = 0
    readonly_fields = ['quantite_en_cartons', 'sous_total']
    fields = ['produit', 'unite_retour', 'quantite', 'quantite_en_cartons', 'prix_unitaire', 'sous_total']


@admin.register(RetourClient)
class RetourClientAdmin(admin.ModelAdmin):
    list_display = ['reference', 'client', 'date', 'statut', 'mode_remboursement', 'montant_total', 'cree_par']
    list_filter  = ['statut', 'mode_remboursement', 'date']
    search_fields = ['reference', 'client__nom', 'vente_origine__reference']
    readonly_fields = ['reference', 'montant_total', 'created_at', 'updated_at']
    inlines = [LigneRetourInline]
