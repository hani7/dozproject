from django.db import models
import uuid


class Produit(models.Model):
    nom  = models.CharField(max_length=200, db_index=True)
    code = models.CharField(max_length=50, unique=True, blank=True, null=True)

    def save(self, *args, **kwargs):
        if not self.code:
            base = self.nom[:6].upper().replace(' ', '-') if self.nom else 'PROD'
            self.code = f"{base}-{uuid.uuid4().hex[:4].upper()}"
        super().save(*args, **kwargs)

    # Conversion: 1 palette = N cartons
    cartons_par_palette = models.PositiveIntegerField(
        default=1, help_text="Nombre de cartons dans une palette"
    )
    # Conversion: 1 carton = N bouteilles (unités)
    bouteilles_par_carton = models.PositiveIntegerField(
        default=1, help_text="Nombre de bouteilles (unités) dans un carton"
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
    seuil_volume = models.PositiveIntegerField(
        default=0,
        help_text="Quantité minimum pour appliquer le prix de volume (Détail)"
    )
    prix_volume_detail = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        help_text="Prix de vente par carton appliqué au-delà du seuil (Détail)"
    )
    prix_gros = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        help_text="Prix de vente par carton (gros)"
    )
    # Stock stored in CARTONS (base unit for sales)
    stock_actuel  = models.DecimalField(max_digits=10, decimal_places=2, default=0, db_index=True)
    stock_minimum = models.DecimalField(max_digits=10, decimal_places=2, default=5)
    description   = models.TextField(blank=True)
    image         = models.ImageField(upload_to='produits/', blank=True, null=True)
    actif         = models.BooleanField(default=True, db_index=True)
    created_at    = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at    = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['nom']
        indexes = [
            # Composite index for the most common dashboard query: actif + stock comparison
            models.Index(fields=['actif', 'stock_actuel'], name='idx_produit_actif_stock'),
        ]

    def __str__(self):
        return f"{self.nom} ({self.code})"

    @property
    def stock_faible(self):
        return self.stock_actuel <= self.stock_minimum

    @property
    def prix_detail_bouteille(self):
        """Prix de vente détail par bouteille (unité individuelle)"""
        if self.bouteilles_par_carton and self.bouteilles_par_carton > 0:
            return round(float(self.prix_detail) / self.bouteilles_par_carton, 2)
        return float(self.prix_detail)

    @property
    def prix_gros_bouteille(self):
        """Prix de vente gros par bouteille (unité individuelle)"""
        if self.bouteilles_par_carton and self.bouteilles_par_carton > 0:
            return round(float(self.prix_gros) / self.bouteilles_par_carton, 2)
        return float(self.prix_gros)

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
