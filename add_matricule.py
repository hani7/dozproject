"""
Script one-shot: ajoute le champ 'matricule' à la table accounts_customuser
sans avoir besoin de Django migrations.
Uploader dans ~/forcli2/ puis exécuter via cPanel > Python App > Run Script
"""
import os, sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'for.settings_production')

import django
django.setup()

from django.db import connection

with connection.cursor() as cursor:
    # Vérifier si la colonne existe déjà
    cursor.execute("PRAGMA table_info(accounts_customuser)")
    cols = [row[1] for row in cursor.fetchall()]
    
    if 'matricule' in cols:
        print("✅ La colonne 'matricule' existe déjà — rien à faire.")
    else:
        cursor.execute(
            "ALTER TABLE accounts_customuser ADD COLUMN matricule VARCHAR(50) NOT NULL DEFAULT ''"
        )
        print("✅ Colonne 'matricule' ajoutée avec succès!")
    
    # Marquer la migration comme appliquée dans Django
    cursor.execute(
        "INSERT OR IGNORE INTO django_migrations (app, name, applied) VALUES (?, ?, datetime('now'))",
        ['accounts', '0005_customuser_matricule']
    )
    print("✅ Migration marquée comme appliquée dans Django.")

print("=== TERMINÉ ===")
