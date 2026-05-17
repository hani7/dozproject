from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
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
