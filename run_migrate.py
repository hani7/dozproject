#!/usr/bin/env python
"""
Script one-shot — exécuter via cPanel > Setup Python App > Run Script
ou uploader dans le dossier du projet et exécuter via l'interface Python App.
"""
import os
import sys
import django

# Ajuster le chemin si nécessaire
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE_DIR)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'for.settings_production')

try:
    django.setup()
    from django.core.management import call_command
    print("=== Applying migrations ===")
    call_command('migrate', verbosity=2)
    print("=== Migration complete! ===")
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
