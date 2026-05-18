import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { useLang } from '@/contexts/LangContext';
import api from '@/lib/api';
import { Search, Package, AlertTriangle } from 'lucide-react';

export default function PrevendeurStockPage() {
  const { lang } = useLang();
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

  const lowStock = filtered.filter(p => p.stock_actuel <= p.stock_minimum);

  return (
    <AppLayout allowedRoles={['prevendeur']}>
      <div className="page-header">
        <div>
          <h1>📦 {fr ? 'Stock disponible' : 'المخزون المتاح'}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
            {filtered.length} {fr ? 'produits' : 'منتج'}
            {lowStock.length > 0 && <span style={{ color: '#ef4444', marginLeft: '12px' }}>⚠️ {lowStock.length} {fr ? 'en stock faible' : 'مخزون منخفض'}</span>}
          </p>
        </div>
      </div>

      {lowStock.length > 0 && (
        <div style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', padding: '12px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertTriangle size={16} color="#ef4444" />
          <span style={{ fontSize: '13px', color: '#dc2626', fontWeight: 600 }}>
            {fr ? `${lowStock.length} produit(s) en dessous du stock minimum :` : `${lowStock.length} منتج تحت الحد الأدنى:`}
            <span style={{ fontWeight: 400, marginLeft: '6px' }}>{lowStock.map(p => p.nom).join(', ')}</span>
          </span>
        </div>
      )}

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
            const isLow = p.stock_actuel <= p.stock_minimum;
            const pct = p.stock_minimum > 0 ? Math.min(100, Math.round((p.stock_actuel / (p.stock_minimum * 3)) * 100)) : 100;
            return (
              <div key={p.id} className="card" style={{ padding: '16px', borderColor: isLow ? 'rgba(239,68,68,0.3)' : 'var(--border)', position: 'relative', overflow: 'hidden' }}>
                {isLow && (
                  <div style={{ position: 'absolute', top: 10, right: 10 }}>
                    <AlertTriangle size={14} color="#ef4444" />
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '10px', background: isLow ? 'rgba(239,68,68,0.1)' : 'rgba(0,96,69,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Package size={18} color={isLow ? '#ef4444' : 'var(--brand-primary)'} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nom}</div>
                  </div>
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{fr ? 'Stock actuel' : 'المخزون'}</span>
                    <span style={{ fontSize: '13px', fontWeight: 900, color: isLow ? '#ef4444' : 'var(--brand-primary)' }}>
                      <span style={{ color: '#8b5cf6' }}>{p.stock_palettes} pal.</span>
                      {p.stock_cartons_restants > 0 && <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}> + {p.stock_cartons_restants} ctn</span>}
                    </span>
                  </div>
                  <div style={{ height: 5, borderRadius: 3, background: 'var(--border)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, borderRadius: 3, background: isLow ? '#ef4444' : pct < 50 ? '#f59e0b' : '#10b981', transition: 'width 0.5s' }} />
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {p.stock_actuel} ctn total · min: {p.stock_minimum} ctn
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '2px' }}>📦 {fr ? 'Prix Détail/ctn' : 'سعر تجزئة/كرتون'}</div>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#06b6d4' }}>{Number(p.prix_detail || 0).toLocaleString()} DA</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '2px' }}>🏪 {fr ? 'Prix Gros/ctn' : 'سعر جملة/كرتون'}</div>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#6366f1' }}>{Number(p.prix_gros || 0).toLocaleString()} DA</div>
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
