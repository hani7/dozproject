"""
Script one-shot: ajoute les champs 'matricule' à la base de données SQLite
sans avoir besoin de passer par les migrations Django.

Tables modifiées :
  - accounts_customuser   → ajoute 'matricule'
  - ventes_vente          → ajoute 'cree_par_matricule', 'livreur_matricule'
  - commandes_commande    → ajoute 'cree_par_matricule', 'livreur_matricule'

Usage : uploader dans ~/forcli2/ puis exécuter via
        cPanel > Python App > Run Script → add_matricule.py
"""
import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'for.settings_production')

import django
django.setup()

from django.db import connection


def add_column_if_missing(cursor, table, column, col_type):
    """Ajoute une colonne si elle n'existe pas encore."""
    cursor.execute(f"PRAGMA table_info({table})")
    cols = [row[1] for row in cursor.fetchall()]
    if column in cols:
        print(f"  ✅ '{column}' existe déjà dans '{table}' — ignoré.")
        return False
    cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}")
    print(f"  ✅ Colonne '{column}' ajoutée dans '{table}'.")
    return True


def mark_migration(cursor, app, name):
    """Marque une migration comme appliquée dans Django."""
    cursor.execute(
        "INSERT OR IGNORE INTO django_migrations (app, name, applied) "
        "VALUES (?, ?, datetime('now'))",
        [app, name]
    )
    print(f"  ✅ Migration '{app}.{name}' marquée comme appliquée.")


print("\n" + "="*55)
print("  SCRIPT ADD_MATRICULE — ForCli ERP")
print("="*55)

with connection.cursor() as cursor:

    # ── 1. accounts_customuser ─────────────────────────────────
    print("\n[1/3] Table : accounts_customuser")
    add_column_if_missing(
        cursor,
        'accounts_customuser',
        'matricule',
        "VARCHAR(50) NOT NULL DEFAULT ''"
    )
    mark_migration(cursor, 'accounts', '0005_customuser_matricule')

    # ── 2. ventes_vente ────────────────────────────────────────
    print("\n[2/3] Table : ventes_vente")
    add_column_if_missing(
        cursor,
        'ventes_vente',
        'cree_par_matricule',
        "VARCHAR(50) NOT NULL DEFAULT ''"
    )
    add_column_if_missing(
        cursor,
        'ventes_vente',
        'livreur_matricule',
        "VARCHAR(50) NOT NULL DEFAULT ''"
    )
    mark_migration(cursor, 'ventes', '0010_vente_cree_par_matricule_livreur_matricule')

    # ── 3. commandes_commande ──────────────────────────────────
    print("\n[3/3] Table : commandes_commande")
    add_column_if_missing(
        cursor,
        'commandes_commande',
        'cree_par_matricule',
        "VARCHAR(50) NOT NULL DEFAULT ''"
    )
    add_column_if_missing(
        cursor,
        'commandes_commande',
        'livreur_matricule',
        "VARCHAR(50) NOT NULL DEFAULT ''"
    )
    mark_migration(cursor, 'commandes', '0010_commande_cree_par_matricule_livreur_matricule')

print("\n" + "="*55)
print("  ✅  TERMINÉ — Toutes les colonnes sont en place.")
print("="*55 + "\n")
