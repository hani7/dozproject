import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'for.settings')
django.setup()

from django.db.models import Sum, Count
from ventes.models import Vente
from commandes.models import Commande

print("=== VENTES ===")
qs_v = Vente.objects.all()
print(f"Total Ventes count: {qs_v.count()}")
for v in qs_v:
    print(f"Vente {v.id}: montant={v.montant_total}, paye={v.montant_paye}, statut={v.statut}, type={v.type_vente}")

print("\n=== COMMANDES ===")
qs_c = Commande.objects.all()
print(f"Total Commandes count: {qs_c.count()}")
for c in qs_c:
    print(f"Commande {c.id}: montant={c.montant_total}, paye={c.montant_paye}, statut={c.statut}, type={c.type_commande}")
