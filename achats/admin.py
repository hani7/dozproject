from django.contrib import admin
from .models import BonAchat, LigneAchat

class LigneAchatInline(admin.TabularInline):
    model = LigneAchat
    extra = 0

@admin.register(BonAchat)
class BonAchatAdmin(admin.ModelAdmin):
    list_display = ['reference', 'fournisseur', 'statut', 'montant_total', 'date']
    search_fields = ['reference', 'fournisseur__nom']
    list_filter = ['statut', 'mode_paiement']
    inlines = [LigneAchatInline]
