from django.db import models
from django.conf import settings
from clients.models import Client
from products.models import Produit


class Vente(models.Model):
    TYPE_CHOICES = [
        ('detail', 'Vente Détail'),
        ('gros', 'Vente Gros'),
    ]
    STATUS_CHOICES = [
        ('brouillon', 'Brouillon'),
        ('confirmee', 'Confirmée'),
        ('livree', 'Livrée'),
        ('annulee', 'Annulée'),
    ]
    PAIEMENT_CHOICES = [
        ('especes', 'Espèces'),
        ('virement', 'Virement'),
        ('cheque', 'Chèque'),
        ('credit', 'Crédit'),
    ]
    reference = models.CharField(max_length=50, unique=True)
    type_vente = models.CharField(max_length=10, choices=TYPE_CHOICES)
    client = models.ForeignKey(Client, on_delete=models.PROTECT, related_name='ventes')
    date = models.DateField()
    statut = models.CharField(max_length=20, choices=STATUS_CHOICES, default='confirmee')
    mode_paiement = models.CharField(max_length=20, choices=PAIEMENT_CHOICES, default='especes')
    montant_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    montant_paye = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    remise = models.DecimalField(max_digits=5, decimal_places=2, default=0)  # % discount
    notes = models.TextField(blank=True)
    cree_par = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='ventes_creees'
    )
    livreur = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='ventes_livrees'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"V-{self.reference} / {self.client.nom}"

    @property
    def reste_a_payer(self):
        return self.montant_total - self.montant_paye


class LigneVente(models.Model):
    vente = models.ForeignKey(Vente, on_delete=models.CASCADE, related_name='lignes')
    produit = models.ForeignKey(Produit, on_delete=models.PROTECT)
    quantite = models.DecimalField(max_digits=10, decimal_places=2)
    prix_unitaire = models.DecimalField(max_digits=10, decimal_places=2)
    sous_total = models.DecimalField(max_digits=12, decimal_places=2)

    def save(self, *args, **kwargs):
        self.sous_total = self.quantite * self.prix_unitaire
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.produit.nom} x{self.quantite}"
