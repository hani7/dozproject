import { useEffect, useState, useRef, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import { useLang } from '@/contexts/LangContext';
import api from '@/lib/api';
import type { DashboardStats } from '@/lib/types';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

export default function DashboardPage() {
  const { lang } = useLang();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(() => {
    // Skip fetch when tab is hidden — saves network & CPU
    if (document.visibilityState === 'hidden') return;
    api.get('/dashboard/stats/')
      .then(r => { setStats(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    // Poll every 30s (backend caches for 60s anyway — no need for 15s)
    intervalRef.current = setInterval(load, 30_000);

    // Immediately re-fetch when user comes back to the tab
    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  const fmt = (n: number) =>
    n !== undefined && n !== null
      ? new Intl.NumberFormat('fr-DZ').format(n) + ' DA'
      : '—';

  const kpis = [
    {
      label: lang === 'fr' ? 'Ventes ce mois' : 'مبيعات الشهر',
      value: fmt(stats?.ventes.ce_mois_total ?? 0),
      sub: `${stats?.ventes.ce_mois_count ?? 0} ${lang === 'fr' ? 'factures' : 'فاتورة'}`,
      icon: '💰', color: '#6366f1',
    },
    {
      label: lang === 'fr' ? 'Valeur du stock' : 'قيمة المخزون',
      value: fmt(stats?.produits.valeur_stock ?? 0),
      sub: `${stats?.produits.total ?? 0} ${lang === 'fr' ? 'produits actifs' : 'منتج نشط'}`,
      icon: '📦', color: '#06b6d4',
    },
    {
      label: lang === 'fr' ? 'Commandes en attente' : 'الطلبات المعلقة',
      value: String(stats?.commandes.en_attente ?? 0),
      sub: `${stats?.commandes.en_livraison ?? 0} ${lang === 'fr' ? 'en livraison' : 'قيد التوصيل'}`,
      icon: '🕒', color: '#f59e0b',
    },
    {
      label: lang === 'fr' ? 'Clients' : 'العملاء',
      value: String(stats?.clients ?? 0),
      sub: `${stats?.fournisseurs ?? 0} ${lang === 'fr' ? 'fournisseurs' : 'مورد'}`,
      icon: '👥', color: '#10b981',
    },
    {
      label: lang === 'fr' ? 'Vente Détail (mois)' : 'مبيعات تجزئة',
      value: fmt(stats?.ventes.detail_total ?? 0),
      sub: lang === 'fr' ? 'Ce mois-ci' : 'هذا الشهر',
      icon: '🛒', color: '#8b5cf6',
    },
    {
      label: lang === 'fr' ? 'Vente Gros (mois)' : 'مبيعات جملة',
      value: fmt(stats?.ventes.gros_total ?? 0),
      sub: lang === 'fr' ? 'Ce mois-ci' : 'هذا الشهر',
      icon: '🏪', color: '#ec4899',
    },
    {
      label: lang === 'fr' ? 'Stock faible' : 'مخزون منخفض',
      value: String(stats?.produits.stock_faible ?? 0),
      sub: lang === 'fr' ? 'Produits sous seuil' : 'منتجات تحت الحد',
      icon: '⚠️', color: (stats?.produits.stock_faible ?? 0) > 0 ? '#ef4444' : '#10b981',
    },
    {
      label: lang === 'fr' ? 'Bénéfice du mois' : 'ربح الشهر',
      value: fmt(stats?.benefice_mois ?? 0),
      sub: lang === 'fr' ? 'CA − coût d\'achat' : 'الإيرادات − التكلفة',
      icon: (stats?.benefice_mois ?? 0) >= 0 ? '📈' : '📉',
      color: (stats?.benefice_mois ?? 0) >= 0 ? '#10b981' : '#ef4444',
    },
  ];

  return (
    <AppLayout allowedRoles={['admin']}>
      <div className="page-header">
        <div>
          <h1>{lang === 'fr' ? 'Tableau de bord' : 'لوحة التحكم'}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
            {lang === 'fr' ? "Vue d'ensemble de votre activité • Mis à jour toutes les 15s" : 'نظرة عامة • يتجدد كل 15 ثانية'}
          </p>
        </div>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '4px 10px', borderRadius: '20px', border: '1px solid rgba(16,185,129,0.3)', fontWeight: 600 }}>
          <span className="pulse-dot" /> {lang === 'fr' ? 'En direct' : 'مباشر'}
        </span>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}>
          <div className="spinner" />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid-4" style={{ marginBottom: '24px' }}>
            {kpis.map((kpi, i) => (
              <div key={i} className="kpi-card" style={{ ['--kpi-color' as any]: kpi.color }}>
                <div className="kpi-icon" style={{ background: kpi.color + '22' }}>
                  <span style={{ fontSize: '18px' }}>{kpi.icon}</span>
                </div>
                <div className="kpi-label">{kpi.label}</div>
                <div className="kpi-value" style={{ fontSize: kpi.value.length > 12 ? '20px' : '26px' }}>
                  {kpi.value}
                </div>
                <div className="kpi-sub">{kpi.sub}</div>
              </div>
            ))}
          </div>

          {/* Sales chart */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-header">
              <h3 className="card-title">
                📈 {lang === 'fr' ? 'Évolution des ventes (7 derniers jours)' : 'تطور المبيعات (آخر 7 أيام)'}
              </h3>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={stats?.sales_chart || []} margin={{ top: 5, right: 10, left: 5, bottom: 5 }}>
                <defs>
                  <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--brand-primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--brand-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" stroke="var(--text-muted)" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis
                  stroke="var(--text-muted)"
                  tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                  tickFormatter={(v: number) => v > 0 ? `${(v / 1000).toFixed(0)}k` : '0'}
                />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  formatter={(v: any) => [`${new Intl.NumberFormat('fr-DZ').format(Number(v))} DA`, lang === 'fr' ? 'Ventes' : 'مبيعات']}
                  labelStyle={{ color: 'var(--text-secondary)', fontWeight: 600 }}
                />
                <Area type="monotone" dataKey="total" stroke="var(--brand-primary)" strokeWidth={2.5} fill="url(#grad)" dot={{ fill: 'var(--brand-primary)', strokeWidth: 0, r: 4 }} activeDot={{ r: 6, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Bottom charts */}
          <div className="grid-2">
            {/* Pie: détail vs gros */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">
                  {lang === 'fr' ? 'Répartition des ventes' : 'توزيع المبيعات'}
                </h3>
              </div>
              {stats && (stats.ventes.detail_total > 0 || stats.ventes.gros_total > 0) ? (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: lang === 'fr' ? 'Détail' : 'تجزئة', value: stats.ventes.detail_total || 0 },
                          { name: lang === 'fr' ? 'Gros' : 'جملة', value: stats.ventes.gros_total || 0 },
                        ]}
                        cx="50%" cy="50%" innerRadius={40} outerRadius={65}
                        paddingAngle={4} dataKey="value"
                      >
                        <Cell fill="#6366f1" />
                        <Cell fill="#06b6d4" />
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)', fontSize: '12px' }}
                        formatter={(v: any) => new Intl.NumberFormat('fr-DZ').format(Number(v)) + ' DA'}
                      />
                      <Legend
                        formatter={(value) => <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '13px' }}>
                  {lang === 'fr' ? 'Aucune vente ce mois-ci' : 'لا توجد مبيعات هذا الشهر'}
                </div>
              )}
            </div>

            {/* Status panel */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">
                  {lang === 'fr' ? 'État des opérations' : 'حالة العمليات'}
                </h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {[
                  {
                    label: lang === 'fr' ? 'Commandes en attente de confirmation' : 'طلبات تنتظر التأكيد',
                    value: stats?.commandes.en_attente ?? 0,
                    color: '#f59e0b',
                    urgent: (stats?.commandes.en_attente ?? 0) > 0,
                  },
                  {
                    label: lang === 'fr' ? 'Livraisons en cours' : 'توصيلات جارية',
                    value: stats?.commandes.en_livraison ?? 0,
                    color: '#3b82f6',
                    urgent: false,
                  },
                  {
                    label: lang === 'fr' ? 'Produits sous seuil minimum' : 'منتجات دون الحد الأدنى',
                    value: stats?.produits.stock_faible ?? 0,
                    color: '#ef4444',
                    urgent: (stats?.produits.stock_faible ?? 0) > 0,
                  },
                  {
                    label: lang === 'fr' ? 'Total produits actifs' : 'إجمالي المنتجات النشطة',
                    value: stats?.produits.total ?? 0,
                    color: '#10b981',
                    urgent: false,
                  },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: '8px', border: item.urgent ? `1px solid ${item.color}33` : '1px solid transparent' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, flexShrink: 0, boxShadow: item.urgent ? `0 0 6px ${item.color}` : 'none' }} />
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{item.label}</span>
                    </div>
                    <span style={{ fontSize: '22px', fontWeight: 900, color: item.urgent && item.value > 0 ? item.color : 'var(--text-primary)', minWidth: '36px', textAlign: 'right' }}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </AppLayout>
  );
}
