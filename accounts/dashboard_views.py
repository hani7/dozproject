from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Sum, Count, F, ExpressionWrapper, DecimalField, Q
from django.utils import timezone
from django.core.cache import cache
from datetime import timedelta

from products.models import Produit
from commandes.models import Commande
from ventes.models import Vente, LigneVente
from clients.models import Client
from fournisseurs.models import Fournisseur


# Cache key — v3 includes benefice
_DASH_CACHE_KEY = 'dashboard_stats_v3'
_DASH_CACHE_TTL = 60  # seconds


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    cached = cache.get(_DASH_CACHE_KEY)
    if cached is not None:
        return Response(cached)

    today       = timezone.now().date()
    month_start = today.replace(day=1)

    # ── Products ───────────────────────────────────────────────
    produit_agg = Produit.objects.filter(actif=True).aggregate(
        total=Count('id'),
        valeur=Sum(
            ExpressionWrapper(
                F('stock_actuel') * F('prix_achat'),
                output_field=DecimalField(),
            )
        ),
    )
    produits_stock_faible = Produit.objects.filter(
        actif=True, stock_actuel__lte=F('stock_minimum')
    ).count()

    # ── Sales (month) — Q() required for conditional aggregation ─
    ventes_mois = Vente.objects.filter(
        created_at__date__gte=month_start
    ).aggregate(
        count=Count('id'),
        total=Sum('montant_total'),
        detail_total=Sum('montant_total', filter=Q(type_vente='detail')),
        gros_total=Sum('montant_total', filter=Q(type_vente='gros')),
    )

    # ── Bénéfice du mois: CA ventes - coût d'achat des articles vendus ──
    lignes_mois = LigneVente.objects.filter(
        vente__created_at__date__gte=month_start
    ).select_related('produit').aggregate(
        ca=Sum(
            ExpressionWrapper(F('quantite') * F('prix_unitaire'), output_field=DecimalField())
        ),
        cout=Sum(
            ExpressionWrapper(F('quantite') * F('produit__prix_achat'), output_field=DecimalField())
        ),
    )
    ca   = float(lignes_mois['ca']   or 0)
    cout = float(lignes_mois['cout'] or 0)
    benefice_mois = round(ca - cout, 2)

    # ── Orders — combine Commande + Vente ──────────────────────
    cmd_agg = Commande.objects.aggregate(
        en_attente=Count('id', filter=Q(statut='en_attente')),
        en_livraison=Count('id', filter=Q(statut='en_livraison')),
    )
    vente_agg = Vente.objects.aggregate(
        en_attente=Count('id', filter=Q(statut='en_attente')),
        en_livraison=Count('id', filter=Q(statut='en_livraison')),
    )

    # ── Clients / Fournisseurs ─────────────────────────────────
    total_clients      = Client.objects.count()
    total_fournisseurs = Fournisseur.objects.count()

    # ── 7-day sales chart ──────────────────────────────────────
    seven_days_ago = today - timedelta(days=6)
    daily_sales_qs = Vente.objects.filter(
        created_at__date__gte=seven_days_ago
    ).values('created_at__date').annotate(total=Sum('montant_total'))
    daily_map = {row['created_at__date']: float(row['total'] or 0) for row in daily_sales_qs}

    sales_chart = [
        {
            'date':  (today - timedelta(days=i)).strftime('%d/%m'),
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
            'en_attente':   (cmd_agg['en_attente'] or 0) + (vente_agg['en_attente'] or 0),
            'en_livraison': (cmd_agg['en_livraison'] or 0) + (vente_agg['en_livraison'] or 0),
        },
        'clients':      total_clients,
        'fournisseurs': total_fournisseurs,
        'sales_chart':  sales_chart,
        'benefice_mois': benefice_mois,
    }

    cache.set(_DASH_CACHE_KEY, data, _DASH_CACHE_TTL)
    return Response(data)
