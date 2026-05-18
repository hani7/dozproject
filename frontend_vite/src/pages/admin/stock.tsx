import { useState, useEffect } from 'react';
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
  const [form, setForm] = useState({ produit: '', type_mouvement: 'entree', motif: 'ajustement', quantite: '', reference: '', notes: '' });

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

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>{lang === 'fr' ? 'Date' : 'التاريخ'}</th>
              <th>{lang === 'fr' ? 'Produit' : 'المنتج'}</th>
              <th>{lang === 'fr' ? 'Type' : 'النوع'}</th>
              <th>{lang === 'fr' ? 'Motif' : 'السبب'}</th>
              <th>{lang === 'fr' ? 'Quantité' : 'الكمية'}</th>
              <th>{lang === 'fr' ? 'Avant' : 'قبل'}</th>
              <th>{lang === 'fr' ? 'Après' : 'بعد'}</th>
              <th>{lang === 'fr' ? 'Référence' : 'المرجع'}</th>
            </tr>
          </thead>
          <tbody>
            {movements.map(m => (
              <tr key={m.id}>
                <td style={{ fontSize: '12px' }}>{new Date(m.created_at).toLocaleDateString()}</td>
                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{m.produit_nom}</td>
                <td>
                  <span className={`badge ${typeColors[m.type_mouvement]}`}>
                    {m.type_mouvement === 'entree' ? <TrendingUp size={10} /> : m.type_mouvement === 'sortie' ? <TrendingDown size={10} /> : null}
                    {typeLabels[m.type_mouvement]?.[lang] || m.type_mouvement}
                  </span>
                </td>
                <td style={{ fontSize: '12px' }}>{m.motif}</td>
                <td style={{ fontWeight: 700 }}>
                  <span style={{ color: m.type_mouvement === 'entree' ? '#10b981' : m.type_mouvement === 'sortie' ? '#ef4444' : '#f59e0b' }}>
                    {m.type_mouvement === 'entree' ? '+' : m.type_mouvement === 'sortie' ? '-' : ''}{m.quantite}
                  </span>
                </td>
                <td style={{ color: 'var(--text-muted)' }}>{m.stock_avant}</td>
                <td style={{ fontWeight: 600 }}>{m.stock_apres}</td>
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
