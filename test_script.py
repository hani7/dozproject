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
    if response.status_code == 500:
        import re
        content = response.content.decode('utf-8')
        m1 = re.search(r'<pre class="exception_value">(.*?)</pre>', content, re.IGNORECASE | re.DOTALL)
        if m1:
            print('EXCEPTION:', m1.group(1))
        m2 = re.search(r'<textarea id="traceback_area".*?>(.*?)</textarea>', content, re.IGNORECASE | re.DOTALL)
        if m2:
            print('TRACEBACK:', m2.group(1))
except Exception as e:
    import traceback
    traceback.print_exc()
