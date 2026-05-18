import requests
import json

url_login = 'http://localhost:8001/api/token/'
url_client = 'http://localhost:8001/api/clients/'

# Let's try to get a user from DB using django shell, or just use a dummy login if we know one.
# Wait, I can't know the password. I will use manage.py shell to generate a JWT token!
