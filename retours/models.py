from django.db import models
from django.conf import settings
from django.db.models import F
import uuid

from clients.models import Client
from products.models import Produit
from ventes.models import Vente


class RetourClient(models.Model):
    """En-tête d'un retour client. Peut être lié à une vente existante ou créé librement."""

    STATUT_CHOICES = [
        ('en_attente', 'En attente'),
        ('valide',     'Validé'),
        ('refuse',     'Refusé'),
    ]
    REMBOURSEMENT_CHOICES = [
        ('avoir',         'Avoir (crédit client)'),
        ('remboursement', 'Remboursement cash'),
        ('echange',       'Échange de produit'),
    ]

    reference           = models.CharField(max_length=50, unique=True, blank=True)
    client              = models.ForeignKey(Client, on_delete=models.PROTECT, related_name='retours')
    # La vente d'origine est optionnelle : un retour peut être enregistré sans vente liée
    vente_origine       = models.ForeignKey(
        Vente, on_delete=models.SET_NULL, null=True, blank=True, related_name='retours'
    )
    date                = models.DateField()
    statut              = models.CharField(max_length=15, choices=STATUT_CHOICES, default='en_attente', db_index=True)
    motif               = models.TextField(blank=True, help_text="Raison du retour")
    mode_remboursement  = models.CharField(max_length=15, choices=REMBOURSEMENT_CHOICES, default='avoir')
    montant_total       = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    cree_par            = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='retours_crees'
    )
    notes               = models.TextField(blank=True)
    created_at          = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at          = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Retour Client'
        verbose_name_plural = 'Retours Clients'

    def save(self, *args, **kwargs):
        if not self.reference:
            self.reference = f"RET-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.reference} / {self.client.nom}"

    @property
    def reste_a_rembourser(self):
        return float(self.montant_total)


class LigneRetour(models.Model):
    """
    Une ligne de retour pour un produit donné.

    L'agent choisit l'unité : 'carton' ou 'bouteille'.
    Le champ `quantite_en_cartons` est calculé automatiquement lors du save()
    et sert à la mise à jour du stock (toujours en cartons).
    """

    UNITE_CHOICES = [
        ('carton',    'Carton(s)'),
        ('bouteille', 'Bouteille(s) / Unité(s)'),
    ]

    retour          = models.ForeignKey(RetourClient, on_delete=models.CASCADE, related_name='lignes')
    produit         = models.ForeignKey(Produit, on_delete=models.PROTECT)

    # Unité choisie par l'agent au moment du retour
    unite_retour    = models.CharField(max_length=10, choices=UNITE_CHOICES, default='carton')

    # Quantité exprimée dans l'unité choisie (cartons OU bouteilles)
    quantite        = models.DecimalField(max_digits=10, decimal_places=2)

    # Toujours en cartons — calculé automatiquement dans save()
    quantite_en_cartons = models.DecimalField(max_digits=10, decimal_places=4, default=0)

    # Prix par unité choisie (carton ou bouteille)
    prix_unitaire   = models.DecimalField(max_digits=10, decimal_places=2)

    # Sous-total = quantite * prix_unitaire
    sous_total      = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    def save(self, *args, **kwargs):
        # ── Conversion vers cartons ─────────────────────────────────────────
        if self.unite_retour == 'bouteille':
            bpc = self.produit.bouteilles_par_carton or 1
            self.quantite_en_cartons = self.quantite / bpc
        else:
            self.quantite_en_cartons = self.quantite

        # ── Sous-total ──────────────────────────────────────────────────────
        self.sous_total = self.quantite * self.prix_unitaire

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.produit.nom} — {self.quantite} {self.get_unite_retour_display()}"
