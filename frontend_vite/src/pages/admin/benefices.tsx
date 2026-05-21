import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import { useLang } from '@/contexts/LangContext';
import api from '@/lib/api';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingCart,
  Package, Users, Warehouse, AlertTriangle
} from 'lucide-react';

type BenRow = { period: string; label: string; ca: number; cout: number; benefice: number };
type BenData = { rows: BenRow[]; total_ca: number; total_cout: number; total_benefice: number };

const fmtDA = (n: number) =>
  new Intl.NumberFormat('fr-DZ', { minimumFractionDigits: 0 }).format(n) + ' DA';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px 16px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
      <p style={{ fontWeight: 700, marginBottom: '8px', fontSize: '13px' }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color, fontWeight: 600, fontSize: '12px', margin: '2px 0' }}>
          {p.name}: {typeof p.value === 'number' && p.value > 100 ? fmtDA(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

export default function StatistiquesPage() {
  const { lang } = useLang();
  const fr = lang === 'fr';

  const today = new Date().toISOString().split('T')[0];
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString().split('T')[0];

  const [dateFrom, setDateFrom] = useState(firstDay);
  const [dateTo,   setDateTo]   = useState(today);
  const [groupBy,  setGroupBy]  = useState<'day' | 'week' | 'month'>('day');
  const [benData,  setBenData]  = useState<BenData | null>(null);
  const [dashData, setDashData] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [clients,  setClients]  = useState<any[]>([]);
  const [ventes,   setVentes]   = useState<any[]>([]);
  const [loading,  setLoading]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [ben, dash, prods, cls, vts] = await Promise.allSettled([
      api.get('/dashboard/benefices/', { params: { date_from: dateFrom, date_to: dateTo, group_by: groupBy } }),
      api.get('/dashboard/stats/'),
      api.get('/products/', { params: { page_size: 100 } }),
      api.get('/clients/', { params: { page_size: 100 } }),
      api.get('/ventes/', { params: { page_size: 200, ordering: '-created_at' } }),
    ]);
    if (ben.status === 'fulfilled') setBenData(ben.value.data);
    if (dash.status === 'fulfilled') setDashData(dash.value.data);
    if (prods.status === 'fulfilled') setProducts(prods.value.data.results || prods.value.data);
    if (cls.status === 'fulfilled') setClients(cls.value.data.results || cls.value.data);
    if (vts.status === 'fulfilled') setVentes(vts.value.data.results || vts.value.data);
    setLoading(false);
  }, [dateFrom, dateTo, groupBy]);

  useEffect(() => { load(); }, [load]);

  const benefice = benData?.total_benefice ?? 0;
  const isPositive = benefice >= 0;

  // ── Derived stats ──────────────────────────────────────────────
  // Top 5 products by stock value
  const topStockProducts = [...products]
    .sort((a, b) => b.stock_actuel - a.stock_actuel)
    .slice(0, 5)
    .map(p => ({ name: p.nom, value: p.stock_actuel }));

  // Low stock products
  const lowStock = products.filter(p => p.stock_faible);

  // Top 5 clients by total orders from ventes
  const clientMap: Record<string, { nom: string; total: number; count: number }> = {};
  for (const v of ventes) {
    const id = v.client;
    const nom = v.client_nom || String(id);
    if (!clientMap[id]) clientMap[id] = { nom, total: 0, count: 0 };
    clientMap[id].total += Number(v.montant_total || 0);
    clientMap[id].count++;
  }
  const topClients = Object.values(clientMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Sales by type (detail vs gros)
  const detailTotal = ventes.filter(v => v.type_vente === 'detail').reduce((s, v) => s + Number(v.montant_total || 0), 0);
  const grosTotal   = ventes.filter(v => v.type_vente === 'gros').reduce((s, v) => s + Number(v.montant_total || 0), 0);
  const pieData = [
    { name: fr ? 'Vente Détail' : 'تجزئة', value: Math.round(detailTotal) },
    { name: fr ? 'Vente Gros' : 'جملة',   value: Math.round(grosTotal) },
  ];

  const GroupBtn = ({ v, label }: { v: 'day' | 'week' | 'month'; label: string }) => (
    <button onClick={() => setGroupBy(v)} style={{
      padding: '6px 16px', borderRadius: '8px', fontWeight: 700, fontSize: '12px',
      border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit',
      background: groupBy === v ? 'var(--brand-primary)' : 'var(--bg-elevated)',
      color: groupBy === v ? '#fff' : 'var(--text-muted)', transition: 'all 0.15s',
    }}>{label}</button>
  );

  const KpiCard = ({ label, value, sub, icon, color }: any) => (
    <div className="kpi-card" style={{ ['--kpi-color' as any]: color }}>
      <div className="kpi-icon" style={{ background: color + '22', color }}>
        {icon}
      </div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={{ fontSize: String(value).length > 14 ? '16px' : '22px', color }}>
        {value}
      </div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );

  const sectionTitle = (emoji: string, title: string) => (
    <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
      {emoji} {title}
    </div>
  );

  return (
    <AppLayout allowedRoles={['admin']}>
      <div className="page-header">
        <div>
          <h1>📊 {fr ? 'Statistiques & Analyses' : 'الإحصائيات والتحليلات'}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
            {fr ? 'Vue complète · Ventes · Stock · Clients · Bénéfices' : 'نظرة شاملة على المبيعات والمخزون والعملاء والأرباح'}
          </p>
        </div>
      </div>

      {/* ── Date Filters ── */}
      <div style={{ background: 'var(--bg-elevated)', borderRadius: '14px', padding: '14px 20px', marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', border: '1px solid var(--border)' }}>
        <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-muted)' }}>📅 {fr ? 'Période :' : 'الفترة:'}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input type="date" className="form-control" value={dateFrom}
            onChange={e => setDateFrom(e.target.value)} style={{ fontSize: '13px', width: 145 }} />
          <span style={{ color: 'var(--text-muted)' }}>→</span>
          <input type="date" className="form-control" value={dateTo}
            onChange={e => setDateTo(e.target.value)} style={{ fontSize: '13px', width: 145 }} />
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <GroupBtn v="day"   label={fr ? 'Jour' : 'يوم'} />
          <GroupBtn v="week"  label={fr ? 'Semaine' : 'أسبوع'} />
          <GroupBtn v="month" label={fr ? 'Mois' : 'شهر'} />
        </div>
        {/* Quick presets */}
        <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto', flexWrap: 'wrap' }}>
          {[
            { label: fr ? 'Ce mois' : 'الشهر', from: firstDay, to: today },
            { label: fr ? '3 mois' : '3 أشهر', from: new Date(new Date().setMonth(new Date().getMonth()-3)).toISOString().split('T')[0], to: today },
            { label: fr ? '1 an' : 'سنة', from: new Date(new Date().setFullYear(new Date().getFullYear()-1)).toISOString().split('T')[0], to: today },
          ].map(p => (
            <button key={p.label} onClick={() => { setDateFrom(p.from); setDateTo(p.to); }}
              style={{ padding: '5px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit' }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}><div className="spinner" /></div>
      ) : (
        <>
          {/* ── KPIs bénéfice ── */}
          <div className="grid-4" style={{ marginBottom: '24px' }}>
            <KpiCard label={fr ? "Chiffre d'affaires" : "رقم الأعمال"} value={fmtDA(benData?.total_ca ?? 0)} icon={<ShoppingCart size={16}/>} color="#6366f1" sub={fr ? 'Sur la période' : 'خلال الفترة'} />
            <KpiCard label={fr ? "Coût d'achat" : "تكلفة الشراء"} value={fmtDA(benData?.total_cout ?? 0)} icon={<Package size={16}/>} color="#f59e0b" sub={fr ? 'Prix palette ÷ cartons' : 'سعر الباليت ÷ كرتون'} />
            <KpiCard label={fr ? "Bénéfice net" : "الربح الصافي"} value={fmtDA(benefice)} icon={isPositive ? <TrendingUp size={16}/> : <TrendingDown size={16}/>} color={isPositive ? '#10b981' : '#ef4444'} sub={benData?.total_ca ? ((benefice / benData.total_ca) * 100).toFixed(1) + '% marge' : '—'} />
            <KpiCard label={fr ? "Total clients" : "إجمالي العملاء"} value={String(dashData?.clients ?? clients.length)} icon={<Users size={16}/>} color="#06b6d4" sub={`${dashData?.fournisseurs ?? 0} ${fr ? 'fournisseurs' : 'مورد'}`} />
          </div>

          {/* ── Row 2: Stock KPIs ── */}
          <div className="grid-4" style={{ marginBottom: '24px' }}>
            <KpiCard label={fr ? "Produits actifs" : "منتجات نشطة"} value={String(dashData?.produits?.total ?? products.filter(p=>p.actif).length)} icon={<Package size={16}/>} color="#8b5cf6" />
            <KpiCard label={fr ? "Valeur du stock" : "قيمة المخزون"} value={fmtDA(dashData?.produits?.valeur_stock ?? 0)} icon={<Warehouse size={16}/>} color="#06b6d4" />
            <KpiCard label={fr ? "Stock faible" : "مخزون منخفض"} value={String(dashData?.produits?.stock_faible ?? lowStock.length)} icon={<AlertTriangle size={16}/>} color={lowStock.length > 0 ? '#ef4444' : '#10b981'} sub={fr ? 'Produits sous seuil' : 'منتجات تحت الحد'} />
            <KpiCard label={fr ? "Ventes ce mois" : "مبيعات الشهر"} value={fmtDA(dashData?.ventes?.ce_mois_total ?? 0)} icon={<DollarSign size={16}/>} color="#ec4899" sub={`${dashData?.ventes?.ce_mois_count ?? 0} ${fr ? 'factures' : 'فاتورة'}`} />
          </div>

          {/* ── Bénéfices Chart ── */}
          <div style={{ background: 'var(--bg-elevated)', borderRadius: '16px', padding: '24px', marginBottom: '24px', border: '1px solid var(--border)' }}>
            {sectionTitle('📈', fr ? 'Évolution CA / Coût / Bénéfice' : 'تطور الإيرادات / التكاليف / الأرباح')}
            {!benData?.rows.length ? (
              <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>{fr ? 'Aucune donnée sur cette période.' : 'لا بيانات.'}</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={benData.rows} margin={{ top: 0, right: 0, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => (v/1000).toFixed(0)+'k'} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="ca"       name={fr ? 'CA' : 'إيرادات'} fill="#6366f1" radius={[4,4,0,0]} />
                  <Bar dataKey="cout"     name={fr ? 'Coût' : 'تكلفة'} fill="#f59e0b" radius={[4,4,0,0]} />
                  <Bar dataKey="benefice" name={fr ? 'Bénéfice' : 'ربح'} fill="#10b981" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* ── 7-day sales chart + Pie ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '24px' }}>
            <div style={{ background: 'var(--bg-elevated)', borderRadius: '16px', padding: '24px', border: '1px solid var(--border)' }}>
              {sectionTitle('📉', fr ? 'Ventes 7 derniers jours' : 'مبيعات 7 أيام الأخيرة')}
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={dashData?.sales_chart || []} margin={{ top: 0, right: 0, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => (v/1000).toFixed(0)+'k'} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area dataKey="total" name={fr ? 'Ventes' : 'مبيعات'} stroke="#6366f1" fill="url(#gSales)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div style={{ background: 'var(--bg-elevated)', borderRadius: '16px', padding: '24px', border: '1px solid var(--border)' }}>
              {sectionTitle('🥧', fr ? 'Détail vs Gros' : 'تجزئة مقابل جملة')}
              {(detailTotal + grosTotal) > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={70} innerRadius={35}>
                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => fmtDA(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                    {pieData.map((d, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', alignItems: 'center' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS[i], display: 'inline-block' }} />
                          {d.name}
                        </span>
                        <span style={{ fontWeight: 700, color: COLORS[i] }}>{fmtDA(d.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '13px' }}>{fr ? 'Aucune vente.' : 'لا مبيعات.'}</div>
              )}
            </div>
          </div>

          {/* ── Top Clients + Top Stock ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
            {/* Top Clients */}
            <div style={{ background: 'var(--bg-elevated)', borderRadius: '16px', padding: '24px', border: '1px solid var(--border)' }}>
              {sectionTitle('👥', fr ? 'Top 5 Clients' : 'أفضل 5 عملاء')}
              {topClients.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{fr ? 'Aucune donnée.' : 'لا بيانات.'}</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {topClients.map((c, i) => {
                    const maxTotal = topClients[0].total || 1;
                    const pct = (c.total / maxTotal) * 100;
                    return (
                      <div key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 600 }}>#{i+1} {c.nom}</span>
                          <span style={{ fontWeight: 700, color: '#6366f1' }}>{fmtDA(c.total)}</span>
                        </div>
                        <div style={{ height: 6, background: 'var(--border)', borderRadius: 3 }}>
                          <div style={{ height: 6, width: `${pct}%`, background: COLORS[i % COLORS.length], borderRadius: 3, transition: 'width 0.5s' }} />
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{c.count} {fr ? 'commande(s)' : 'طلب'}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Top Stock products */}
            <div style={{ background: 'var(--bg-elevated)', borderRadius: '16px', padding: '24px', border: '1px solid var(--border)' }}>
              {sectionTitle('📦', fr ? 'Stock par produit (ctn)' : 'المخزون بالكرتون')}
              {topStockProducts.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{fr ? 'Aucune donnée.' : 'لا بيانات.'}</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {topStockProducts.map((p, i) => {
                    const maxVal = topStockProducts[0].value || 1;
                    const pct = (p.value / maxVal) * 100;
                    const prod = products.find(pp => pp.nom === p.name);
                    return (
                      <div key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 600 }}>{p.name}</span>
                          <span style={{ fontWeight: 700, color: COLORS[i % COLORS.length] }}>{p.value} ctn</span>
                        </div>
                        <div style={{ height: 6, background: 'var(--border)', borderRadius: 3 }}>
                          <div style={{ height: 6, width: `${pct}%`, background: COLORS[i % COLORS.length], borderRadius: 3 }} />
                        </div>
                        {prod?.stock_faible && (
                          <div style={{ fontSize: '10px', color: '#ef4444', marginTop: '2px', fontWeight: 700 }}>⚠ {fr ? 'Sous seuil minimum' : 'تحت الحد الأدنى'}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Bénéfice Table ── */}
          {!!benData?.rows.length && (
            <div style={{ background: 'var(--bg-elevated)', borderRadius: '16px', padding: '24px', border: '1px solid var(--border)', marginBottom: '24px' }}>
              {sectionTitle('📋', fr ? 'Détail par période' : 'تفاصيل حسب الفترة')}
              <div className="table-container" style={{ margin: 0 }}>
                <table>
                  <thead>
                    <tr>
                      <th>{fr ? 'Période' : 'الفترة'}</th>
                      <th style={{ textAlign: 'right', color: '#6366f1' }}>{fr ? 'CA' : 'الإيرادات'}</th>
                      <th style={{ textAlign: 'right', color: '#f59e0b' }}>{fr ? 'Coût' : 'التكلفة'}</th>
                      <th style={{ textAlign: 'right', color: '#10b981' }}>{fr ? 'Bénéfice' : 'الربح'}</th>
                      <th style={{ textAlign: 'right' }}>{fr ? 'Marge' : 'الهامش'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {benData.rows.map((row, i) => {
                      const marge = row.ca > 0 ? ((row.benefice / row.ca) * 100).toFixed(1) : '0.0';
                      const isPos = row.benefice >= 0;
                      return (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{row.label}</td>
                          <td style={{ textAlign: 'right', color: '#6366f1', fontWeight: 700 }}>{fmtDA(row.ca)}</td>
                          <td style={{ textAlign: 'right', color: '#f59e0b', fontWeight: 600 }}>{fmtDA(row.cout)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 800 }}>
                            <span style={{ color: isPos ? '#10b981' : '#ef4444' }}>{isPos?'+':''}{fmtDA(row.benefice)}</span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <span style={{ padding: '2px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: isPos ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', color: isPos ? '#10b981' : '#ef4444' }}>
                              {marge}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: 'var(--bg-base)', borderTop: '2px solid var(--border)' }}>
                      <td style={{ fontWeight: 800 }}>TOTAL</td>
                      <td style={{ textAlign: 'right', color: '#6366f1', fontWeight: 900 }}>{fmtDA(benData.total_ca)}</td>
                      <td style={{ textAlign: 'right', color: '#f59e0b', fontWeight: 900 }}>{fmtDA(benData.total_cout)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 900 }}>
                        <span style={{ color: isPositive ? '#10b981' : '#ef4444' }}>{isPositive?'+':''}{fmtDA(benData.total_benefice)}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span style={{ padding: '3px 11px', borderRadius: '20px', fontSize: '12px', fontWeight: 800, background: isPositive ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: isPositive ? '#10b981' : '#ef4444' }}>
                          {benData.total_ca > 0 ? (((benData.total_ca - benData.total_cout) / benData.total_ca) * 100).toFixed(1) : '0.0'}%
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </AppLayout>
  );
}
