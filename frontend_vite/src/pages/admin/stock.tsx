import { useState, useEffect, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { useLang } from '@/contexts/LangContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Search, TrendingUp, TrendingDown } from 'lucide-react';
import type { StockMovement, Product } from '@/lib/types';

export default function StockPage() {
  const { lang } = useLang();
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [modal, setModal] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ produit: '', type_mouvement: 'entree', motif: 'ajustement', quantite: '', reference: '', notes: '' });
  const [typeFilter, setTypeFilter] = useState(''); // '' | 'entree' | 'sortie' | 'ajustement'
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [summaryTab, setSummaryTab] = useState<'sortie' | 'entree'>('sortie');

  const todaySummary = useMemo(() => {
    // We compute local date to match what user sees
    // Using simple approach: date string format matches what we do below
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    return movements.reduce((acc, m) => {
      // Check if created_at starts with today's YYYY-MM-DD
      const mDate = new Date(m.created_at).toISOString().split('T')[0];
      if (mDate === todayStr) {
        if (!acc[m.produit_nom]) acc[m.produit_nom] = { entree: 0, sortie: 0 };
        if (m.type_mouvement === 'entree') acc[m.produit_nom].entree += Number(m.quantite);
        if (m.type_mouvement === 'sortie') acc[m.produit_nom].sortie += Number(m.quantite);
      }
      return acc;
    }, {} as Record<string, { entree: number; sortie: number }>);
  }, [movements]);

  const load = () => api.get('/stock/').then(r => setMovements(r.data.results || r.data));
  useEffect(() => {
    load();
    api.get('/products/').then(r => setProducts(r.data.results || r.data));
  }, []);

  const save = async () => {
    try {
      await api.post('/stock/', { ...form, produit: Number(form.produit), quantite: Number(form.quantite) });
      toast.success(lang === 'fr' ? 'Mouvement enregistré!' : 'تم تسجيل الحركة!');
      setModal(false);
      load();
    } catch (e: any) { toast.error(JSON.stringify(e?.response?.data || 'Erreur')); }
  };

  const typeColors: Record<string, string> = { entree: 'badge-success', sortie: 'badge-danger', ajustement: 'badge-warning' };
  const typeLabels: Record<string, Record<string, string>> = {
    entree: { fr: 'Entrée', ar: 'دخول' },
    sortie: { fr: 'Sortie', ar: 'خروج' },
    ajustement: { fr: 'Ajustement', ar: 'تعديل' },
  };

  return (
    <AppLayout allowedRoles={['admin']}>
      <div className="page-header">
        <div>
          <h1>{lang === 'fr' ? 'Gestion du Stock' : 'إدارة المخزون'}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{lang === 'fr' ? 'Journal des mouvements' : 'سجل الحركات'}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={15} /> {lang === 'fr' ? 'Nouveau mouvement' : 'حركة جديدة'}</button>
      </div>

      {/* TODAY SUMMARY */}
      <div className="card" style={{ padding: '16px', marginBottom: '20px', border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-secondary)' }}>
            {lang === 'fr' ? "Aujourd'hui :" : "اليوم:"} {new Date().toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'ar-DZ')}
          </div>
          <div style={{ display: 'flex', background: 'var(--bg-elevated)', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <button 
              onClick={() => setSummaryTab('sortie')} 
              style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 700, border: 'none', background: summaryTab === 'sortie' ? '#ef4444' : 'transparent', color: summaryTab === 'sortie' ? 'white' : 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s' }}>
              ↓ {lang === 'fr' ? 'Sorties' : 'مخرجات'}
            </button>
            <button 
              onClick={() => setSummaryTab('entree')} 
              style={{ padding: '6px 12px', fontSize: '12px', fontWeight: 700, border: 'none', background: summaryTab === 'entree' ? '#10b981' : 'transparent', color: summaryTab === 'entree' ? 'white' : 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s' }}>
              ↑ {lang === 'fr' ? 'Entrées' : 'مُدخلات'}
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          {Object.entries(todaySummary).filter(([_, totals]) => totals[summaryTab] > 0).length === 0 ? (
            <div style={{ gridColumn: '1 / -1', fontSize: '12px', color: 'var(--text-muted)' }}>{lang === 'fr' ? "Aucun mouvement aujourd'hui" : 'لا توجد حركات اليوم'}</div>
          ) : (
            Object.entries(todaySummary).map(([produit, totals]) => {
              if (totals[summaryTab] === 0) return null;
              return (
                <div key={produit} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{produit}</span>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: summaryTab === 'sortie' ? '#ef4444' : '#10b981', background: summaryTab === 'sortie' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', padding: '2px 6px', borderRadius: '4px', flexShrink: 0 }}>
                    {totals[summaryTab]} ctn
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 160 }}>
          <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="form-control" style={{ paddingLeft: 28, fontSize: '13px' }} placeholder={lang === 'fr' ? 'Produit ou référence...' : 'منتج أو مرجع...'} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {/* Type filter */}
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
          {[{ v: '', label: lang === 'fr' ? 'Tous' : 'الكل' }, { v: 'entree', label: lang === 'fr' ? '↑ Entrée' : '↑ دخول' }, { v: 'sortie', label: lang === 'fr' ? '↓ Sortie' : '↓ خروج' }].map(({ v, label }) => (
            <button key={v} onClick={() => setTypeFilter(v)}
              style={{ padding: '7px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', border: typeFilter === v ? 'none' : '1px solid var(--border)', background: typeFilter === v ? (v === 'entree' ? '#10b981' : v === 'sortie' ? '#ef4444' : 'var(--brand-primary)') : 'var(--bg-elevated)', color: typeFilter === v ? '#fff' : 'var(--text-secondary)', transition: 'all 0.15s' }}>
              {label}
            </button>
          ))}
        </div>
        {/* Date range */}
        <input type="date" className="form-control" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ fontSize: '12px', flex: '0 0 140px' }} title={lang === 'fr' ? 'De' : 'من'} />
        <span style={{ color: 'var(--text-muted)', fontSize: '12px', flexShrink: 0 }}>→</span>
        <input type="date" className="form-control" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ fontSize: '12px', flex: '0 0 140px' }} title={lang === 'fr' ? 'À' : 'إلى'} />
        {(typeFilter || dateFrom || dateTo || search) && (
          <button onClick={() => { setSearch(''); setTypeFilter(''); setDateFrom(''); setDateTo(''); }} style={{ fontSize: '11px', padding: '6px 10px', borderRadius: '7px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
            × {lang === 'fr' ? 'Réinit.' : 'إعادة'}
          </button>
        )}
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>{lang === 'fr' ? 'Date' : 'التاريخ'}</th>
              <th>{lang === 'fr' ? 'Produit' : 'المنتج'}</th>
              <th>{lang === 'fr' ? 'Type' : 'النوع'}</th>
              <th>{lang === 'fr' ? 'Motif' : 'السبب'}</th>
              <th>{lang === 'fr' ? 'Quantité' : 'الكمية'}</th>
              <th style={{ color: 'var(--text-muted)' }}>{lang === 'fr' ? 'Avant (ctn)' : 'قبل (ctn)'}</th>
              <th style={{ color: '#006045', fontWeight: 800 }}>{lang === 'fr' ? 'Stock (ctn)' : 'المخزون (ctn)'}</th>
              <th>{lang === 'fr' ? 'Référence' : 'المرجع'}</th>
            </tr>
          </thead>
          <tbody>
            {movements.filter(m => {
              const q = search.toLowerCase();
              const matchSearch = !q || m.produit_nom.toLowerCase().includes(q) || m.reference?.toLowerCase().includes(q);
              const matchType = !typeFilter || m.type_mouvement === typeFilter;
              const mDate = new Date(m.created_at).toISOString().split('T')[0];
              const matchFrom = !dateFrom || mDate >= dateFrom;
              const matchTo   = !dateTo   || mDate <= dateTo;
              return matchSearch && matchType && matchFrom && matchTo;
            }).map(m => (
              <tr key={m.id}>
                <td style={{ fontSize: '12px' }}>
                  <div style={{ fontWeight: 600 }}>{new Date(m.created_at).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'ar-DZ')}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {new Date(m.created_at).toLocaleTimeString(lang === 'fr' ? 'fr-FR' : 'ar-DZ', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </td>
                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{m.produit_nom}</td>
                <td>
                  <span className={`badge ${typeColors[m.type_mouvement]}`}>
                    {m.type_mouvement === 'entree' ? <TrendingUp size={10} /> : m.type_mouvement === 'sortie' ? <TrendingDown size={10} /> : null}
                    {typeLabels[m.type_mouvement]?.[lang] || m.type_mouvement}
                  </span>
                </td>
                <td style={{ fontSize: '12px' }}>
                  {m.motif === 'retour' ? (
                    <span style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6', borderRadius: '6px', padding: '2px 8px', fontWeight: 700, fontSize: '11px' }}>↩ retour</span>
                  ) : m.motif === 'non_conforme' ? (
                    <span style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706', borderRadius: '6px', padding: '2px 8px', fontWeight: 700, fontSize: '11px' }}>⚠ non-conforme</span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>{m.motif}</span>
                  )}
                </td>
                <td style={{ fontWeight: 700 }}>
                  <span style={{ color: m.type_mouvement === 'entree' ? '#10b981' : m.type_mouvement === 'sortie' ? '#ef4444' : '#f59e0b' }}>
                    {m.type_mouvement === 'entree' ? '+' : m.type_mouvement === 'sortie' ? '-' : ''}{m.quantite}
                  </span>
                </td>
                <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{m.stock_avant} <span style={{ fontSize: '10px' }}>ctn</span></td>
                <td style={{ fontWeight: 800, fontSize: '14px' }}>
                  <span style={{ color: 'var(--brand-primary)' }}>{m.stock_apres}</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: '2px' }}>ctn</span>
                </td>
                <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{m.reference || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">{lang === 'fr' ? 'Nouveau mouvement de stock' : 'حركة مخزون جديدة'}</div>
            <div className="form-group">
              <label className="form-label">{lang === 'fr' ? 'Produit' : 'المنتج'}</label>
              <select className="form-control" value={form.produit} onChange={e => setForm(f => ({ ...f, produit: e.target.value }))}>
                <option value="">{lang === 'fr' ? '-- Sélectionner --' : '-- اختر --'}</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.nom} — {p.stock_palettes} pal. + {p.stock_cartons_restants} ctn ({p.stock_actuel} cartons total)
                  </option>
                ))}
              </select>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">{lang === 'fr' ? 'Type' : 'النوع'}</label>
                <select className="form-control" value={form.type_mouvement} onChange={e => setForm(f => ({ ...f, type_mouvement: e.target.value }))}>
                  <option value="entree">{lang === 'fr' ? 'Entrée' : 'دخول'}</option>
                  <option value="sortie">{lang === 'fr' ? 'Sortie' : 'خروج'}</option>
                  <option value="ajustement">{lang === 'fr' ? 'Ajustement' : 'تعديل'}</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{lang === 'fr' ? 'Motif' : 'السبب'}</label>
                <select className="form-control" value={form.motif} onChange={e => setForm(f => ({ ...f, motif: e.target.value }))}>
                  <option value="achat">{lang === 'fr' ? 'Achat fournisseur' : 'شراء من مورد'}</option>
                  <option value="vente">{lang === 'fr' ? 'Vente client' : 'بيع لعميل'}</option>
                  <option value="retour">{lang === 'fr' ? 'Retour' : 'إرجاع'}</option>
                  <option value="non_conforme">{lang === 'fr' ? 'Non Conforme' : 'غير مطابق'}</option>
                  <option value="perte">{lang === 'fr' ? 'Perte/Casse' : 'خسارة/كسر'}</option>
                  <option value="ajustement">{lang === 'fr' ? 'Ajustement' : 'تعديل'}</option>
                </select>
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">{lang === 'fr' ? 'Quantité (en cartons)' : 'الكمية (بالكرتون)'}</label>
                <input className="form-control" type="number" min="1" value={form.quantite} onChange={e => setForm(f => ({ ...f, quantite: e.target.value }))} placeholder={lang === 'fr' ? 'Nombre de cartons' : 'عدد الكرتون'} />
                {form.produit && (() => {
                  const p = products.find((pr: any) => String(pr.id) === form.produit);
                  if (!p || !form.quantite) return null;
                  const cpp = p.cartons_par_palette || 1;
                  const palettes = Math.floor(Number(form.quantite) / cpp);
                  const reste = Number(form.quantite) % cpp;
                  return (
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      = {palettes} palette{palettes !== 1 ? 's' : ''}{reste > 0 ? ` + ${reste} ctn` : ''}
                    </p>
                  );
                })()}
              </div>
              <div className="form-group">
                <label className="form-label">{lang === 'fr' ? 'Référence' : 'المرجع'}</label>
                <input className="form-control" value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">{lang === 'fr' ? 'Notes' : 'ملاحظات'}</label>
              <textarea className="form-control" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setModal(false)}>{lang === 'fr' ? 'Annuler' : 'إلغاء'}</button>
              <button className="btn btn-primary" onClick={save}>{lang === 'fr' ? 'Enregistrer' : 'حفظ'}</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
