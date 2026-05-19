import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import { useLang } from '@/contexts/LangContext';
import api from '@/lib/api';
import API_URL from '@/lib/config';
import toast from 'react-hot-toast';
import { CheckCircle, MapPin, Phone, Package, Navigation, Truck, RefreshCw, Search } from 'lucide-react';
import type { Order } from '@/lib/types';

const MEDIA_BASE = API_URL.replace('/api', '');

export default function LivraisonsPage() {
  const { lang } = useLang();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'en_livraison' | 'livree'>('en_livraison');
  const [search, setSearch] = useState('');
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const fr = lang === 'fr';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [resCmd, resVente] = await Promise.all([
        api.get('/commandes/', { params: { statut: filter } }),
        api.get('/ventes/', { params: { statut: filter } })
      ]);
      const cmds = (resCmd.data.results || resCmd.data).map((c: any) => ({ ...c, is_vente: false }));
      const vts = (resVente.data.results || resVente.data).map((v: any) => ({ ...v, is_vente: true }));
      const data = [...cmds, ...vts].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setOrders(data as Order[]);
    } catch { }
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 10s for active deliveries
  useEffect(() => {
    if (filter !== 'en_livraison') return;
    const iv = setInterval(load, 10000);
    return () => clearInterval(iv);
  }, [filter, load]);

  const deliver = async (order: any) => {
    setConfirmingId(order.id);
    try {
      const endpoint = order.is_vente ? `/ventes/${order.id}/livrer/` : `/commandes/${order.id}/livrer/`;
      await api.post(endpoint);
      toast.success(fr ? '✅ Livraison confirmée!' : '✅ تم تأكيد التوصيل!');
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Erreur');
    } finally { setConfirmingId(null); }
  };

  const openGPS = (order: any) => {
    const lat = order.client_latitude;
    const lng = order.client_longitude;
    if (lat && lng) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
    } else if (order.client_adresse) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.client_adresse)}`, '_blank');
    } else {
      toast.error(fr ? 'Aucune position GPS disponible' : 'لا يوجد موقع GPS');
    }
  };

  const callClient = (phone: string) => {
    window.open(`tel:${phone}`);
  };

  const filteredOrders = orders.filter(o => {
    const q = search.toLowerCase();
    return !q || o.reference?.toLowerCase().includes(q) || o.client_nom?.toLowerCase().includes(q) || (o as any).client_phone?.toLowerCase().includes(q);
  });

  return (
    <AppLayout allowedRoles={['livreur']}>
      <div className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Truck size={22} />
            {fr ? 'Mes Livraisons' : 'توصيلاتي'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
            {filteredOrders.length} {fr ? 'commande(s)' : 'طلب'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className={`btn ${filter === 'en_livraison' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('en_livraison')}>
            <Truck size={14} /> {fr ? 'À livrer' : 'للتوصيل'}
          </button>
          <button className={`btn ${filter === 'livree' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('livree')}>
            <CheckCircle size={14} /> {fr ? 'Livrées' : 'مُسلَّمة'}
          </button>
          <button className="btn btn-secondary" onClick={load} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      <div className="search-bar" style={{ marginBottom: '16px' }}>
        <div className="search-input-wrap" style={{ maxWidth: 360 }}>
          <Search />
          <input className="form-control" placeholder={fr ? 'Rechercher...' : 'بحث...'} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><div className="spinner" /></div>
      ) : filteredOrders.length === 0 ? (
        <div className="empty-state card" style={{ padding: '50px' }}>
          {filter === 'en_livraison' ? <Truck size={40} /> : <CheckCircle size={40} />}
          <p style={{ marginTop: '12px', fontWeight: 600 }}>
            {filter === 'en_livraison'
              ? (fr ? 'Aucune livraison en cours' : 'لا توجد توصيلات جارية')
              : (fr ? 'Aucune livraison terminée' : 'لا توجد توصيلات منتهية')}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredOrders.map(o => (
            <div key={`${(o as any).is_vente ? 'v' : 'c'}_${o.id}`} className="card" style={{ padding: '16px', overflow: 'hidden' }}>
              {/* Header: Reference + Type badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--brand-primary)', letterSpacing: '0.5px' }}>
                    {o.reference}
                  </div>
                  {(o as any).is_vente && <span className="badge badge-success" style={{ fontSize: '10px', padding: '2px 6px' }}>Vente</span>}
                  <span className={`badge ${(o as any).is_vente ? 'badge-success' : (o as any).type_commande === 'gros' ? 'badge-purple' : 'badge-info'}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                    {(o as any).is_vente ? 'Camion' : (o as any).type_commande === 'gros' ? 'Gros' : 'Détail'}
                  </span>
                </div>
                {filter === 'livree' && (
                  <span className="badge badge-success" style={{ fontSize: '11px' }}>
                    <CheckCircle size={10} /> {fr ? 'Livré' : 'تم'}
                  </span>
                )}
              </div>

              {/* Client info */}
              <div style={{ background: 'var(--bg-elevated)', borderRadius: '10px', padding: '12px', marginBottom: '12px' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', marginBottom: '6px' }}>
                  {o.client_nom}
                </div>
                {o.client_adresse && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    <MapPin size={12} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>{o.client_adresse}</span>
                  </div>
                )}

                {/* Action buttons: Call + GPS */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  {o.client_phone && (
                    <button
                      onClick={() => callClient(o.client_phone)}
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                        padding: '9px 12px', borderRadius: '8px', border: '1px solid rgba(59,130,246,0.3)',
                        background: 'rgba(59,130,246,0.08)', color: '#3b82f6', fontSize: '13px',
                        fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                      }}
                    >
                      <Phone size={15} /> {fr ? 'Appeler' : 'اتصال'}
                    </button>
                  )}
                  <button
                    onClick={() => openGPS(o)}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      padding: '9px 12px', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.3)',
                      background: 'rgba(16,185,129,0.08)', color: '#10b981', fontSize: '13px',
                      fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                    }}
                  >
                    <Navigation size={15} /> {fr ? 'GPS Itinéraire' : 'GPS الاتجاهات'}
                  </button>
                </div>
              </div>

              {/* Products */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {fr ? 'Produits' : 'المنتجات'} ({o.lignes?.length || 0})
                </div>
                {o.lignes?.map((l: any, i: number) => (
                  <div key={l.id || i} style={{
                    display: 'flex', justifyContent: 'space-between', fontSize: '13px',
                    borderBottom: i < (o.lignes?.length || 0) - 1 ? '1px solid var(--border)' : 'none',
                    alignItems: 'center',
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {l.produit_image ? (
                        <img 
                          src={`${MEDIA_BASE}${l.produit_image}`} 
                          alt={l.produit_nom} 
                          style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover', border: '1px solid var(--border)' }}
                          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <div style={{ width: 32, height: 32, borderRadius: 6, background: 'rgba(0,96,69,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Package size={14} color="var(--brand-primary)" />
                        </div>
                      )}
                      {l.produit_nom}
                    </span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>× {l.quantite}</span>
                  </div>
                ))}
              </div>

              {/* Total + Delivery button */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                paddingTop: '12px', borderTop: '2px solid var(--border)',
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>
                    {fr ? 'Total à encaisser' : 'المبلغ الإجمالي'}
                  </div>
                  <div style={{ fontWeight: 900, color: 'var(--brand-primary)', fontSize: '18px' }}>
                    {Number(o.montant_total).toLocaleString('fr-DZ')} DA
                  </div>
                </div>

                {filter === 'en_livraison' && (
                  <button
                    className="btn btn-success"
                    style={{ flex: 1, padding: '12px', fontSize: '14px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(16,185,129,0.2)', marginLeft: '12px' }}
                    onClick={() => deliver(o)}
                    disabled={confirmingId === o.id}
                  >
                    {confirmingId === o.id ? <div className="spinner" style={{ width: 16, height: 16 }} /> : <CheckCircle size={16} />}
                    {fr ? 'Confirmer Livraison' : 'تأكيد التوصيل'}
                  </button>
                )}
              </div>

              {/* Notes */}
              {o.notes && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '6px 8px', background: 'rgba(245,158,11,0.06)', borderRadius: '6px', border: '1px solid rgba(245,158,11,0.15)' }}>
                  📝 {o.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
