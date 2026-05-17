import sys
import os

# Tell Python where your project lives
sys.path.insert(0, os.path.dirname(__file__))

# Point to production settings
os.environ['DJANGO_SETTINGS_MODULE'] = 'for.settings_production'

# Activate virtualenv (cPanel creates this automatically when you set up Python App)
# Path example: /home/cpanelusername/virtualenv/forcli/3.11/bin/activate_this.py
VENV_PATH = '/home/YOUR_CPANEL_USERNAME/virtualenv/forcli/3.11/bin/activate_this.py'
if os.path.exists(VENV_PATH):
    with open(VENV_PATH) as f:
        exec(f.read(), {'__file__': VENV_PATH})

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
