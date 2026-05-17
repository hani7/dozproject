from django.db import models
import uuid


class Produit(models.Model):
    nom = models.CharField(max_length=200)
    code = models.CharField(max_length=50, unique=True, blank=True, null=True)

    def save(self, *args, **kwargs):
        # Auto-generate code if blank
        if not self.code:
            base = self.nom[:6].upper().replace(' ', '-') if self.nom else 'PROD'
            self.code = f"{base}-{uuid.uuid4().hex[:4].upper()}"
        super().save(*args, **kwargs)
    # Conversion: 1 palette = N cartons
    cartons_par_palette = models.PositiveIntegerField(
        default=1, help_text="Nombre de cartons dans une palette"
    )
    # Purchase price: per PALETTE
    prix_achat = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        help_text="Prix d'achat par palette"
    )
    # Sale prices: per CARTON
    prix_detail = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        help_text="Prix de vente par carton (détail)"
    )
    prix_gros = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        help_text="Prix de vente par carton (gros)"
    )
    # Stock stored in CARTONS (base unit for sales)
    stock_actuel = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    # Minimum threshold in cartons
    stock_minimum = models.DecimalField(max_digits=10, decimal_places=2, default=5)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to='produits/', blank=True, null=True)
    actif = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['nom']

    def __str__(self):
        return f"{self.nom} ({self.code})"

    @property
    def stock_faible(self):
        return self.stock_actuel <= self.stock_minimum

    @property
    def stock_palettes(self):
        """Full palettes in stock"""
        if self.cartons_par_palette and self.cartons_par_palette > 0:
            return int(self.stock_actuel // self.cartons_par_palette)
        return 0

    @property
    def stock_cartons_restants(self):
        """Remaining cartons after full palettes"""
        if self.cartons_par_palette and self.cartons_par_palette > 0:
            return int(self.stock_actuel % self.cartons_par_palette)
        return int(self.stock_actuel)
