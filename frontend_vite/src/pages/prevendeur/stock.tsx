import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { useLang } from '@/contexts/LangContext';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import API_URL from '@/lib/config';
import { Search, Package } from 'lucide-react';

const MEDIA_BASE = API_URL.replace('/api', '');

export default function PrevendeurStockPage() {
  const { lang } = useLang();
  const { user } = useAuth();
  const isGros = user?.specialite === 'gros';
  const [produits, setProduits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const fr = lang === 'fr';

  useEffect(() => {
    api.get('/products/', { params: { page_size: 200 } })
      .then(r => { setProduits(r.data.results || r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = produits.filter(p => {
    const q = search.toLowerCase();
    return !q || p.nom?.toLowerCase().includes(q) || p.code?.toLowerCase().includes(q);
  });

  return (
    <AppLayout allowedRoles={['prevendeur']}>
      <div className="page-header">
        <div>
          <h1>📦 {fr ? 'Stock disponible' : 'المخزون المتاح'}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
            {filtered.length} {fr ? 'produits' : 'منتج'}
          </p>
        </div>
      </div>

      <div className="search-bar" style={{ marginBottom: '18px' }}>
        <div className="search-input-wrap">
          <Search />
          <input className="form-control" placeholder={fr ? 'Rechercher produit...' : 'ابحث عن منتج...'} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><div className="spinner" /></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px' }}>
          {filtered.map(p => {
            return (
              <div key={p.id} className="card" style={{ padding: '16px', borderColor: 'var(--border)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  {p.image ? (
                    <img
                      src={`${MEDIA_BASE}${p.image}`}
                      alt={p.nom}
                      style={{ width: 44, height: 44, borderRadius: '10px', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--border)' }}
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div style={{ width: 44, height: 44, borderRadius: '10px', background: 'rgba(0,96,69,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Package size={20} color="var(--brand-primary)" />
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nom}</div>
                  </div>
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{fr ? 'Stock (ctn)' : 'المخزون (كرتون)'}</span>
                    <span style={{ fontSize: '24px', fontWeight: 900, color: p.stock_faible ? '#ef4444' : 'var(--brand-primary)' }}>
                      {p.stock_actuel}
                      <span style={{ fontSize: '11px', fontWeight: 600, marginLeft: '2px', color: 'var(--text-muted)' }}>ctn</span>
                    </span>
                  </div>
                  {p.stock_faible && <div style={{ fontSize: '10px', color: '#ef4444', fontWeight: 700, textAlign: 'right' }}>⚠ {fr ? 'Stock faible' : 'مخزون منخفض'}</div>}
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '2px' }}>
                    {isGros ? (
                      <>🏪 {fr ? 'Prix Gros/ctn' : 'سعر جملة/كرتون'}</>
                    ) : (
                      <>📦 {fr ? 'Prix Détail/ctn' : 'سعر تجزئة/كرتون'}</>
                    )}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: isGros ? '#6366f1' : '#06b6d4' }}>
                    {Number(isGros ? (p.prix_gros || 0) : (p.prix_detail || 0)).toLocaleString()} DA
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
