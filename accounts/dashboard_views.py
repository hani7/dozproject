from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Sum, Count, F, Q, ExpressionWrapper, DecimalField
from django.utils import timezone
from django.core.cache import cache
from datetime import timedelta, date as date_type
from decimal import Decimal

from products.models import Produit
from commandes.models import Commande, LigneCommande
from ventes.models import Vente, LigneVente
from clients.models import Client
from fournisseurs.models import Fournisseur


# Cache TTL — keyed per date range so different periods are cached independently
_DASH_CACHE_TTL = 30  # seconds


def _calc_benefice(date_from, date_to=None):
    """Compute CA, coût and bénéfice for a date range.
    Returns (ca, cout, benefice) as float.
    prix_achat is per palette; coût/carton = prix_achat / cartons_par_palette.
    """
    qs_v = LigneVente.objects.filter(
        vente__created_at__date__gte=date_from
    ).exclude(vente__statut__in=['annulee', 'brouillon']).select_related('produit')
    
    qs_c = LigneCommande.objects.filter(
        commande__created_at__date__gte=date_from
    ).exclude(commande__statut='annulee').select_related('produit')

    if date_to:
        qs_v = qs_v.filter(vente__created_at__date__lte=date_to)
        qs_c = qs_c.filter(commande__created_at__date__lte=date_to)

    ca_total   = Decimal('0')
    cout_total = Decimal('0')
    try:
        for ligne in qs_v:
            ca_total += ligne.quantite * ligne.prix_unitaire
            cpp = Decimal(str(ligne.produit.cartons_par_palette or 1))
            cout_carton = (ligne.produit.prix_achat or Decimal('0')) / cpp
            cout_total  += ligne.quantite * cout_carton
            
        for ligne in qs_c:
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
    today       = timezone.now().date()
    month_start = today.replace(day=1)

    # ── Optional date filter params (used by Statistiques page) ──
    try:
        date_from = date_type.fromisoformat(request.GET.get('date_from', str(month_start)))
    except ValueError:
        date_from = month_start
    try:
        date_to = date_type.fromisoformat(request.GET.get('date_to', str(today)))
    except ValueError:
        date_to = today

    # Cache key includes the date range so each period is cached independently
    cache_key = f'dashboard_stats_v8_{date_from}_{date_to}'
    cached = cache.get(cache_key)
    if cached is not None:
        return Response(cached)

    # ── Products (always current — not date-filtered) ──────────
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

    # ── Sales — filtered by date_from / date_to ────────────────
    ventes_mois = Vente.objects.filter(
        created_at__date__gte=date_from,
        created_at__date__lte=date_to,
    ).exclude(statut__in=['annulee', 'brouillon']).aggregate(
        count=Count('id'),
        total=Sum('montant_total'),
        paye=Sum('montant_paye'),
        detail_total=Sum('montant_total', filter=Q(type_vente='detail')),
        gros_total=Sum('montant_total', filter=Q(type_vente='gros')),
    )

    cmds_mois = Commande.objects.filter(
        created_at__date__gte=date_from,
        created_at__date__lte=date_to,
    ).exclude(statut='annulee').aggregate(
        count=Count('id'),
        total=Sum('montant_total'),
        paye=Sum('montant_paye'),
        detail_total=Sum('montant_total', filter=Q(type_commande='detail')),
        gros_total=Sum('montant_total', filter=Q(type_commande='gros')),
    )

    t_count  = (ventes_mois['count'] or 0) + (cmds_mois['count'] or 0)
    t_total  = (ventes_mois['total'] or Decimal('0')) + (cmds_mois['total'] or Decimal('0'))
    t_paye   = (ventes_mois['paye'] or Decimal('0')) + (cmds_mois['paye'] or Decimal('0'))
    t_detail = (ventes_mois['detail_total'] or Decimal('0')) + (cmds_mois['detail_total'] or Decimal('0'))
    t_gros   = (ventes_mois['gros_total'] or Decimal('0')) + (cmds_mois['gros_total'] or Decimal('0'))

    # ── Bénéfice sur la période ────────────────────────────────
    _, _, benefice_mois = _calc_benefice(date_from, date_to)

    # ── Orders status — always all (current state) ──────────────
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

    # ── 7-day sales chart (always last 7 days) ─────────────────
    seven_days_ago = today - timedelta(days=6)

    daily_v = Vente.objects.filter(
        created_at__date__gte=seven_days_ago
    ).exclude(statut__in=['annulee', 'brouillon']).values('created_at__date').annotate(total=Sum('montant_total'))

    daily_c = Commande.objects.filter(
        created_at__date__gte=seven_days_ago
    ).exclude(statut='annulee').values('created_at__date').annotate(total=Sum('montant_total'))

    daily_map = {}
    for row in daily_v:
        d = row['created_at__date']
        daily_map[d] = daily_map.get(d, 0) + float(row['total'] or 0)
    for row in daily_c:
        d = row['created_at__date']
        daily_map[d] = daily_map.get(d, 0) + float(row['total'] or 0)

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
            'ce_mois_count': t_count,
            'ce_mois_total': float(t_total),
            'ce_mois_paye':  float(t_paye),
            'detail_total':  float(t_detail),
            'gros_total':    float(t_gros),
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

    cache.set(cache_key, data, _DASH_CACHE_TTL)
    return Response(data)


# ── Bénéfices detail endpoint ──────────────────────────────────
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def benefices_detail(request):
    """
    Returns profit breakdown per period.
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

    group_by = request.GET.get('group_by', 'day')

    lignes_v = LigneVente.objects.filter(
        vente__created_at__date__gte=date_from,
        vente__created_at__date__lte=date_to,
    ).exclude(vente__statut__in=['annulee', 'brouillon']).select_related('produit', 'vente').order_by('vente__created_at')
    
    lignes_c = LigneCommande.objects.filter(
        commande__created_at__date__gte=date_from,
        commande__created_at__date__lte=date_to,
    ).exclude(commande__statut='annulee').select_related('produit', 'commande').order_by('commande__created_at')

    from collections import defaultdict
    buckets = defaultdict(lambda: {'ca': Decimal('0'), 'cout': Decimal('0')})

    def process_lignes(lignes, is_vente=True):
        for ligne in lignes:
            parent = ligne.vente if is_vente else ligne.commande
            d = parent.created_at.date()
            if group_by == 'month':
                key = d.strftime('%Y-%m')
                label = d.strftime('%b %Y')
            elif group_by == 'week':
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

    process_lignes(lignes_v, True)
    process_lignes(lignes_c, False)

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

    total_ca   = sum(r['ca'] for r in result)
    total_cout = sum(r['cout'] for r in result)

    return Response({
        'rows':        result,
        'total_ca':    round(total_ca, 2),
        'total_cout':  round(total_cout, 2),
        'total_benefice': round(total_ca - total_cout, 2),
    })
