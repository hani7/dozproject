# =============================================================
# ForCli — Production Settings (cPanel / api.doz.baitul.tech)
# =============================================================
# Usage: set DJANGO_SETTINGS_MODULE=for.settings_production
# All sensitive values MUST be set as environment variables.
# =============================================================

import os
from .settings import *  # Import everything from base settings

# ── Security ──────────────────────────────────────────────────
DEBUG = False

# SECRET_KEY MUST be set in the environment — no insecure fallback in production
_prod_key = os.environ.get('DJANGO_SECRET_KEY', '')
if not _prod_key:
    raise RuntimeError(
        'DJANGO_SECRET_KEY environment variable is not set. '
        'Generate one with: python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"'
    )
SECRET_KEY = _prod_key

ALLOWED_HOSTS = [
    'doz.baitul.tech',
    'www.doz.baitul.tech',
    'api.doz.baitul.tech',
]

# ── Database ───────────────────────────────────────────────────
# Option A: SQLite (simple, works out-of-the-box, fine for low traffic)
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# Option B: MySQL (recommended for production — uncomment and fill in cPanel credentials)
# Requires: pip install mysqlclient
# DATABASES = {
#     'default': {
#         'ENGINE':   'django.db.backends.mysql',
#         'NAME':     os.environ.get('DB_NAME',     'cpanelusername_forcli'),
#         'USER':     os.environ.get('DB_USER',     'cpanelusername_forcliuser'),
#         'PASSWORD': os.environ.get('DB_PASSWORD', ''),
#         'HOST':     os.environ.get('DB_HOST',     'localhost'),
#         'PORT':     os.environ.get('DB_PORT',     '3306'),
#         'OPTIONS':  {'charset': 'utf8mb4'},
#     }
# }

# ── Static & Media Files ───────────────────────────────────────
STATIC_URL  = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL   = '/media/'
MEDIA_ROOT  = BASE_DIR / 'media'

# WhiteNoise — serve staticfiles efficiently via WSGI
WHITENOISE_INDEX_FILE = True
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# ── CORS — only allow your frontend domain ─────────────────────
CORS_ALLOW_ALL_ORIGINS = False          # Must be False in production
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = [
    'https://doz.baitul.tech',
    'https://www.doz.baitul.tech',
]

# ── Security Headers (HTTPS only) ─────────────────────────────
SECURE_BROWSER_XSS_FILTER     = True
SECURE_CONTENT_TYPE_NOSNIFF   = True
X_FRAME_OPTIONS                = 'DENY'
SESSION_COOKIE_SECURE          = True   # Only send session cookie over HTTPS
CSRF_COOKIE_SECURE             = True   # Only send CSRF cookie over HTTPS
SECURE_REFERRER_POLICY         = 'same-origin'
