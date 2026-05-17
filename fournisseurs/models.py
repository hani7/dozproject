from django.db import models


class Fournisseur(models.Model):
    nom = models.CharField(max_length=200)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    adresse = models.TextField(blank=True)
    wilaya = models.CharField(max_length=100, blank=True)
    contact_nom = models.CharField(max_length=100, blank=True)
    # Algerian business registration
    rc = models.CharField(max_length=50, blank=True, verbose_name='RC (Registre de commerce)')
    nif = models.CharField(max_length=50, blank=True, verbose_name='NIF')
    n_article = models.CharField(max_length=50, blank=True, verbose_name="N° Article")
    nis = models.CharField(max_length=50, blank=True, verbose_name="NIS (N° d'Identification Statistique)")
    solde = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['nom']

    def __str__(self):
        return self.nom
