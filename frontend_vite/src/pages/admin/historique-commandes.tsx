import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { useLang } from '@/contexts/LangContext';
import api from '@/lib/api';
import { CheckCircle, XCircle, Truck, Search, Filter, FileText, PackageCheck, Eye } from 'lucide-react';
import type { Order } from '@/lib/types';
import { printFacture, printBonLivraison } from '@/lib/printDocs';

const STATUS_COLORS: Record<string, string> = {
  en_attente: 'badge-warning',
  confirmee: 'badge-info',
  en_livraison: 'badge-purple',
  livree: 'badge-success',
  annulee: 'badge-danger',
};
const STATUS_LABELS: Record<string, Record<string, string>> = {
  en_attente:   { fr: 'En attente',   ar: 'في الانتظار' },
  confirmee:    { fr: 'Confirmée',    ar: 'مؤكدة' },
  en_livraison: { fr: 'En livraison', ar: 'قيد التوصيل' },
  livree:       { fr: 'Livrée',       ar: 'تم التوصيل' },
  annulee:      { fr: 'Annulée',      ar: 'ملغاة' },
};

export default function HistoriqueCommandesPage() {
  const { lang } = useLang();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const fr = lang === 'fr';

  useEffect(() => {
    setLoading(true);
    const fetchAll = async () => {
      try {
        let all: Order[] = [];
        let nextUrl: string | null = `/commandes/?ordering=-created_at&page_size=500${statusFilter ? '&statut=' + statusFilter : ''}`;
        while (nextUrl) {
          const r = await api.get(nextUrl);
          const data = r.data.results || r.data;
          all = [...all, ...data];
          nextUrl = r.data.next || null;
        }
        setOrders(all);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [statusFilter]);

  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    const matchSearch = !q || [
      o.reference, o.client_nom, o.prevendeur_nom, o.livreur_nom, o.statut, String(o.montant_total)
    ].some(val => String(val || '').toLowerCase().includes(q));
    const matchType = !typeFilter || o.type_commande === typeFilter;
    const orderDate = o.created_at.split('T')[0];
    const matchDateFrom = !dateFrom || orderDate >= dateFrom;
    const matchDateTo = !dateTo || orderDate <= dateTo;
    return matchSearch && matchType && matchDateFrom && matchDateTo;
  });

  const totalCA = filtered.filter(o => o.statut === 'livree').reduce((s, o) => s + Number(o.montant_total), 0);

  return (
    <AppLayout allowedRoles={['admin']}>
      <div className="page-header">
        <div>
          <h1>{fr ? 'Historique des commandes' : 'سجل الطلبات'}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
            {filtered.length} {fr ? 'commandes' : 'طلب'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="search-bar" style={{ marginBottom: '20px' }}>
        <div className="search-input-wrap" style={{ maxWidth: 320 }}>
          <Search />
          <input className="form-control" placeholder={fr ? 'Réf. ou client...' : 'مرجع أو عميل...'} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input type="date" className="form-control" style={{ maxWidth: 140 }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} title={fr ? 'De' : 'من'} />
          <span style={{ color: 'var(--text-muted)' }}>→</span>
          <input type="date" className="form-control" style={{ maxWidth: 140 }} value={dateTo} onChange={e => setDateTo(e.target.value)} title={fr ? 'À' : 'إلى'} />
        </div>
        <select className="form-control" style={{ maxWidth: 160 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">{fr ? 'Tous statuts' : 'كل الحالات'}</option>
          <option value="en_attente">{fr ? 'En attente' : 'في الانتظار'}</option>
          <option value="confirmee">{fr ? 'Confirmées' : 'مؤكدة'}</option>
          <option value="en_livraison">{fr ? 'En livraison' : 'قيد التوصيل'}</option>
          <option value="livree">{fr ? 'Livrées' : 'تم التوصيل'}</option>
          <option value="annulee">{fr ? 'Annulées' : 'ملغاة'}</option>
        </select>
        <select className="form-control" style={{ maxWidth: 160 }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">{fr ? 'Tous types' : 'كل الأنواع'}</option>
          <option value="detail">📦 {fr ? 'Détail (Carton)' : 'تجزئة (كرتون)'}</option>
          <option value="gros">🏭 {fr ? 'Gros (Palette)' : 'جملة (مستودع)'}</option>
        </select>
      </div>

      {/* Summary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: fr ? 'Total commandes' : 'إجمالي الطلبات', value: filtered.length, icon: '📋', color: '#6366f1' },
          { label: fr ? 'En attente' : 'في الانتظار', value: filtered.filter(o => o.statut === 'en_attente').length, icon: '⏳', color: '#f59e0b' },
          { label: fr ? 'Confirmées' : 'مؤكدة', value: filtered.filter(o => o.statut === 'confirmee').length, icon: '🔵', color: '#0ea5e9' },
          { label: fr ? 'En livraison' : 'قيد التوصيل', value: filtered.filter(o => o.statut === 'en_livraison').length, icon: '🚚', color: '#8b5cf6' },
          { label: fr ? 'Livrées' : 'مُوصَّلة', value: filtered.filter(o => o.statut === 'livree').length, icon: '✅', color: '#10b981' },
          { label: fr ? 'Annulées' : 'ملغاة', value: filtered.filter(o => o.statut === 'annulee').length, icon: '❌', color: '#ef4444' },
          { label: fr ? 'CA livré' : 'رقم الأعمال', value: totalCA.toLocaleString('fr-DZ') + ' DA', icon: '💰', color: 'var(--brand-primary)' },
        ].map((kpi, i) => (
          <div key={i} className="kpi-card" style={{ ['--kpi-color' as any]: kpi.color }}>
            <div className="kpi-icon" style={{ background: kpi.color + '20' }}><span style={{ fontSize: '18px' }}>{kpi.icon}</span></div>
            <div className="kpi-label">{kpi.label}</div>
            <div className="kpi-value" style={{ fontSize: typeof kpi.value === 'string' && kpi.value.length > 10 ? '16px' : '26px' }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><div className="spinner" /></div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>{fr ? 'Référence' : 'المرجع'}</th>
                <th>{fr ? 'Date' : 'التاريخ'}</th>
                <th>{fr ? 'Client' : 'العميل'}</th>
                <th>{fr ? 'Type' : 'النوع'}</th>
                <th>{fr ? 'Prévendeur' : 'المندوب'}</th>
                <th>{fr ? 'Livreur' : 'الموزع'}</th>
                <th>{fr ? 'Total' : 'المجموع'}</th>
                <th>{fr ? 'Statut' : 'الحالة'}</th>
                <th>{fr ? 'Actions' : 'الإجراءات'}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                  {fr ? 'Aucune commande trouvée' : 'لا توجد طلبات'}
                </td></tr>
              ) : filtered.map(o => (
                <tr key={o.id}>
                  <td style={{ fontWeight: 700, fontSize: '12px', fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                    {o.reference}
                  </td>
                  <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    <div>{new Date(o.created_at).toLocaleDateString('fr-DZ', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                    <div style={{ fontSize: '11px', marginTop: '2px', opacity: 0.8 }}>{new Date(o.created_at).toLocaleTimeString('fr-DZ', { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{o.client_nom}</div>
                    {o.client_phone && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>📞 {o.client_phone}</div>}
                  </td>
                  <td>
                    <span className={`badge ${o.type_commande === 'gros' ? 'badge-purple' : 'badge-info'}`}>
                      {o.type_commande === 'gros' ? '🏭 Palette' : '📦 Carton'}
                    </span>
                  </td>
                  <td style={{ fontSize: '13px' }}>{o.prevendeur_nom || '-'}</td>
                  <td style={{ fontSize: '13px' }}>
                    {o.livreur_nom ? <><Truck size={12} style={{ marginRight: 4 }} />{o.livreur_nom}</> : '-'}
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--brand-primary)' }}>
                    {Number(o.montant_total).toLocaleString('fr-DZ')} DA
                  </td>
                  <td>
                    <span className={`badge ${STATUS_COLORS[o.statut] || 'badge-gray'}`}>
                      {o.statut === 'livree' ? <CheckCircle size={10} /> : <XCircle size={10} />}
                      {' '}{STATUS_LABELS[o.statut]?.[lang as 'fr' | 'ar']}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button className="btn btn-secondary btn-icon" title={fr ? 'Imprimer Facture' : 'طباعة الفاتورة'} onClick={() => printFacture(o)} style={{ color: '#059669' }}>
                        <FileText size={12} />
                      </button>
                      <button className="btn btn-secondary btn-icon" title={fr ? 'Bon de Livraison' : 'وصل التسليم'} onClick={() => printBonLivraison(o)} style={{ color: '#0284c7' }}>
                        <PackageCheck size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppLayout>
  );
}
