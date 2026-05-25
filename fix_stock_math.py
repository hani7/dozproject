import re

# FIX COMMANDES VIEWS
with open('commandes/views.py', 'r', encoding='utf-8') as f:
    content = f.read()

retour_search = """                # Trace le retour dans les mouvements de stock sans modifier stock_actuel (déjà pris en compte par la réduction de quantité)
                from stock.models import MouvementStock
                from products.models import Produit
                produit = Produit.objects.only('stock_actuel').get(pk=ligne.produit_id)
                MouvementStock.objects.create(
                    produit_id=ligne.produit_id,
                    type_mouvement='entree',
                    motif='retour',
                    quantite=qte,
                    stock_avant=produit.stock_actuel,
                    stock_apres=produit.stock_actuel,
                    reference=commande.reference,
                    notes=f"Retour de {qte} carton(s) — Commande {commande.reference}",
                    cree_par=request.user,
                )"""

retour_replace = """                from stock.models import MouvementStock
                from products.models import Produit
                
                stock_deduit = MouvementStock.objects.filter(reference=commande.reference, type_mouvement='sortie', motif='vente').exists()
                if stock_deduit:
                    Produit.objects.filter(pk=ligne.produit_id).update(stock_actuel=F('stock_actuel') + qte)
                    produit = Produit.objects.only('stock_actuel').get(pk=ligne.produit_id)
                    MouvementStock.objects.create(
                        produit_id=ligne.produit_id,
                        type_mouvement='entree',
                        motif='retour',
                        quantite=qte,
                        stock_avant=produit.stock_actuel - qte,
                        stock_apres=produit.stock_actuel,
                        reference=commande.reference,
                        notes=f"Retour de {qte} carton(s) — Commande {commande.reference}",
                        cree_par=request.user,
                    )"""

non_conforme_search = """                # Sortie de stock immédiate pour produit cassé (perte)
                Produit.objects.filter(pk=ligne.produit_id).update(
                    stock_actuel=F('stock_actuel') - qte
                )
                produit = Produit.objects.only('stock_actuel').get(pk=ligne.produit_id)
                MouvementStock.objects.create(
                    produit_id=ligne.produit_id,
                    type_mouvement='sortie',
                    motif='non_conforme',
                    quantite=qte,
                    stock_avant=produit.stock_actuel + qte,
                    stock_apres=produit.stock_actuel,
                    reference=commande.reference,
                    notes=f"Produit non conforme — Commande {commande.reference}",
                    cree_par=request.user,
                )"""

non_conforme_replace = """                stock_deduit = MouvementStock.objects.filter(reference=commande.reference, type_mouvement='sortie', motif='vente').exists()
                
                if stock_deduit:
                    # Reverse the sale first so math works out
                    Produit.objects.filter(pk=ligne.produit_id).update(stock_actuel=F('stock_actuel') + qte)
                    p_temp = Produit.objects.only('stock_actuel').get(pk=ligne.produit_id)
                    MouvementStock.objects.create(
                        produit_id=ligne.produit_id,
                        type_mouvement='entree',
                        motif='retour',
                        quantite=qte,
                        stock_avant=p_temp.stock_actuel - qte,
                        stock_apres=p_temp.stock_actuel,
                        reference=commande.reference,
                        notes=f"Retour (avant perte) — Commande {commande.reference}",
                        cree_par=request.user,
                    )

                # Now deduct for the loss
                Produit.objects.filter(pk=ligne.produit_id).update(stock_actuel=F('stock_actuel') - qte)
                produit = Produit.objects.only('stock_actuel').get(pk=ligne.produit_id)
                MouvementStock.objects.create(
                    produit_id=ligne.produit_id,
                    type_mouvement='sortie',
                    motif='non_conforme',
                    quantite=qte,
                    stock_avant=produit.stock_actuel + qte,
                    stock_apres=produit.stock_actuel,
                    reference=commande.reference,
                    notes=f"Produit non conforme — Commande {commande.reference}",
                    cree_par=request.user,
                )"""

content = content.replace(retour_search, retour_replace)
content = content.replace(non_conforme_search, non_conforme_replace)

with open('commandes/views.py', 'w', encoding='utf-8') as f:
    f.write(content)

# FIX VENTES VIEWS
with open('ventes/views.py', 'r', encoding='utf-8') as f:
    content2 = f.read()

v_non_conforme_search = """                # Produit perdu — déduire du stock SANS retour
                Produit.objects.filter(pk=ligne.produit_id).update(
                    stock_actuel=F('stock_actuel') - qte
                )
                produit = Produit.objects.only('stock_actuel').get(pk=ligne.produit_id)

                MouvementStock.objects.create(
                    produit_id=ligne.produit_id,
                    type_mouvement='sortie',
                    motif='non_conforme',
                    quantite=qte,
                    stock_avant=produit.stock_actuel + qte,
                    stock_apres=produit.stock_actuel,
                    reference=vente.reference,
                    notes=f"Déclaration non-conforme — {qte} carton(s) perdu(s) — Vente {vente.reference}",
                    cree_par=request.user,
                )"""

v_non_conforme_replace = """                # 1. Reverse the sale first to avoid double deduction
                Produit.objects.filter(pk=ligne.produit_id).update(stock_actuel=F('stock_actuel') + qte)
                p_temp = Produit.objects.only('stock_actuel').get(pk=ligne.produit_id)
                MouvementStock.objects.create(
                    produit_id=ligne.produit_id,
                    type_mouvement='entree',
                    motif='retour',
                    quantite=qte,
                    stock_avant=p_temp.stock_actuel - qte,
                    stock_apres=p_temp.stock_actuel,
                    reference=vente.reference,
                    notes=f"Retour (avant perte) — Vente {vente.reference}",
                    cree_par=request.user,
                )

                # 2. Now log the actual loss
                Produit.objects.filter(pk=ligne.produit_id).update(stock_actuel=F('stock_actuel') - qte)
                produit = Produit.objects.only('stock_actuel').get(pk=ligne.produit_id)
                MouvementStock.objects.create(
                    produit_id=ligne.produit_id,
                    type_mouvement='sortie',
                    motif='non_conforme',
                    quantite=qte,
                    stock_avant=produit.stock_actuel + qte,
                    stock_apres=produit.stock_actuel,
                    reference=vente.reference,
                    notes=f"Déclaration non-conforme — {qte} carton(s) perdu(s) — Vente {vente.reference}",
                    cree_par=request.user,
                )"""

content2 = content2.replace(v_non_conforme_search, v_non_conforme_replace)

with open('ventes/views.py', 'w', encoding='utf-8') as f:
    f.write(content2)

print("Backend fixes applied.")
