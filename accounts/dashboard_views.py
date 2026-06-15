from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Sum, Count, F, Q, ExpressionWrapper, DecimalField
from django.utils import timezone
from django.core.cache import cache
from datetime import timedelta, date as date_type
from decimal import Decimal

from products.models import Produit
from commandes.models import Commande
from ventes.models import Vente, LigneVente
from clients.models import Client
from fournisseurs.models import Fournisseur


# Cache key — v6: fixed stock valeur calculation (carton × prix_achat/cpp)
_DASH_CACHE_KEY = 'dashboard_stats_v6'
_DASH_CACHE_TTL = 60  # seconds


def _calc_benefice(date_from, date_to=None):
    """Compute CA, coût and bénéfice for a date range.
    Returns (ca, cout, benefice) as float.
    prix_achat is per palette; coût/carton = prix_achat / cartons_par_palette.
    """
    qs = LigneVente.objects.filter(
        vente__created_at__date__gte=date_from
    ).select_related('produit')
    if date_to:
        qs = qs.filter(vente__created_at__date__lte=date_to)

    ca_total   = Decimal('0')
    cout_total = Decimal('0')
    try:
        for ligne in qs:
            ca_total += ligne.quantite * ligne.prix_unitaire
            cpp = Decimal(str(ligne.produit.cartons_par_palette or 1))
            cout_carton = (ligne.produit.prix_achat or Decimal('0')) / cpp
            cout_total  += ligne.quantite * cout_carton
    except Exception:
        pass  # never crash the dashboard over a bad product

    ca   = round(float(ca_total), 2)
    cout = round(float(cout_total), 2)
    return ca, cout, round(ca - cout, 2)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    cached = cache.get(_DASH_CACHE_KEY)
    if cached is not None:
        return Response(cached)

    today       = timezone.now().date()
    month_start = today.replace(day=1)

    # ── Products ───────────────────────────────────────────────
    # stock_actuel is in CARTONS; prix_achat is per PALETTE.
    # Correct formula: valeur = sum(stock_actuel × (prix_achat / cartons_par_palette))
    produits_qs = Produit.objects.filter(actif=True).only(
        'stock_actuel', 'prix_achat', 'cartons_par_palette'
    )
    total_produits = produits_qs.count()
    valeur_total = Decimal('0')
    for p in produits_qs:
        cpp = Decimal(str(p.cartons_par_palette or 1))
        cout_carton = (p.prix_achat or Decimal('0')) / cpp
        valeur_total += (p.stock_actuel or Decimal('0')) * cout_carton
    produit_agg = {
        'total': total_produits,
        'valeur': valeur_total,
    }
    produits_stock_faible = Produit.objects.filter(
        actif=True, stock_actuel__lte=F('stock_minimum')
    ).count()

    # ── Sales (month) ──────────────────────────────────────────
    ventes_mois = Vente.objects.filter(
        created_at__date__gte=month_start
    ).aggregate(
        count=Count('id'),
        total=Sum('montant_total'),
        detail_total=Sum('montant_total', filter=Q(type_vente='detail')),
        gros_total=Sum('montant_total', filter=Q(type_vente='gros')),
    )

    # ── Bénéfice du mois ───────────────────────────────────────
    _, _, benefice_mois = _calc_benefice(month_start)

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
        'clients':       total_clients,
        'fournisseurs':  total_fournisseurs,
        'sales_chart':   sales_chart,
        'benefice_mois': benefice_mois,
    }

    cache.set(_DASH_CACHE_KEY, data, _DASH_CACHE_TTL)
    return Response(data)


# ── Bénéfices detail endpoint ──────────────────────────────────
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def benefices_detail(request):
    """
    Returns profit breakdown per period.
    Query params:
      date_from (YYYY-MM-DD)  default: first day of current month
      date_to   (YYYY-MM-DD)  default: today
      group_by  day|week|month  default: day
    """
    today = timezone.now().date()

    try:
        date_from = date_type.fromisoformat(request.GET.get('date_from', str(today.replace(day=1))))
    except ValueError:
        date_from = today.replace(day=1)

    try:
        date_to = date_type.fromisoformat(request.GET.get('date_to', str(today)))
    except ValueError:
        date_to = today

    group_by = request.GET.get('group_by', 'day')  # day | week | month

    # Fetch all relevant ligne ventes in range
    lignes = LigneVente.objects.filter(
        vente__created_at__date__gte=date_from,
        vente__created_at__date__lte=date_to,
    ).select_related('produit', 'vente').order_by('vente__created_at')

    # Group by period
    from collections import defaultdict
    buckets = defaultdict(lambda: {'ca': Decimal('0'), 'cout': Decimal('0')})

    for ligne in lignes:
        d = ligne.vente.created_at.date()
        if group_by == 'month':
            key = d.strftime('%Y-%m')
            label = d.strftime('%b %Y')
        elif group_by == 'week':
            # ISO week start (Monday)
            week_start = d - timedelta(days=d.weekday())
            key = str(week_start)
            label = f"Sem. {d.isocalendar()[1]} ({week_start.strftime('%d/%m')})"
        else:
            key = str(d)
            label = d.strftime('%d/%m/%Y')

        cpp = Decimal(str(ligne.produit.cartons_par_palette or 1))
        cout_carton = (ligne.produit.prix_achat or Decimal('0')) / cpp
        buckets[key]['ca']   += ligne.quantite * ligne.prix_unitaire
        buckets[key]['cout'] += ligne.quantite * cout_carton
        buckets[key].setdefault('label', label)

    result = []
    for key in sorted(buckets.keys()):
        b = buckets[key]
        ca   = round(float(b['ca']),   2)
        cout = round(float(b['cout']), 2)
        result.append({
            'period':   key,
            'label':    b.get('label', key),
            'ca':       ca,
            'cout':     cout,
            'benefice': round(ca - cout, 2),
        })

    # Totals
    total_ca   = sum(r['ca'] for r in result)
    total_cout = sum(r['cout'] for r in result)

    return Response({
        'rows':        result,
        'total_ca':    round(total_ca, 2),
        'total_cout':  round(total_cout, 2),
        'total_benefice': round(total_ca - total_cout, 2),
    })
