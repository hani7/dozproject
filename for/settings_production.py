# =============================================================
# ForCli — Production Settings (cPanel)
# =============================================================
# Usage: set DJANGO_SETTINGS_MODULE=for.settings_production
# =============================================================

from .settings import *   # Import everything from base settings
import os

# ── Security ──────────────────────────────────────────────────
DEBUG = False

# Replace with your actual cPanel domain
ALLOWED_HOSTS = [
    'yourdomain.com',
    'www.yourdomain.com',
    'api.yourdomain.com',  # if using subdomain for API
]

# IMPORTANT: Change this to a strong random key in production!
# Generate one: python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', SECRET_KEY)

# ── Database (MySQL — cPanel) ──────────────────────────────────
# Uncomment and fill in your cPanel MySQL credentials
# DATABASES = {
#     'default': {
#         'ENGINE': 'django.db.backends.mysql',
#         'NAME':     os.environ.get('DB_NAME', 'cpanelusername_forcli'),
#         'USER':     os.environ.get('DB_USER', 'cpanelusername_forcliuser'),
#         'PASSWORD': os.environ.get('DB_PASSWORD', 'your_db_password'),
#         'HOST':     os.environ.get('DB_HOST', 'localhost'),
#         'PORT':     os.environ.get('DB_PORT', '3306'),
#         'OPTIONS':  { 'charset': 'utf8mb4' },
#     }
# }

# Keep SQLite for simple deployments:
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# ── Static & Media Files ───────────────────────────────────────
STATIC_URL  = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'   # collectstatic destination
MEDIA_URL   = '/media/'
MEDIA_ROOT  = BASE_DIR / 'media'

# ── CORS — only allow your frontend domain ────────────────────
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = [
    'https://yourdomain.com',
    'https://www.yourdomain.com',
]
CORS_ALLOW_CREDENTIALS = True

# ── Security Headers ───────────────────────────────────────────
SECURE_BROWSER_XSS_FILTER  = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
