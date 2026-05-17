from django.contrib import admin
from .models import Paiement, Virement

@admin.register(Paiement)
class PaiementAdmin(admin.ModelAdmin):
    list_display = ['reference', 'type_paiement', 'mode', 'montant', 'statut', 'date']
    search_fields = ['reference', 'client_nom', 'fournisseur_nom']
    list_filter = ['type_paiement', 'mode', 'statut']

@admin.register(Virement)
class VirementAdmin(admin.ModelAdmin):
    list_display = ['employe', 'montant', 'statut', 'date', 'reference_bancaire']
    search_fields = ['employe__user__username', 'reference_bancaire']
    list_filter = ['statut', 'banque']
