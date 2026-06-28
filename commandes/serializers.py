from rest_framework import serializers
from .models import Commande, LigneCommande
from accounts.serializers import UserSerializer


# ── Light ligne serializer for list (no image, faster) ───────────
class LigneCommandeListSerializer(serializers.ModelSerializer):
    produit_nom = serializers.CharField(source='produit.nom', read_only=True)

    class Meta:
        model = LigneCommande
        fields = ['id', 'produit', 'produit_nom', 'quantite', 'prix_unitaire', 'sous_total']
        read_only_fields = ['sous_total']


class LigneCommandeSerializer(serializers.ModelSerializer):
    produit_nom = serializers.CharField(source='produit.nom', read_only=True)
    produit_image = serializers.SerializerMethodField()

    class Meta:
        model = LigneCommande
        fields = ['id', 'produit', 'produit_nom', 'produit_image', 'quantite', 'prix_unitaire', 'sous_total']
        read_only_fields = ['sous_total']

    def get_produit_image(self, obj):
        if obj.produit and obj.produit.image:
            return obj.produit.image.url
        return None

class LigneCommandeInputSerializer(serializers.ModelSerializer):
    """Used only for writing — excludes commande (set automatically)"""
    class Meta:
        model = LigneCommande
        fields = ['produit', 'quantite', 'prix_unitaire']


# ── Lightweight list serializer (NO N+1 queries) ─────────────────
class CommandeListSerializer(serializers.ModelSerializer):
    """Fast serializer for list view — no extra SQL per row."""
    lignes           = LigneCommandeListSerializer(many=True, read_only=True)
    client_nom       = serializers.CharField(source='client.nom', read_only=True)
    client_phone     = serializers.CharField(source='client.phone', read_only=True)
    client_adresse   = serializers.CharField(source='client.adresse', read_only=True)
    client_latitude  = serializers.DecimalField(source='client.latitude', max_digits=9, decimal_places=6, read_only=True, allow_null=True)
    client_longitude = serializers.DecimalField(source='client.longitude', max_digits=9, decimal_places=6, read_only=True, allow_null=True)
    prevendeur_nom   = serializers.SerializerMethodField()
    livreur_nom      = serializers.SerializerMethodField()
    reste_a_payer    = serializers.ReadOnlyField()

    class Meta:
        model = Commande
        fields = [
            'id', 'reference', 'type_commande', 'statut', 'created_at',
            'client', 'client_nom', 'client_phone', 'client_adresse',
            'client_latitude', 'client_longitude',
            'prevendeur', 'prevendeur_nom', 'livreur', 'livreur_nom',
            'montant_total', 'montant_paye', 'reste_a_payer',
            'notes', 'lignes',
        ]

    def get_prevendeur_nom(self, obj):
        return obj.prevendeur.get_full_name() if obj.prevendeur else ''

    def get_livreur_nom(self, obj):
        return obj.livreur.get_full_name() if obj.livreur else ''


class CommandeSerializer(serializers.ModelSerializer):
    lignes = LigneCommandeSerializer(many=True, read_only=True)
    client_nom = serializers.CharField(source='client.nom', read_only=True)
    client_phone = serializers.CharField(source='client.phone', read_only=True)
    client_adresse = serializers.CharField(source='client.adresse', read_only=True)
    client_latitude = serializers.DecimalField(source='client.latitude', max_digits=9, decimal_places=6, read_only=True)
    client_longitude = serializers.DecimalField(source='client.longitude', max_digits=9, decimal_places=6, read_only=True)
    prevendeur_nom = serializers.SerializerMethodField()
    livreur_nom = serializers.SerializerMethodField()
    has_retour       = serializers.SerializerMethodField()
    retours          = serializers.SerializerMethodField()
    has_non_conforme = serializers.SerializerMethodField()
    non_conformes    = serializers.SerializerMethodField()

    class Meta:
        model = Commande
        fields = '__all__'

    def get_prevendeur_nom(self, obj):
        return obj.prevendeur.get_full_name() if obj.prevendeur else ''

    def get_livreur_nom(self, obj):
        return obj.livreur.get_full_name() if obj.livreur else ''

    def get_has_retour(self, obj):
        from stock.models import MouvementStock
        return MouvementStock.objects.filter(
            reference=obj.reference, motif='retour'
        ).exists()

    def get_retours(self, obj):
        from stock.models import MouvementStock
        prix_par_produit = {l.produit_id: float(l.prix_unitaire) for l in obj.lignes.all()}
        mvts = MouvementStock.objects.filter(
            reference=obj.reference, motif='retour'
        ).select_related('produit').order_by('created_at')
        result = []
        for m in mvts:
            prix = prix_par_produit.get(m.produit_id, 0)
            result.append({
                'produit_nom':        m.produit.nom,
                'produit_id':         m.produit_id,
                'quantite_retournee': float(m.quantite),
                'prix_unitaire':      prix,
                'montant_retourne':   float(m.quantite) * prix,
                'notes':              m.notes or '',
                'created_at':         m.created_at.strftime('%Y-%m-%d %H:%M') if m.created_at else '',
            })
        return result

    def get_has_non_conforme(self, obj):
        from stock.models import MouvementStock
        return MouvementStock.objects.filter(
            reference=obj.reference, motif='non_conforme'
        ).exists()

    def get_non_conformes(self, obj):
        from stock.models import MouvementStock
        prix_par_produit = {l.produit_id: float(l.prix_unitaire) for l in obj.lignes.all()}
        mvts = MouvementStock.objects.filter(
            reference=obj.reference, motif='non_conforme'
        ).select_related('produit').order_by('created_at')
        result = []
        for m in mvts:
            prix = prix_par_produit.get(m.produit_id, 0)
            result.append({
                'produit_nom':     m.produit.nom,
                'produit_id':      m.produit_id,
                'quantite_perdue': float(m.quantite),
                'prix_unitaire':   prix,
                'valeur_perdue':   float(m.quantite) * prix,
                'notes':           m.notes or '',
                'created_at':      m.created_at.strftime('%Y-%m-%d %H:%M') if m.created_at else '',
            })
        return result


class CommandeCreateSerializer(serializers.ModelSerializer):
    lignes = LigneCommandeInputSerializer(many=True)

    class Meta:
        model = Commande
        fields = ['client', 'type_commande', 'lignes', 'notes', 'date_livraison_souhaitee', 'montant_paye', 'statut']

    def create(self, validated_data):
        lignes_data = validated_data.pop('lignes')
        commande = Commande.objects.create(**validated_data)
        total = 0
        for ligne_data in lignes_data:
            ligne = LigneCommande.objects.create(commande=commande, **ligne_data)
            total += ligne.sous_total
        commande.montant_total = total
        commande.save()
        return commande

    def update(self, instance, validated_data):
        lignes_data = validated_data.pop('lignes', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if lignes_data is not None:
            instance.lignes.all().delete()
            total = 0
            for ligne_data in lignes_data:
                ligne = LigneCommande.objects.create(commande=instance, **ligne_data)
                total += ligne.sous_total
            instance.montant_total = total
        instance.save()
        return instance
