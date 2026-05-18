from django.db import models
from django.conf import settings


class Paiement(models.Model):
    TYPE_CHOICES = [
        ('vente', 'Règlement vente'),
        ('achat', 'Paiement fournisseur'),
        ('autre', 'Autre'),
    ]
    MODE_CHOICES = [
        ('especes', 'Espèces'),
        ('virement', 'Virement bancaire'),
        ('cheque', 'Chèque'),
        ('mobile', 'Mobile payment'),
    ]
    STATUS_CHOICES = [
        ('en_attente', 'En attente'),
        ('valide', 'Validé'),
        ('rejete', 'Rejeté'),
    ]
    reference       = models.CharField(max_length=100, blank=True)
    type_paiement   = models.CharField(max_length=20, choices=TYPE_CHOICES)
    mode            = models.CharField(max_length=20, choices=MODE_CHOICES)
    montant         = models.DecimalField(max_digits=12, decimal_places=2)
    statut          = models.CharField(max_length=20, choices=STATUS_CHOICES, default='valide')
    # Generic link to either a vente or achat reference
    vente_ref       = models.CharField(max_length=50, blank=True)
    achat_ref       = models.CharField(max_length=50, blank=True)
    client_nom      = models.CharField(max_length=200, blank=True)
    fournisseur_nom = models.CharField(max_length=200, blank=True)
    date            = models.DateField()
    notes           = models.TextField(blank=True)
    cree_par        = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"PAY-{self.id} / {self.montant} DA"


class Virement(models.Model):
    # Use string reference 'hr.Employe' to avoid circular import — do NOT import Employe here
    STATUS_CHOICES = [
        ('en_attente', 'En attente'),
        ('execute', 'Exécuté'),
        ('annule', 'Annulé'),
    ]
    employe           = models.ForeignKey('hr.Employe', on_delete=models.CASCADE, related_name='virements')
    montant           = models.DecimalField(max_digits=10, decimal_places=2)
    date              = models.DateField()
    reference_bancaire = models.CharField(max_length=100, blank=True)
    banque            = models.CharField(max_length=100, blank=True)
    motif             = models.CharField(max_length=200, blank=True)
    statut            = models.CharField(max_length=20, choices=STATUS_CHOICES, default='en_attente')
    notes             = models.TextField(blank=True)
    cree_par          = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"VIR-{self.id} / {self.employe} / {self.montant} DA"
