from django.db import models
from django.conf import settings
import uuid


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
    STATUS_CHOICES = [
        ('en_attente', 'En attente'),
        ('execute', 'Exécuté'),
        ('annule', 'Annulé'),
    ]
    employe            = models.ForeignKey('hr.Employe', on_delete=models.CASCADE, related_name='virements')
    montant            = models.DecimalField(max_digits=10, decimal_places=2)
    date               = models.DateField()
    reference_bancaire = models.CharField(max_length=100, blank=True)
    banque             = models.CharField(max_length=100, blank=True)
    motif              = models.CharField(max_length=200, blank=True)
    statut             = models.CharField(max_length=20, choices=STATUS_CHOICES, default='en_attente')
    notes              = models.TextField(blank=True)
    cree_par           = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"VIR-{self.id} / {self.employe} / {self.montant} DA"


# ── Plan de paiement échelonné ──────────────────────────────────
class PaiementPlan(models.Model):
    """Payment plan: one container for multiple installment virements."""
    TYPE_CHOICES   = [('client', 'Client'), ('fournisseur', 'Fournisseur')]
    STATUS_CHOICES = [
        ('en_cours', 'En cours'),
        ('termine',  'Terminé'),
        ('annule',   'Annulé'),
    ]
    reference       = models.CharField(max_length=30, unique=True, blank=True)
    type_plan       = models.CharField(max_length=20, choices=TYPE_CHOICES, default='client')
    client_nom      = models.CharField(max_length=200, blank=True)
    fournisseur_nom = models.CharField(max_length=200, blank=True)
    montant_total   = models.DecimalField(max_digits=12, decimal_places=2)
    statut          = models.CharField(max_length=20, choices=STATUS_CHOICES, default='en_cours')
    date_debut      = models.DateField()
    notes           = models.TextField(blank=True)
    cree_par        = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.reference:
            self.reference = f"PL-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

    @property
    def montant_paye(self):
        from decimal import Decimal
        total = self.versements.aggregate(s=models.Sum('montant'))['s']
        return total or Decimal('0')

    @property
    def montant_restant(self):
        r = self.montant_total - self.montant_paye
        return r if r > 0 else 0

    @property
    def pct_paye(self):
        if not self.montant_total:
            return 0
        return min(100, int(self.montant_paye / self.montant_total * 100))

    def __str__(self):
        nom = self.client_nom or self.fournisseur_nom
        return f"{self.reference} / {nom} / {self.montant_total} DA"


class VersementPlan(models.Model):
    """One installment payment within a PaiementPlan."""
    MODE_CHOICES = [
        ('especes',  'Espèces'),
        ('virement', 'Virement bancaire'),
        ('cheque',   'Chèque'),
        ('mobile',   'Mobile payment'),
    ]
    plan     = models.ForeignKey(PaiementPlan, on_delete=models.CASCADE, related_name='versements')
    montant  = models.DecimalField(max_digits=12, decimal_places=2)
    date     = models.DateField()
    mode     = models.CharField(max_length=20, choices=MODE_CHOICES, default='especes')
    notes    = models.TextField(blank=True)
    cree_par = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['date', 'created_at']

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Auto-close plan when fully paid
        plan = self.plan
        plan.refresh_from_db()
        if plan.montant_paye >= plan.montant_total:
            PaiementPlan.objects.filter(pk=plan.pk).update(statut='termine')
        elif plan.statut == 'termine':
            PaiementPlan.objects.filter(pk=plan.pk).update(statut='en_cours')

    def __str__(self):
        return f"VERS-{self.id} / {self.plan.reference} / {self.montant} DA"
