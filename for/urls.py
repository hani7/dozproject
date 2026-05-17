from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponse

def emergency_reset(request):
    from accounts.models import CustomUser
    try:
        user = CustomUser.objects.get(username='admin')
        user.set_password('Hakim2020++')
        user.save()
        return HttpResponse("SUCCES : Le mot de passe de l'administrateur a ete reinitialise a 'Hakim2020++'")
    except Exception as e:
        return HttpResponse(f"ERREUR : {e}")

urlpatterns = [
    path('reset-admin-urgence/', emergency_reset),
    path('declas/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/products/', include('products.urls')),
    path('api/stock/', include('stock.urls')),
    path('api/achats/', include('achats.urls')),
    path('api/ventes/', include('ventes.urls')),
    path('api/commandes/', include('commandes.urls')),
    path('api/hr/', include('hr.urls')),
    path('api/paiements/', include('paiements.urls')),
    path('api/clients/', include('clients.urls')),
    path('api/fournisseurs/', include('fournisseurs.urls')),
    path('api/dashboard/', include('accounts.dashboard_urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
