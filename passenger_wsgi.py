import sys
import os
import traceback

R = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, R)

e = os.path.join(R, '.env')
if os.path.exists(e):
    f = open(e)
    for L in f:
        L = L.strip()
        if L and not L.startswith('#') and '=' in L:
            k, _, v = L.partition('=')
            os.environ.setdefault(k.strip(), v.strip())
    f.close()

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'for.settings_production')

# ── Auto-migrate and collect static on startup (no SSH needed on cPanel) ─────────────────────────
try:
    import django
    django.setup()
    from django.core.management import call_command
    call_command('migrate', '--noinput', verbosity=0)
    call_command('collectstatic', '--noinput', verbosity=0)
except Exception:
    pass  # Don't block app startup if migrate fails
# ──────────────────────────────────────────────────────────────────────────────

try:
    from django.core.wsgi import get_wsgi_application
    application = get_wsgi_application()
except Exception:
    err = traceback.format_exc()
    def application(env, sr):
        sr('200 OK', [('Content-Type', 'text/plain')])
        return [(('ERROR:\n' + err).encode())]
