import sys
import os

# ── 1. Add the project root to Python path ──────────────────────────────────
PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, PROJECT_ROOT)

# ── 2. Load .env file ────────────────────────────────────────────────────────
try:
    from dotenv import load_dotenv
    _env_path = os.path.join(PROJECT_ROOT, '.env')
    if os.path.exists(_env_path):
        load_dotenv(_env_path)
except ImportError:
    pass

# ── 3. Force DJANGO_SECRET_KEY to be set before Django loads ────────────────
# If .env failed to load, try reading it manually as a fallback
if not os.environ.get('DJANGO_SECRET_KEY'):
    _env_path = os.path.join(PROJECT_ROOT, '.env')
    if os.path.exists(_env_path):
        with open(_env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, _, val = line.partition('=')
                    os.environ.setdefault(key.strip(), val.strip())

# ── 4. Point Django to the production settings ──────────────────────────────
# NOTE: The settings package is named 'for' which is a Python reserved keyword.
# We use the string-based DJANGO_SETTINGS_MODULE which bypasses the keyword
# restriction since Django uses importlib.import_module() internally.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'for.settings_production')

# ── 5. Start the Django WSGI application ────────────────────────────────────
from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
