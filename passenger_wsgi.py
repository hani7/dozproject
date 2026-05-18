"""
ForCli — Diagnostic Passenger WSGI
===================================
This file catches startup errors and displays them in the browser
so we can identify the exact cause of the 500 error.

INSTRUCTIONS:
1. Deploy this file to cPanel (git pull)
2. Touch tmp/restart.txt to reload
3. Visit https://api.doz.baitul.tech/api/health/
4. You will see the EXACT error instead of a black 500 page
5. Once fixed, this file will automatically run the real Django app
"""

import sys
import os

# Capture all startup output
_startup_errors = []
_startup_info = []

# ── Step 1: Path setup ───────────────────────────────────────────────────────
try:
    PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, PROJECT_ROOT)
    _startup_info.append(f"[OK] PROJECT_ROOT = {PROJECT_ROOT}")
    _startup_info.append(f"[OK] Python = {sys.version}")
    _startup_info.append(f"[OK] sys.path[0] = {sys.path[0]}")
except Exception as e:
    _startup_errors.append(f"[FAIL] Path setup: {e}")

# ── Step 2: Load .env ────────────────────────────────────────────────────────
try:
    _env_path = os.path.join(PROJECT_ROOT, '.env')
    _startup_info.append(f"[OK] .env path = {_env_path}")
    _startup_info.append(f"[OK] .env exists = {os.path.exists(_env_path)}")

    if os.path.exists(_env_path):
        # Manual reader — does not depend on python-dotenv
        with open(_env_path) as _f:
            for _line in _f:
                _line = _line.strip()
                if _line and not _line.startswith('#') and '=' in _line:
                    _k, _, _v = _line.partition('=')
                    os.environ.setdefault(_k.strip(), _v.strip())
        _startup_info.append("[OK] .env loaded manually")

    # Try dotenv as well
    try:
        from dotenv import load_dotenv
        load_dotenv(_env_path)
        _startup_info.append("[OK] python-dotenv loaded")
    except ImportError:
        _startup_info.append("[WARN] python-dotenv not installed (using manual reader)")

except Exception as e:
    _startup_errors.append(f"[FAIL] .env loading: {e}")

# ── Step 3: Check SECRET_KEY ─────────────────────────────────────────────────
try:
    _key = os.environ.get('DJANGO_SECRET_KEY', '')
    _startup_info.append(f"[OK] DJANGO_SECRET_KEY set = {bool(_key)} (length={len(_key)})")
    if not _key:
        _startup_errors.append("[FAIL] DJANGO_SECRET_KEY is empty or not set in .env")
except Exception as e:
    _startup_errors.append(f"[FAIL] SECRET_KEY check: {e}")

# ── Step 4: Set Django settings ──────────────────────────────────────────────
try:
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'for.settings_production')
    _startup_info.append(f"[OK] DJANGO_SETTINGS_MODULE = {os.environ.get('DJANGO_SETTINGS_MODULE')}")
except Exception as e:
    _startup_errors.append(f"[FAIL] Settings module: {e}")

# ── Step 5: Import Django ────────────────────────────────────────────────────
_django_app = None
try:
    from django.core.wsgi import get_wsgi_application
    _django_app = get_wsgi_application()
    _startup_info.append("[OK] Django WSGI application loaded successfully!")
except Exception as e:
    import traceback
    _startup_errors.append(f"[FAIL] Django startup: {type(e).__name__}: {e}")
    _startup_errors.append(traceback.format_exc())


# ── Fallback diagnostic app ──────────────────────────────────────────────────
def _diagnostic_app(environ, start_response):
    """
    If Django fails to load, this function returns the startup log
    as plain text so you can see exactly what went wrong.
    """
    status = '200 OK' if not _startup_errors else '500 Internal Server Error'
    headers = [('Content-Type', 'text/plain; charset=utf-8')]
    start_response(status, headers)

    lines = [
        "=" * 60,
        "ForCli API — Startup Diagnostic Report",
        "=" * 60,
        "",
        "── Startup Log ─────────────────────────────",
    ]
    lines.extend(_startup_info)

    if _startup_errors:
        lines += [
            "",
            "── ERRORS (Fix These!) ─────────────────────",
        ]
        lines.extend(_startup_errors)
        lines += [
            "",
            "── How to Fix ───────────────────────────────",
            "1. SSH into cPanel",
            "2. cd ~/forcli2",
            "3. cat .env  (check DJANGO_SECRET_KEY is set)",
            "4. source env/bin/activate && pip install -r requirements.txt",
            "5. python manage.py check --settings=for.settings_production",
            "6. touch tmp/restart.txt",
        ]
    else:
        lines += [
            "",
            "── Status ───────────────────────────────────",
            "Django loaded successfully. If you see this page,",
            "the URL routing may have an issue.",
        ]

    body = "\n".join(lines) + "\n"
    return [body.encode('utf-8')]


# ── Final: use real Django app if loaded, else diagnostic ───────────────────
if _django_app is not None:
    application = _django_app
else:
    application = _diagnostic_app
