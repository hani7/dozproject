from rest_framework import serializers
from decimal import Decimal
from .models import Vente, LigneVente


# ── Read serializer (for responses) ────────────────────────────
class LigneVenteSerializer(serializers.ModelSerializer):
    produit_nom = serializers.CharField(source='produit.nom', read_only=True)
    produit_image = serializers.SerializerMethodField()

    class Meta:
        model = LigneVente
        fields = ['id', 'vente', 'produit', 'produit_nom', 'produit_image', 'quantite', 'prix_unitaire', 'sous_total']
        read_only_fields = ['sous_total']

    def get_produit_image(self, obj):
        if obj.produit and obj.produit.image:
            return obj.produit.image.url
        return None

class VenteSerializer(serializers.ModelSerializer):
    lignes           = LigneVenteSerializer(many=True, read_only=True)
    client_nom       = serializers.CharField(source='client.nom', read_only=True)
    client_phone     = serializers.CharField(source='client.phone', read_only=True)
    client_adresse   = serializers.CharField(source='client.adresse', read_only=True)
    client_latitude  = serializers.DecimalField(source='client.latitude', max_digits=9, decimal_places=6, read_only=True)
    client_longitude = serializers.DecimalField(source='client.longitude', max_digits=9, decimal_places=6, read_only=True)
    cree_par_nom     = serializers.CharField(source='cree_par.get_full_name', read_only=True)
    reste_a_payer    = serializers.ReadOnlyField()
    has_retour       = serializers.SerializerMethodField()
    retours          = serializers.SerializerMethodField()
    has_non_conforme = serializers.SerializerMethodField()
    non_conformes    = serializers.SerializerMethodField()

    class Meta:
        model = Vente
        fields = '__all__'

    def get_has_retour(self, obj):
        from stock.models import MouvementStock
        return MouvementStock.objects.filter(
            reference=obj.reference, motif='retour'
        ).exists()

    def get_retours(self, obj):
        from stock.models import MouvementStock
        # Build a price lookup from the vente's lignes
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
        # Use original prix_unitaire stored in current lignes
        prix_par_produit = {l.produit_id: float(l.prix_unitaire) for l in obj.lignes.all()}
        mvts = MouvementStock.objects.filter(
            reference=obj.reference, motif='non_conforme'
        ).select_related('produit').order_by('created_at')
        result = []
        for m in mvts:
            prix = prix_par_produit.get(m.produit_id, 0)
            result.append({
                'produit_nom':    m.produit.nom,
                'produit_id':     m.produit_id,
                'quantite_perdue': float(m.quantite),
                'prix_unitaire':  prix,
                'valeur_perdue':  float(m.quantite) * prix,
                'notes':          m.notes or '',
                'created_at':     m.created_at.strftime('%Y-%m-%d %H:%M') if m.created_at else '',
            })
        return result


# ── Input serializer for ligne items (write) ────────────────────
class LigneVenteInputSerializer(serializers.ModelSerializer):
    class Meta:
        model = LigneVente
        fields = ['produit', 'quantite', 'prix_unitaire']


# ── Create/Update serializer — explicit safe field list ─────────
class VenteCreateSerializer(serializers.ModelSerializer):
    lignes = LigneVenteInputSerializer(many=True)

    class Meta:
        model = Vente
        # Explicit field list — cree_par and livreur are excluded from client input.
        # cree_par is set automatically in perform_create (view layer).
        # livreur can be assigned via a separate admin action if needed.
        fields = [
            'reference', 'type_vente', 'client', 'date',
            'statut', 'mode_paiement', 'montant_paye', 'remise',
            'notes', 'lignes',
        ]

    def create(self, validated_data):
        lignes_data = validated_data.pop('lignes')
        vente = Vente.objects.create(**validated_data)
        total = 0
        for ligne_data in lignes_data:
            ligne = LigneVente.objects.create(vente=vente, **ligne_data)
            total += ligne.sous_total
        # Apply percentage discount
        remise = vente.remise / 100
        vente.montant_total = total * (1 - remise)
        vente.save()
        return vente

    def update(self, instance, validated_data):
        lignes_data = validated_data.pop('lignes', None)
        # Update scalar fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if lignes_data is not None:
            # Replace all lines atomically
            instance.lignes.all().delete()
            total = 0
            for ligne_data in lignes_data:
                ligne = LigneVente.objects.create(vente=instance, **ligne_data)
                total += ligne.sous_total
            remise = instance.remise / 100
            instance.montant_total = total * (1 - remise)
        instance.save()
        return instance
