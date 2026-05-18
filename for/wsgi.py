"""
WSGI config for ForCli project.
For cPanel, use passenger_wsgi.py instead of this file.
This file is kept for local development with `python manage.py runserver`.
"""

import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'for.settings')

application = get_wsgi_application()
