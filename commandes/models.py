from django.db import models
from django.conf import settings
from clients.models import Client
from products.models import Produit


class Commande(models.Model):
    TYPE_CHOICES = [
        ('detail', 'Commande Détail'),
        ('gros', 'Commande Gros'),
    ]
    STATUS_CHOICES = [
        ('en_attente', 'En attente'),
        ('confirmee', 'Confirmée'),
        ('en_livraison', 'En livraison'),
        ('livree', 'Livrée'),
        ('annulee', 'Annulée'),
    ]
    reference = models.CharField(max_length=50, unique=True, blank=True)
    type_commande = models.CharField(max_length=10, choices=TYPE_CHOICES)
    client = models.ForeignKey(Client, on_delete=models.PROTECT, related_name='commandes')
    prevendeur = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='commandes_creees'
    )
    livreur = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='commandes_livrees'
    )
    statut = models.CharField(max_length=20, choices=STATUS_CHOICES, default='en_attente')
    montant_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    date_livraison_souhaitee = models.DateField(null=True, blank=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.reference:
            import uuid
            self.reference = f"CMD-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.reference} / {self.client.nom}"


class LigneCommande(models.Model):
    commande = models.ForeignKey(Commande, on_delete=models.CASCADE, related_name='lignes')
    produit = models.ForeignKey(Produit, on_delete=models.PROTECT)
    quantite = models.DecimalField(max_digits=10, decimal_places=2)
    prix_unitaire = models.DecimalField(max_digits=10, decimal_places=2)
    sous_total = models.DecimalField(max_digits=12, decimal_places=2)

    def save(self, *args, **kwargs):
        self.sous_total = self.quantite * self.prix_unitaire
        super().save(*args, **kwargs)
