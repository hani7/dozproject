from django.db import models
from django.conf import settings


class Employe(models.Model):
    POSTE_CHOICES = [
        ('admin', 'Administrateur'),
        ('prevendeur_gros', 'Prévendeur Gros'),
        ('prevendeur_detail', 'Prévendeur Détail'),
        ('livreur_gros', 'Livreur Gros'),
        ('livreur_detail', 'Livreur Détail'),
        ('magasinier', 'Magasinier'),
        ('comptable', 'Comptable'),
        ('autre', 'Autre'),
    ]
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='employe', null=True, blank=True
    )
    nom = models.CharField(max_length=100)
    prenom = models.CharField(max_length=100)
    poste = models.CharField(max_length=20, choices=POSTE_CHOICES)
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    adresse = models.TextField(blank=True)
    salaire_base = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    date_embauche = models.DateField()
    actif = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['nom', 'prenom']

    def __str__(self):
        return f"{self.prenom} {self.nom} ({self.get_poste_display()})"


class Presence(models.Model):
    STATUS_CHOICES = [
        ('present', 'Présent'),
        ('absent', 'Absent'),
        ('conge', 'Congé'),
        ('maladie', 'Maladie'),
        ('mission', 'Mission'),
    ]
    employe = models.ForeignKey(Employe, on_delete=models.CASCADE, related_name='presences')
    date = models.DateField()
    statut = models.CharField(max_length=20, choices=STATUS_CHOICES, default='present')
    heure_arrivee = models.TimeField(null=True, blank=True)
    heure_depart = models.TimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        unique_together = ['employe', 'date']
        ordering = ['-date']

    def __str__(self):
        return f"{self.employe} - {self.date} ({self.get_statut_display()})"


class Paie(models.Model):
    STATUS_CHOICES = [
        ('en_attente', 'En attente'),
        ('paye', 'Payé'),
    ]
    employe = models.ForeignKey(Employe, on_delete=models.CASCADE, related_name='paies')
    mois = models.CharField(max_length=7)  # YYYY-MM
    salaire_base = models.DecimalField(max_digits=10, decimal_places=2)
    primes = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    deductions = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    net_a_payer = models.DecimalField(max_digits=10, decimal_places=2)
    statut = models.CharField(max_length=20, choices=STATUS_CHOICES, default='en_attente')
    date_paiement = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['employe', 'mois']
        ordering = ['-mois']

    def save(self, *args, **kwargs):
        self.net_a_payer = self.salaire_base + self.primes - self.deductions
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Paie {self.employe} - {self.mois}"
