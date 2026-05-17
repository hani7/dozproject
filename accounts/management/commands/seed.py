from django.core.management.base import BaseCommand
from django.utils import timezone
import random
from datetime import date, timedelta


class Command(BaseCommand):
    help = 'Seed database with demo data'

    def handle(self, *args, **kwargs):
        from accounts.models import CustomUser
        from products.models import Produit
        from clients.models import Client
        from fournisseurs.models import Fournisseur
        from hr.models import Employe

        self.stdout.write('[*] Seeding database...')

        # --- Users ---
        users_to_create = [
            {
                'username': 'admin', 'role': 'admin', 'specialite': 'les_deux',
                'first_name': 'Karim', 'last_name': 'Administrateur', 'phone': '0555000001',
                'superuser': True, 'password': 'admin123',
            },
            {
                'username': 'prevendeur_detail', 'role': 'prevendeur', 'specialite': 'detail',
                'first_name': 'Yacine', 'last_name': 'Boudiaf', 'phone': '0555000002',
                'superuser': False, 'password': 'demo123',
            },
            {
                'username': 'prevendeur_gros', 'role': 'prevendeur', 'specialite': 'gros',
                'first_name': 'Redha', 'last_name': 'Mekki', 'phone': '0555000003',
                'superuser': False, 'password': 'demo123',
            },
            {
                'username': 'livreur_detail', 'role': 'livreur', 'specialite': 'detail',
                'first_name': 'Hichem', 'last_name': 'Aouadi', 'phone': '0555000004',
                'superuser': False, 'password': 'demo123',
            },
            {
                'username': 'livreur_gros', 'role': 'livreur', 'specialite': 'gros',
                'first_name': 'Mourad', 'last_name': 'Benali', 'phone': '0555000005',
                'superuser': False, 'password': 'demo123',
            },
        ]
        for ud in users_to_create:
            if not CustomUser.objects.filter(username=ud['username']).exists():
                if ud['superuser']:
                    u = CustomUser.objects.create_superuser(ud['username'], f"{ud['username']}@detergpro.dz", ud['password'])
                else:
                    u = CustomUser.objects.create_user(ud['username'], password=ud['password'])
                u.role = ud['role']
                u.specialite = ud['specialite']
                u.first_name = ud['first_name']
                u.last_name = ud['last_name']
                u.phone = ud['phone']
                u.save()
                self.stdout.write(f'[OK] User cree: {ud["username"]} / {ud["password"]} ({ud["role"]}, {ud["specialite"]})')
            else:
                # Update existing users to add specialite
                u = CustomUser.objects.get(username=ud['username'])
                if u.specialite == 'les_deux' and ud['specialite'] != 'les_deux':
                    u.specialite = ud['specialite']
                    u.save()
                    self.stdout.write(f'[OK] Updated specialite for {ud["username"]} -> {ud["specialite"]}')

        # --- Products ---
        produits_data = [
            # nom, code, cartons_par_palette, prix_achat, prix_detail, prix_gros, stock, stock_min
            ('Omo Matic 5kg', 'OMO-5KG', 2, 850, 950, 880, 120, 20),
            ('Omo Matic 10kg', 'OMO-10KG', 2, 1600, 1800, 1680, 80, 15),
            ('Persil Color 5kg', 'PRS-5KG', 2, 900, 1000, 930, 100, 20),
            ('Tide 3kg', 'TID-3KG', 4, 520, 600, 550, 60, 10),
            ('Skip Liquide 2L', 'SKP-2L', 6, 380, 450, 400, 90, 15),
            ('Ariel Liquide 1L', 'ARL-1L', 6, 280, 340, 295, 150, 25),
            ('Pril Citron 750ml', 'PRL-750', 12, 85, 110, 92, 200, 50),
            ('Fairy Concentré 1L', 'FAI-1L', 12, 150, 190, 160, 180, 40),
            ('Ajax Multi-Surface 1L', 'AJX-1L', 12, 120, 155, 130, 120, 30),
            ('Flash Nettoyant 750ml', 'FLS-750', 12, 95, 125, 105, 100, 25),
            ('Javel Eau 1L', 'JAV-1L', 15, 45, 65, 50, 300, 60),
            ('Domestos 750ml', 'DOM-750', 12, 130, 170, 140, 90, 20),
            ('Lenor 1L', 'LNR-1L', 12, 220, 280, 240, 80, 15),
            ('Soupline 750ml', 'SLP-750', 12, 140, 185, 155, 120, 20),
        ]
        for nom, code, cpp, prix_achat, prix_detail, prix_gros, stock, stock_min in produits_data:
            Produit.objects.get_or_create(
                code=code,
                defaults={
                    'nom': nom,
                    'cartons_par_palette': cpp,
                    'prix_achat': prix_achat,
                    'prix_detail': prix_detail,
                    'prix_gros': prix_gros,
                    'stock_actuel': stock,
                    'stock_minimum': stock_min,
                }
            )
        self.stdout.write(f'[OK] {len(produits_data)} produits crees')

        # --- Clients ---
        clients_data = [
            ('Épicerie El Amine', 'detail', '0661000001', 'Rue Didouche Mourad, Alger', 'Alger'),
            ('Supermarché Al Baraka', 'gros', '0661000002', 'Cité 500 logts, Oran', 'Oran'),
            ('Commerce Ben Ali', 'detail', '0661000003', 'Marché Central, Constantine', 'Constantine'),
            ('Grossiste Maghreb', 'gros', '0661000004', 'Zone Industrielle, Sétif', 'Sétif'),
            ('Épicerie Safia', 'detail', '0661000005', 'Avenue Ben Boulaïd, Batna', 'Batna'),
            ('Distribution Ouest', 'gros', '0661000006', 'Route Nationale, Tlemcen', 'Tlemcen'),
            ('Mini Marché Karima', 'detail', '0661000007', 'Cité Benyahia, Blida', 'Blida'),
            ('Commerce Youcef', 'detail', '0661000008', 'Centre-ville, Annaba', 'Annaba'),
        ]
        for nom, type_c, phone, adresse, wilaya in clients_data:
            Client.objects.get_or_create(
                nom=nom,
                defaults={
                    'type_client': type_c,
                    'phone': phone,
                    'adresse': adresse,
                    'wilaya': wilaya,
                }
            )
        self.stdout.write(f'[OK] {len(clients_data)} clients crees')

        # --- Fournisseurs ---
        fournisseurs_data = [
            ('SARL Detergex Algérie', '0770000001', 'Zone Industrielle Rouiba, Alger', 'Alger', 'M. Benali'),
            ('Import Export Maghreb', '0770000002', 'Port d\'Oran', 'Oran', 'Mme. Fatima'),
            ('SPA ProClean', '0770000003', 'Rue Arbaoui, Constantine', 'Constantine', 'M. Hamza'),
            ('Détergents du Nord', '0770000004', 'Avenue de la Paix, Annaba', 'Annaba', 'M. Tarek'),
        ]
        for nom, phone, adresse, wilaya, contact in fournisseurs_data:
            Fournisseur.objects.get_or_create(
                nom=nom,
                defaults={
                    'phone': phone,
                    'adresse': adresse,
                    'wilaya': wilaya,
                    'contact_nom': contact,
                }
            )
        self.stdout.write(f'[OK] {len(fournisseurs_data)} fournisseurs crees')

        # --- Employees ---
        employes_data = [
            ('Boudiaf', 'Yacine', 'prevendeur', '0661100001', 55000),
            ('Aouadi', 'Hichem', 'livreur', '0661100002', 45000),
            ('Meziane', 'Samira', 'comptable', '0661100003', 65000),
            ('Khaldi', 'Omar', 'magasinier', '0661100004', 40000),
        ]
        for nom, prenom, poste, phone, salaire in employes_data:
            Employe.objects.get_or_create(
                nom=nom, prenom=prenom,
                defaults={
                    'poste': poste,
                    'phone': phone,
                    'salaire_base': salaire,
                    'date_embauche': date(2024, 1, 1),
                }
            )
        self.stdout.write(f'[OK] {len(employes_data)} employes crees')

        self.stdout.write(self.style.SUCCESS('\nSeed termine avec succes!'))
        self.stdout.write('\nComptes de connexion:')
        self.stdout.write('  [Admin]      admin / admin123')
        self.stdout.write('  [Prevendeur] prevendeur1 / demo123')
        self.stdout.write('  [Livreur]    livreur1 / demo123')
