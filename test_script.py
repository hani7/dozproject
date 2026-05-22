import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'for.settings')
django.setup()

from rest_framework.test import APIClient
from accounts.models import CustomUser

try:
    user = CustomUser.objects.get(username='hani1')
    client = APIClient()
    client.force_authenticate(user=user)
    response = client.post('/api/auth/users/update_location/', {'latitude': 36.7, 'longitude': 3.1}, format='json')
    print('CODE:', response.status_code)
    print('BODY:', response.content)
except Exception as e:
    import traceback
    traceback.print_exc()
