"""
Data migration: Activates the admin user and sets credentials.
Runs automatically on `manage.py migrate` — no SSH needed.
"""

from django.db import migrations


def activate_admin(apps, schema_editor):
    CustomUser = apps.get_model('accounts', 'CustomUser')
    from django.contrib.auth.hashers import make_password

    # Find by any known username variant
    user = (
        CustomUser.objects.filter(username='dozforcli1').first()
        or CustomUser.objects.filter(username='admin').first()
        or CustomUser.objects.filter(role='admin').first()
    )

    if user:
        user.username = 'dozforcli1'
        user.password = make_password('Hakim5066##')
        user.is_active = True
        user.is_staff = True
        user.is_superuser = True
        user.role = 'admin'
        user.save()
    else:
        # No admin exists at all — create one from scratch
        CustomUser.objects.create(
            username='dozforcli1',
            password=make_password('Hakim5066##'),
            is_active=True,
            is_staff=True,
            is_superuser=True,
            role='admin',
            specialite='les_deux',
        )


def reverse_migration(apps, schema_editor):
    pass  # Non-destructive — safe to reverse


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0005_customuser_matricule'),
    ]

    operations = [
        migrations.RunPython(activate_admin, reverse_migration),
    ]
