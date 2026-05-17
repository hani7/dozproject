from django.db import models
from django.conf import settings
from products.models import Produit


class MouvementStock(models.Model):
    TYPE_CHOICES = [
        ('entree', 'Entrée'),
        ('sortie', 'Sortie'),
        ('ajustement', 'Ajustement'),
    ]
    MOTIF_CHOICES = [
        ('achat', 'Achat fournisseur'),
        ('vente', 'Vente client'),
        ('retour', 'Retour'),
        ('perte', 'Perte / Casse'),
        ('ajustement', 'Ajustement inventaire'),
        ('transfert', 'Transfert'),
    ]
    produit = models.ForeignKey(Produit, on_delete=models.CASCADE, related_name='mouvements')
    type_mouvement = models.CharField(max_length=20, choices=TYPE_CHOICES)
    motif = models.CharField(max_length=20, choices=MOTIF_CHOICES, default='ajustement')
    quantite = models.DecimalField(max_digits=10, decimal_places=2)
    stock_avant = models.DecimalField(max_digits=10, decimal_places=2)
    stock_apres = models.DecimalField(max_digits=10, decimal_places=2)
    reference = models.CharField(max_length=100, blank=True)  # Bon number
    notes = models.TextField(blank=True)
    cree_par = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_type_mouvement_display()} {self.quantite} x {self.produit.nom}"
