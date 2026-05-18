from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse


def health_check(request):
    return JsonResponse({'status': 'ok', 'service': 'ForCli API'})


def run_setup(request):
    """ONE-TIME setup: runs migrations. Remove after use."""
    token = request.GET.get('token', '')
    if token != 'baitul2025setup':
        return JsonResponse({'error': 'unauthorized'}, status=403)
    results = []
    try:
        from django.core.management import call_command
        from io import StringIO
        out = StringIO()
        call_command('migrate', '--noinput', stdout=out, stderr=out)
        results.append({'migrate': out.getvalue()})
    except Exception as e:
        results.append({'migrate_error': str(e)})
    try:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        count = User.objects.count()
        results.append({'users_count': count})
    except Exception as e:
        results.append({'users_error': str(e)})
    return JsonResponse({'status': 'done', 'results': results})


urlpatterns = [
    path('declas/', admin.site.urls),
    path('api/health/', health_check, name='health_check'),
    path('api/setup/', run_setup, name='run_setup'),   # TEMPORARY — remove after migration
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
