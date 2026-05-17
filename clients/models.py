from django.db import models


class Client(models.Model):
    TYPE_CHOICES = [
        ('detail', 'Détaillant'),
        ('gros', 'Grossiste'),
    ]
    nom = models.CharField(max_length=200)
    type_client = models.CharField(max_length=10, choices=TYPE_CHOICES, default='detail')
    phone = models.CharField(max_length=20, blank=True)
    adresse = models.TextField(blank=True)
    wilaya = models.CharField(max_length=100, blank=True)
    email = models.EmailField(blank=True)
    # Algerian business registration
    rc = models.CharField(max_length=50, blank=True, verbose_name='RC (Registre de commerce)')
    nif = models.CharField(max_length=50, blank=True, verbose_name='NIF')
    n_article = models.CharField(max_length=50, blank=True, verbose_name="N° Article")
    nis = models.CharField(max_length=50, blank=True, verbose_name="NIS (N° d'Identification Statistique)")
    solde = models.DecimalField(max_digits=12, decimal_places=2, default=0)  # balance (can be negative = debt)
    notes = models.TextField(blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['nom']

    def __str__(self):
        return f"{self.nom} ({self.get_type_client_display()})"
