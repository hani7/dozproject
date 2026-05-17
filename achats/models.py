from django.db import models
from django.conf import settings
from fournisseurs.models import Fournisseur
from products.models import Produit


class BonAchat(models.Model):
    STATUS_CHOICES = [
        ('brouillon', 'Brouillon'),
        ('confirme', 'Confirmé'),
        ('recu', 'Reçu'),
        ('annule', 'Annulé'),
    ]
    PAIEMENT_CHOICES = [
        ('especes', 'Espèces'),
        ('virement', 'Virement'),
        ('cheque', 'Chèque'),
        ('credit', 'Crédit'),
    ]
    reference = models.CharField(max_length=50, unique=True)
    fournisseur = models.ForeignKey(Fournisseur, on_delete=models.PROTECT, related_name='achats')
    date = models.DateField()
    date_livraison = models.DateField(null=True, blank=True)
    statut = models.CharField(max_length=20, choices=STATUS_CHOICES, default='brouillon')
    mode_paiement = models.CharField(max_length=20, choices=PAIEMENT_CHOICES, default='especes')
    montant_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    montant_paye = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    cree_par = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"BA-{self.reference} / {self.fournisseur.nom}"

    @property
    def reste_a_payer(self):
        return self.montant_total - self.montant_paye


class LigneAchat(models.Model):
    bon_achat = models.ForeignKey(BonAchat, on_delete=models.CASCADE, related_name='lignes')
    produit = models.ForeignKey(Produit, on_delete=models.PROTECT)
    quantite = models.DecimalField(max_digits=10, decimal_places=2)
    prix_unitaire = models.DecimalField(max_digits=10, decimal_places=2)
    sous_total = models.DecimalField(max_digits=12, decimal_places=2)

    def save(self, *args, **kwargs):
        self.sous_total = self.quantite * self.prix_unitaire
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.produit.nom} x{self.quantite}"
