from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Sum, Count, Q
from django.utils import timezone
from datetime import timedelta

from products.models import Produit
from commandes.models import Commande
from ventes.models import Vente
from achats.models import BonAchat
from clients.models import Client
from fournisseurs.models import Fournisseur


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    today = timezone.now().date()
    month_start = today.replace(day=1)

    # Actually compute correctly
    from django.db.models import F
    total_produits = Produit.objects.filter(actif=True).count()
    produits_stock_faible = Produit.objects.filter(
        actif=True, stock_actuel__lte=F('stock_minimum')
    ).count()

    # Sales stats this month
    ventes_mois = Vente.objects.filter(
        created_at__date__gte=month_start
    ).aggregate(
        count=Count('id'),
        total=Sum('montant_total')
    )

    ventes_detail_mois = Vente.objects.filter(
        created_at__date__gte=month_start, type_vente='detail'
    ).aggregate(total=Sum('montant_total'))

    ventes_gros_mois = Vente.objects.filter(
        created_at__date__gte=month_start, type_vente='gros'
    ).aggregate(total=Sum('montant_total'))

    # Orders stats
    commandes_en_attente = Commande.objects.filter(statut='en_attente').count()
    commandes_en_livraison = Commande.objects.filter(statut='en_livraison').count()

    # Clients / Fournisseurs
    total_clients = Client.objects.count()
    total_fournisseurs = Fournisseur.objects.count()

    # Stock value
    from django.db.models import ExpressionWrapper, DecimalField
    stock_value = Produit.objects.filter(actif=True).aggregate(
        valeur=Sum(
            ExpressionWrapper(
                F('stock_actuel') * F('prix_achat'),
                output_field=DecimalField()
            )
        )
    )

    # Recent 7 days sales chart
    sales_chart = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        day_sales = Vente.objects.filter(created_at__date=day).aggregate(
            total=Sum('montant_total')
        )
        sales_chart.append({
            'date': day.strftime('%d/%m'),
            'total': float(day_sales['total'] or 0)
        })

    return Response({
        'produits': {
            'total': total_produits,
            'stock_faible': produits_stock_faible,
            'valeur_stock': float(stock_value['valeur'] or 0),
        },
        'ventes': {
            'ce_mois_count': ventes_mois['count'] or 0,
            'ce_mois_total': float(ventes_mois['total'] or 0),
            'detail_total': float(ventes_detail_mois['total'] or 0),
            'gros_total': float(ventes_gros_mois['total'] or 0),
        },
        'commandes': {
            'en_attente': commandes_en_attente,
            'en_livraison': commandes_en_livraison,
        },
        'clients': total_clients,
        'fournisseurs': total_fournisseurs,
        'sales_chart': sales_chart,
    })
