#!/bin/bash
# ============================================================
# ForCli — cPanel SSH Deployment Script
# ============================================================
# Usage (via cPanel SSH Terminal):
#   cd ~/forcli2
#   chmod +x deploy.sh
#   ./deploy.sh
#
# The script auto-detects the cPanel virtualenv location.
# ============================================================

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
FOLDER_NAME="$(basename "$PROJECT_DIR")"       # e.g. forcli2

echo "========================================"
echo "  ForCli Deployment — $(date)"
echo "  Project: $PROJECT_DIR"
echo "========================================"

# ── 1. Find and activate virtual environment ─────────────────
# cPanel creates venvs at ~/virtualenv/<folder>/<python_version>/
# Try cPanel standard location first, fallback to local ./env
activate_venv() {
    # Try cPanel-style location: ~/virtualenv/forcli2/3.X/bin/activate
    for py_ver in 3.13 3.12 3.11 3.10 3.9; do
        CPANEL_VENV="$HOME/virtualenv/$FOLDER_NAME/$py_ver/bin/activate"
        if [ -f "$CPANEL_VENV" ]; then
            echo "[1/6] Activating cPanel virtualenv (Python $py_ver)..."
            source "$CPANEL_VENV"
            return 0
        fi
    done
    # Fallback: local ./env (for local dev or manual venv creation)
    if [ -f "$PROJECT_DIR/env/bin/activate" ]; then
        echo "[1/6] Activating local virtualenv..."
        source "$PROJECT_DIR/env/bin/activate"
        return 0
    fi
    echo "ERROR: No virtual environment found."
    echo "Create one in cPanel > Setup Python App, or run: python3 -m venv env"
    exit 1
}
activate_venv

# ── 2. Install / update dependencies ─────────────────────────
echo "[2/6] Installing dependencies..."
pip install -r "$PROJECT_DIR/requirements.txt" --quiet

# ── 3. Collect static files ───────────────────────────────────
echo "[3/6] Collecting static files..."
python "$PROJECT_DIR/manage.py" collectstatic \
    --settings=for.settings_production \
    --noinput \
    --clear

# ── 4. Apply database migrations ─────────────────────────────
echo "[4/6] Applying migrations..."
python "$PROJECT_DIR/manage.py" migrate \
    --settings=for.settings_production \
    --noinput

# ── 5. Validate Django configuration ─────────────────────────
echo "[5/6] Checking Django configuration..."
python "$PROJECT_DIR/manage.py" check \
    --settings=for.settings_production

# ── 6. Restart the application (Passenger) ───────────────────
echo "[6/6] Restarting application..."
mkdir -p "$PROJECT_DIR/tmp"
touch "$PROJECT_DIR/tmp/restart.txt"

echo ""
echo "✅ Deployment complete!"
echo "   API: https://api.doz.baitul.tech/api/health/"
echo "========================================"
