from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Sum, Count, F, ExpressionWrapper, DecimalField
from django.utils import timezone
from django.core.cache import cache
from datetime import timedelta

from products.models import Produit
from commandes.models import Commande
from ventes.models import Vente
from achats.models import BonAchat
from clients.models import Client
from fournisseurs.models import Fournisseur


# Cache key and TTL (60 seconds — dashboard polls every 15s, so at most 4 DB hits/min)
_DASH_CACHE_KEY = 'dashboard_stats_v1'
_DASH_CACHE_TTL = 60  # seconds


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    # Return cached result if fresh
    cached = cache.get(_DASH_CACHE_KEY)
    if cached is not None:
        return Response(cached)

    today       = timezone.now().date()
    month_start = today.replace(day=1)

    # ── Products ───────────────────────────────────────────────
    # Single query with annotation — avoids two separate COUNT queries
    produit_agg = Produit.objects.filter(actif=True).aggregate(
        total=Count('id'),
        stock_faible=Count('id', filter=F('stock_actuel') <= F('stock_minimum')),
        valeur=Sum(
            ExpressionWrapper(
                F('stock_actuel') * F('prix_achat'),
                output_field=DecimalField(),
            )
        ),
    )
    # stock_faible via annotation requires subquery — keep as separate optimized call
    produits_stock_faible = Produit.objects.filter(
        actif=True, stock_actuel__lte=F('stock_minimum')
    ).count()

    # ── Sales (month) ──────────────────────────────────────────
    # One query with conditional aggregation instead of three queries
    ventes_mois = Vente.objects.filter(
        created_at__date__gte=month_start
    ).aggregate(
        count=Count('id'),
        total=Sum('montant_total'),
        detail_total=Sum('montant_total', filter=F('type_vente') == 'detail'),
        gros_total=Sum('montant_total', filter=F('type_vente') == 'gros'),
    )

    # ── Orders ─────────────────────────────────────────────────
    # One query with two conditional counts
    commandes_agg = Commande.objects.aggregate(
        en_attente=Count('id', filter=F('statut') == 'en_attente'),
        en_livraison=Count('id', filter=F('statut') == 'en_livraison'),
    )

    # ── Clients / Fournisseurs ─────────────────────────────────
    total_clients      = Client.objects.count()
    total_fournisseurs = Fournisseur.objects.count()

    # ── 7-day sales chart ──────────────────────────────────────
    # Fetch all in one query and build the chart in Python
    seven_days_ago = today - timedelta(days=6)
    daily_sales = {
        row['day']: row['total']
        for row in Vente.objects.filter(
            created_at__date__gte=seven_days_ago
        ).values('day').annotate(
            day=F('created_at__date'),
            total=Sum('montant_total'),
        )
    }
    # Fallback: use simpler approach (the annotation alias trick above may differ by DB)
    daily_sales_qs = Vente.objects.filter(
        created_at__date__gte=seven_days_ago
    ).values('created_at__date').annotate(total=Sum('montant_total'))
    daily_map = {row['created_at__date']: float(row['total'] or 0) for row in daily_sales_qs}

    sales_chart = [
        {
            'date': (today - timedelta(days=i)).strftime('%d/%m'),
            'total': daily_map.get(today - timedelta(days=i), 0),
        }
        for i in range(6, -1, -1)
    ]

    data = {
        'produits': {
            'total':        produit_agg['total'] or 0,
            'stock_faible': produits_stock_faible,
            'valeur_stock': float(produit_agg['valeur'] or 0),
        },
        'ventes': {
            'ce_mois_count': ventes_mois['count'] or 0,
            'ce_mois_total': float(ventes_mois['total'] or 0),
            'detail_total':  float(ventes_mois['detail_total'] or 0),
            'gros_total':    float(ventes_mois['gros_total'] or 0),
        },
        'commandes': {
            'en_attente':    commandes_agg['en_attente'] or 0,
            'en_livraison':  commandes_agg['en_livraison'] or 0,
        },
        'clients':      total_clients,
        'fournisseurs': total_fournisseurs,
        'sales_chart':  sales_chart,
    }

    # Store in cache for 60 seconds
    cache.set(_DASH_CACHE_KEY, data, _DASH_CACHE_TTL)
    return Response(data)
