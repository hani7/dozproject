import sys
import os

# ── 1. Add the project root to Python path ──────────────────────────────────
sys.path.insert(0, os.path.dirname(__file__))

# ── 2. Load .env file (for SECRET_KEY, DB credentials, etc.) ───────────────
try:
    from dotenv import load_dotenv
    _env_path = os.path.join(os.path.dirname(__file__), '.env')
    if os.path.exists(_env_path):
        load_dotenv(_env_path)
except ImportError:
    pass  # python-dotenv not installed; env vars must be set in cPanel ENV section

# ── 3. Point Django to the production settings ──────────────────────────────
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'for.settings_production')

# ── 4. Start the Django WSGI application ────────────────────────────────────
from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
