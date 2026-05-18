# =============================================================
# ForCli — Production Settings (cPanel / api.doz.baitul.tech)
# =============================================================

import os
from .settings import *  # Import everything from base settings

# ── Security ──────────────────────────────────────────────────
DEBUG = False

# SECRET_KEY MUST be set in the environment
_prod_key = os.environ.get('DJANGO_SECRET_KEY', '')
if not _prod_key:
    raise RuntimeError(
        'DJANGO_SECRET_KEY environment variable is not set. '
        'Generate one and add it to your .env file:\n'
        '  python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"'
    )
SECRET_KEY = _prod_key

ALLOWED_HOSTS = [
    'doz.baitul.tech',
    'www.doz.baitul.tech',
    'api.doz.baitul.tech',
    # cPanel sometimes calls the app via server hostname — allow all subdomains
    '.baitul.tech',
]

# ── Database ───────────────────────────────────────────────────
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# ── Static & Media Files ───────────────────────────────────────
STATIC_URL  = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL   = '/media/'
MEDIA_ROOT  = BASE_DIR / 'media'

# WhiteNoise — serve staticfiles efficiently via WSGI
WHITENOISE_INDEX_FILE = True
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# ── CORS ───────────────────────────────────────────────────────
# Allow all origins temporarily to unblock the connection.
# Once verified working, restrict to CORS_ALLOWED_ORIGINS below.
CORS_ALLOW_ALL_ORIGINS = True           # ← OPEN for initial testing
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# Once the API is confirmed working, set this to False and use:
# CORS_ALLOW_ALL_ORIGINS = False
# CORS_ALLOWED_ORIGINS = [
#     'https://doz.baitul.tech',
#     'https://www.doz.baitul.tech',
# ]

# ── Security Headers ───────────────────────────────────────────
SECURE_BROWSER_XSS_FILTER    = True
SECURE_CONTENT_TYPE_NOSNIFF  = True
X_FRAME_OPTIONS               = 'DENY'
SESSION_COOKIE_SECURE         = True
CSRF_COOKIE_SECURE            = True
SECURE_REFERRER_POLICY        = 'same-origin'
