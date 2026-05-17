import sys
import os

# 1. Add the project directory to the Python path
sys.path.insert(0, '/home/baitmtzi/forcli')

# 2. Add the virtualenv site-packages (cPanel Python App path)
venv_path = '/home/baitmtzi/forcli'
activate_this = os.path.join(venv_path, 'bin', 'activate_this.py')
if os.path.exists(activate_this):
    exec(open(activate_this).read(), {'__file__': activate_this})

# 3. Tell Django to use production settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'for.settings_production')

# 4. Launch the Django application
from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
