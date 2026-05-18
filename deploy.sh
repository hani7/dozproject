#!/bin/bash
# ============================================================
# ForCli — cPanel SSH Deployment Script
# ============================================================
# Usage (via cPanel SSH Terminal):
#   chmod +x deploy.sh
#   ./deploy.sh
#
# Prerequisites:
#   - Python virtualenv created at ~/virtualenv/forcli/
#   - .env file created from .env.example with real values
#   - This script run from the project root
# ============================================================

set -e  # Exit immediately on any error

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV_DIR="$PROJECT_DIR/env"

echo "========================================"
echo "  ForCli Deployment — $(date)"
echo "========================================"

# ── 1. Activate virtual environment ──────────────────────────
echo "[1/6] Activating virtual environment..."
if [ -d "$VENV_DIR" ]; then
    source "$VENV_DIR/bin/activate"
else
    echo "ERROR: Virtual environment not found at $VENV_DIR"
    echo "Create it with: python3 -m venv env"
    exit 1
fi

# ── 2. Install / update dependencies ─────────────────────────
echo "[2/6] Installing dependencies..."
pip install -r requirements.txt --quiet

# ── 3. Collect static files ───────────────────────────────────
echo "[3/6] Collecting static files..."
python manage.py collectstatic \
    --settings=for.settings_production \
    --noinput \
    --clear

# ── 4. Apply database migrations ─────────────────────────────
echo "[4/6] Applying migrations..."
python manage.py migrate \
    --settings=for.settings_production \
    --noinput

# ── 5. Validate Django configuration ─────────────────────────
echo "[5/6] Checking Django configuration..."
python manage.py check \
    --settings=for.settings_production \
    --deploy

# ── 6. Restart the application (Passenger) ───────────────────
echo "[6/6] Restarting application..."
if [ -f "$PROJECT_DIR/tmp/restart.txt" ]; then
    touch "$PROJECT_DIR/tmp/restart.txt"
else
    mkdir -p "$PROJECT_DIR/tmp"
    touch "$PROJECT_DIR/tmp/restart.txt"
fi

echo ""
echo "✅ Deployment complete!"
echo "   API: https://api.doz.baitul.tech/api/health/"
echo "========================================"
