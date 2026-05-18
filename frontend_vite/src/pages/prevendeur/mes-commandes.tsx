import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { useLang } from '@/contexts/LangContext';
import api from '@/lib/api';
import type { Order } from '@/lib/types';

const STATUS_COLORS: Record<string, string> = {
  en_attente: 'badge-warning', confirmee: 'badge-info',
  en_livraison: 'badge-purple', livree: 'badge-success', annulee: 'badge-danger',
};

export default function MesCommandesPage() {
  const { lang } = useLang();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    api.get('/commandes/').then(r => setOrders(r.data.results || r.data));
    const i = setInterval(() => api.get('/commandes/').then(r => setOrders(r.data.results || r.data)), 5000);
    return () => clearInterval(i);
  }, []);

  const statusLabels: Record<string, string> = lang === 'fr'
    ? { en_attente: 'En attente', confirmee: 'Confirmée', en_livraison: 'En livraison', livree: 'Livrée', annulee: 'Annulée' }
    : { en_attente: 'في الانتظار', confirmee: 'مؤكدة', en_livraison: 'قيد التوصيل', livree: 'مُسلَّمة', annulee: 'ملغاة' };

  return (
    <AppLayout allowedRoles={['prevendeur']}>
      <div className="page-header">
        <h1>{lang === 'fr' ? 'Mes Commandes' : 'طلباتي'}</h1>
      </div>
      {orders.length === 0 ? (
        <div className="empty-state">
          <p>{lang === 'fr' ? 'Aucune commande trouvée' : 'لا يوجد طلبات'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {orders.map(o => (
            <div key={o.id} className="app-card">
              <div className="app-card-row">
                <div className="app-card-title" style={{ color: 'var(--brand-primary)', fontSize: '16px' }}>
                  {o.reference}
                  <span className={`badge ${o.type_commande === 'gros' ? 'badge-purple' : 'badge-info'}`} style={{ fontSize: '10px' }}>
                    {o.type_commande === 'gros' ? 'Gros' : 'Détail'}
                  </span>
                </div>
                <div style={{ fontWeight: 800, fontSize: '15px' }}>
                  {Number(o.montant_total).toLocaleString()} DA
                </div>
              </div>
              <div className="app-card-row" style={{ marginTop: '8px' }}>
                <div className="app-card-sub" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {o.client_nom}
                </div>
                <span className={`badge ${STATUS_COLORS[o.statut]}`}>
                  {statusLabels[o.statut]}
                </span>
              </div>
              <div className="app-card-sub" style={{ marginTop: '8px', fontSize: '11px' }}>
                {new Date(o.created_at).toLocaleString(lang === 'fr' ? 'fr-FR' : 'ar-DZ')}
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
