import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { useLang } from '@/contexts/LangContext';
import api from '@/lib/api';
import { CheckCircle, XCircle, History } from 'lucide-react';
import type { Order } from '@/lib/types';

export default function HistoriquePage() {
  const { lang } = useLang();
  const fr = lang === 'fr';
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch orders that are delivered or cancelled
    api.get('/commandes/', { params: { statut: 'livree,annulee' } })
      .then(r => {
        // filter on client side just in case the backend doesn't support comma separated statuses
        const data = r.data.results || r.data;
        setOrders(data.filter((o: Order) => o.statut === 'livree' || o.statut === 'annulee'));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <AppLayout allowedRoles={['livreur']}>
      <div className="page-header">
        <div>
          <h1><History size={20} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }}/>{fr ? 'Historique des livraisons' : 'سجل التوصيلات'}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
            {orders.length} {fr ? 'livraison(s) passée(s)' : 'توصيلات سابقة'}
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><div className="spinner" /></div>
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <History size={40} style={{ opacity: 0.2, margin: '0 auto 10px' }} />
          <p>{fr ? 'Aucun historique disponible' : 'لا يوجد سجل'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {orders.map(o => (
            <div key={o.id} className="app-card">
              <div className="app-card-row">
                <div className="app-card-title">
                  {o.reference}
                  <span className={`badge ${o.type_commande === 'gros' ? 'badge-purple' : 'badge-info'}`} style={{ fontSize: '10px' }}>
                    {o.type_commande === 'gros' ? '🏭 Gros' : '📦 Détail'}
                  </span>
                </div>
                {o.statut === 'livree' ? (
                  <span className="badge badge-success" style={{ fontSize: '11px', display: 'flex', gap: 4, alignItems: 'center' }}>
                    <CheckCircle size={12} /> {fr ? 'Livré' : 'تم'}
                  </span>
                ) : (
                  <span className="badge badge-danger" style={{ fontSize: '11px', display: 'flex', gap: 4, alignItems: 'center' }}>
                    <XCircle size={12} /> {fr ? 'Annulé' : 'ملغى'}
                  </span>
                )}
              </div>

              <div style={{ background: 'var(--bg-elevated)', borderRadius: '8px', padding: '10px', marginTop: '8px' }}>
                <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>{o.client_nom}</div>
                {o.client_adresse && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{o.client_adresse}</div>}
              </div>

              <div className="app-card-row" style={{ marginTop: '8px', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
                <div className="app-card-sub">
                  {new Date(o.created_at).toLocaleDateString(fr ? 'fr-FR' : 'ar-DZ', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
                <div style={{ fontWeight: 800, color: 'var(--brand-primary)' }}>
                  {Number(o.montant_total).toLocaleString()} DA
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
