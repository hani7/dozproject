from django.db import models
from django.conf import settings


class Charge(models.Model):
    TYPE_CHOICES = [
        ('carburant', 'Carburant'),
        ('vidange', 'Vidange'),
        ('reparation', 'Réparation'),
        ('pneumatique', 'Pneumatique (Pneu)'),
        ('lavage', 'Lavage'),
        ('vignette', 'Vignette'),
        ('assurance', 'Assurance'),
        ('amende', 'Amende'),
        ('salaire_chauffeur', 'Salaire chauffeur'),
        ('peage', 'Péage'),
        ('autre', 'Autre'),
    ]

    type_charge = models.CharField(max_length=50, choices=TYPE_CHOICES)
    montant = models.DecimalField(max_digits=12, decimal_places=2)
    date = models.DateField()
    camion = models.CharField(max_length=100, blank=True, help_text='Immatriculation ou nom du camion')
    description = models.TextField(blank=True)
    cree_par = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"{self.get_type_charge_display()} – {self.montant} DA – {self.date}"
