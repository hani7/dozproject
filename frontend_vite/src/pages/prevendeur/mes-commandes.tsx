import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { useLang } from '@/contexts/LangContext';
import api from '@/lib/api';
import API_URL from '@/lib/config';
import type { Order } from '@/lib/types';
import { Package, Search } from 'lucide-react';

const MEDIA_BASE = API_URL.replace('/api', '');

const STATUS_COLORS: Record<string, string> = {
  en_attente: 'badge-warning', confirmee: 'badge-info',
  en_livraison: 'badge-purple', livree: 'badge-success', annulee: 'badge-danger',
};

export default function MesCommandesPage() {
  const { lang } = useLang();
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/commandes/').then(r => setOrders(r.data.results || r.data));
    const i = setInterval(() => api.get('/commandes/').then(r => setOrders(r.data.results || r.data)), 5000);
    return () => clearInterval(i);
  }, []);

  const filteredOrders = orders.filter(o => {
    const q = search.toLowerCase();
    return !q || o.reference?.toLowerCase().includes(q) || o.client_nom?.toLowerCase().includes(q);
  });

  const statusLabels: Record<string, string> = lang === 'fr'
    ? { en_attente: 'En attente', confirmee: 'Confirmée', en_livraison: 'En livraison', livree: 'Livrée', annulee: 'Annulée' }
    : { en_attente: 'في الانتظار', confirmee: 'مؤكدة', en_livraison: 'قيد التوصيل', livree: 'مُسلَّمة', annulee: 'ملغاة' };

  return (
    <AppLayout allowedRoles={['prevendeur']}>
      <div className="page-header">
        <h1>{lang === 'fr' ? 'Mes Commandes' : 'طلباتي'}</h1>
      </div>
      <div className="search-bar" style={{ marginBottom: '16px', padding: '0 16px' }}>
        <div className="search-input-wrap">
          <Search />
          <input className="form-control" placeholder={lang === 'fr' ? 'Rechercher commande...' : 'بحث عن طلب...'} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>
      {filteredOrders.length === 0 ? (
        <div className="empty-state">
          <p>{lang === 'fr' ? 'Aucune commande trouvée' : 'لا يوجد طلبات'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 16px 16px' }}>
          {filteredOrders.map(o => (
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
              {/* Product items */}
              {o.lignes && o.lignes.length > 0 && (
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                  {o.lignes.map((l: any, i: number) => (
                    <div key={l.id || i} style={{
                      display: 'flex', justifyContent: 'space-between', fontSize: '12px',
                      color: 'var(--text-secondary)', padding: '4px 0', alignItems: 'center'
                    }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {l.produit_image ? (
                          <img 
                            src={`${MEDIA_BASE}${l.produit_image}`} 
                            alt={l.produit_nom} 
                            style={{ width: 24, height: 24, borderRadius: 4, objectFit: 'cover', border: '1px solid var(--border)' }}
                            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                          />
                        ) : (
                          <div style={{ width: 24, height: 24, borderRadius: 4, background: 'rgba(0,96,69,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Package size={12} color="var(--brand-primary)" />
                          </div>
                        )}
                        {l.produit_nom}
                      </span>
                      <span style={{ fontWeight: 700 }}>× {l.quantite}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
