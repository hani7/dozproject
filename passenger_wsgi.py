import sys
import os

# 1. Ajouter le dossier de votre projet au PATH de Python
sys.path.insert(0, os.path.dirname(__file__))

# 2. Indiquer à Django d'utiliser les settings de production
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'for.settings_production')

# 3. Lancer l'application Django
from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
