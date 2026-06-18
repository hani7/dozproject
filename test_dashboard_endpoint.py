import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'for.settings')
django.setup()

from django.conf import settings
settings.DEBUG_PROPAGATE_EXCEPTIONS = True
if 'testserver' not in settings.ALLOWED_HOSTS:
    settings.ALLOWED_HOSTS.append('testserver')

from rest_framework.test import APIClient
from accounts.models import CustomUser
import traceback

client = APIClient()
user = CustomUser.objects.filter(is_superuser=True).first()
if user:
    client.force_authenticate(user=user)
    try:
        response = client.get('/api/dashboard/stats/')
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            print("Success! Data preview:")
            print(str(response.data)[:500])
        else:
            print("Error:")
            print(response.content.decode()[:500])
    except Exception as e:
        print("Caught Exception:")
        traceback.print_exc()
else:
    print("No superuser found.")
