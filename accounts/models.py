from django.contrib.auth.models import AbstractUser
from django.db import models


class CustomUser(AbstractUser):
    ROLE_CHOICES = [
        ('admin', 'Administrateur'),
        ('prevendeur', 'Prévendeur'),
        ('livreur', 'Livreur'),
    ]
    SPECIALITE_CHOICES = [
        ('detail', 'Détail (carton)'),
        ('gros', 'Gros (palette)'),
        ('les_deux', 'Détail & Gros'),
    ]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='prevendeur')
    specialite = models.CharField(
        max_length=20, choices=SPECIALITE_CHOICES, default='les_deux',
        help_text='Prévendeur: type de commandes autorisées. Livreur: type de livraisons assignées.'
    )
    phone = models.CharField(max_length=20, blank=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    is_active = models.BooleanField(default=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    last_location_update = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        spec = f' [{self.specialite}]' if self.role in ('prevendeur', 'livreur') else ''
        return f"{self.get_full_name() or self.username} ({self.get_role_display()}{spec})"

class LocationHistory(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='location_history')
    latitude = models.FloatField()
    longitude = models.FloatField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', 'timestamp']),
        ]

    def __str__(self):
        return f"{self.user.username} at {self.timestamp}"
