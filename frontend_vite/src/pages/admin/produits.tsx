import { useState, useEffect, useRef } from 'react';
import AppLayout from '@/components/AppLayout';
import { useLang } from '@/contexts/LangContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Search, AlertTriangle, ImagePlus, X } from 'lucide-react';
import type { Product } from '@/lib/types';
import Pagination, { usePagination } from '@/components/Pagination';

const MEDIA_BASE = 'http://localhost:8001';

export default function ProduitsPage() {
  const { lang } = useLang();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    nom: '', code: '', cartons_par_palette: '1', bouteilles_par_carton: '1',
    prix_achat: '', prix_detail: '', prix_gros: '',
    seuil_volume: '0', prix_volume_detail: '',
    stock_actuel: '', stock_minimum: '5', description: '', actif: true,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fr = lang === 'fr';
  const { page, pageSize, paginated: pagedProducts, total, setPage, setPageSize } = usePagination(products, 25);

  // Close modal on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setModal(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const load = async () => {
    const res = await api.get('/products/', { params: { search } });
    setProducts(res.data.results || res.data);
    setLoading(false);
  };
  useEffect(() => { load(); }, [search]);

  const openAdd = () => {
    setEditing(null);
    setFormErrors({});
    setImageFile(null);
    setImagePreview(null);
    setForm({ nom: '', code: '', cartons_par_palette: '1', bouteilles_par_carton: '1', prix_achat: '', prix_detail: '', prix_gros: '', seuil_volume: '0', prix_volume_detail: '', stock_actuel: '0', stock_minimum: '5', description: '', actif: true });
    setModal(true);
  };

  const openEdit = (p: Product) => {
    setFormErrors({});
    setEditing(p);
    setImageFile(null);
    setImagePreview(p.image ? (p.image.startsWith('http') ? p.image : `${MEDIA_BASE}${p.image}`) : null);
    setForm({
      nom: p.nom,
      code: p.code || '',
      cartons_par_palette: String(p.cartons_par_palette),
      bouteilles_par_carton: String((p as any).bouteilles_par_carton ?? 1),
      prix_achat: String(p.prix_achat), prix_detail: String(p.prix_detail), prix_gros: String(p.prix_gros),
      seuil_volume: String(p.seuil_volume || 0), prix_volume_detail: String(p.prix_volume_detail || ''),
      stock_actuel: String(p.stock_actuel), stock_minimum: String(p.stock_minimum),
      description: p.description || '', actif: p.actif,
    });
    setModal(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const save = async () => {
    try {
      const hasNewImage = !!imageFile;

      if (hasNewImage) {
        // Use FormData for file upload
        const fd = new FormData();
        fd.append('nom', form.nom);
        if (form.code) fd.append('code', form.code);
        fd.append('cartons_par_palette', String(Number(form.cartons_par_palette)));
        fd.append('bouteilles_par_carton', String(Number(form.bouteilles_par_carton)));
        fd.append('prix_achat', String(Number(form.prix_achat)));
        fd.append('prix_detail', String(Number(form.prix_detail)));
        fd.append('prix_gros', String(Number(form.prix_gros)));
        fd.append('seuil_volume', String(Number(form.seuil_volume)));
        fd.append('prix_volume_detail', String(Number(form.prix_volume_detail)));
        fd.append('stock_minimum', String(Number(form.stock_minimum)));
        fd.append('description', form.description);
        fd.append('actif', String(form.actif));
        if (!editing) fd.append('stock_actuel', String(Number(form.stock_actuel)));
        fd.append('image', imageFile);

        if (editing) await api.patch(`/products/${editing.id}/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        else await api.post('/products/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        // JSON payload (no new image)
        const payload: Record<string, any> = {
          nom: form.nom,
          ...(form.code ? { code: form.code } : {}),
          cartons_par_palette: Number(form.cartons_par_palette),
          bouteilles_par_carton: Number(form.bouteilles_par_carton),
          prix_achat: Number(form.prix_achat),
          prix_detail: Number(form.prix_detail),
          prix_gros: Number(form.prix_gros),
          seuil_volume: Number(form.seuil_volume),
          prix_volume_detail: Number(form.prix_volume_detail),
          stock_minimum: Number(form.stock_minimum),
          description: form.description,
          actif: form.actif,
        };
        if (!editing) payload.stock_actuel = Number(form.stock_actuel);
        if (editing) await api.patch(`/products/${editing.id}/`, payload);
        else await api.post('/products/', payload);
      }

      toast.success(fr ? 'Enregistré!' : 'تم الحفظ!');
      setModal(false);
      load();
    } catch (e: any) {
      const d = e?.response?.data;
      if (d && typeof d === 'object') {
        const errs: Record<string, string> = {};
        Object.entries(d).forEach(([k, v]) => {
          errs[k] = Array.isArray(v) ? v.join(', ') : String(v);
        });
        setFormErrors(errs);
        toast.error(fr ? 'Veuillez corriger les erreurs ci-dessous.' : 'يرجى تصحيح الأخطاء أدناه.');
      } else {
        toast.error(fr ? 'Erreur serveur' : 'خطأ في الخادم');
      }
    }
  };

  const del = async (id: number) => {
    if (!confirm(fr ? 'Supprimer ce produit?' : 'حذف هذا المنتج؟')) return;
    try {
      await api.delete(`/products/${id}/`);
      toast.success(fr ? 'Supprimé' : 'تم الحذف');
      load();
    } catch (e: any) {
      const d = e?.response?.data;
      toast.error(d?.error || (fr ? 'Erreur lors de la suppression' : 'خطأ أثناء الحذف'));
    }
  };

  // Margin helpers
  const marge = (vente: string, achat: string, cpp: string) => {
    const v = Number(vente), a = Number(achat), c = Number(cpp);
    if (!v || !c || !a) return null;
    const coutCarton = a / c;
    return { pct: ((v - coutCarton) / v * 100).toFixed(1), val: (v - coutCarton).toFixed(2) };
  };

  return (
    <AppLayout allowedRoles={['admin']}>
      <div className="page-header">
        <div>
          <h1>{fr ? 'Produits' : 'المنتجات'}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            {products.length} {fr ? 'produits' : 'منتج'}
          </p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={15} /> {fr ? 'Ajouter' : 'إضافة'}</button>
      </div>

      {/* Search */}
      <div className="search-bar" style={{ marginBottom: '20px' }}>
        <div className="search-input-wrap" style={{ maxWidth: 340 }}>
          <Search />
          <input className="form-control" placeholder={fr ? 'Rechercher produit...' : 'بحث...'} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th style={{ width: 56 }}></th>
              <th>{fr ? 'Produit' : 'المنتج'}</th>
              <th>🏭 {fr ? 'Palette / Cartons' : 'باليت / كرتون'}</th>
              <th style={{ color: '#8b5cf6', fontWeight: 700 }}>🍾 {fr ? 'Btl/Ctn' : 'زجاجة/كرتون'}</th>
              <th>💰 {fr ? 'Achat (palette)' : 'شراء (باليت)'}</th>
              <th>📦 {fr ? 'Vente Détail (carton)' : 'تجزئة (كرتون)'}</th>
              <th>🏪 {fr ? 'Vente Gros (carton)' : 'جملة (كرتون)'}</th>
              <th>{fr ? 'Stock' : 'المخزون'}</th>
              <th style={{ color: 'var(--brand-primary)', fontWeight: 800 }}>📦 {fr ? 'Stock (ctn)' : 'مخزون (كرتون)'}</th>
              <th>{fr ? 'Statut' : 'الحالة'}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: '40px' }}><div className="spinner" /></td></tr>
            ) : pagedProducts.map(p => (
              <tr key={p.id}>
                {/* Image thumbnail */}
                <td style={{ padding: '8px', textAlign: 'center' }}>
                  {p.image ? (
                    <img
                      src={p.image.startsWith('http') ? p.image : `${MEDIA_BASE}${p.image}`}
                      alt={p.nom}
                      style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-elevated)' }}
                    />
                  ) : (
                    <div style={{ width: 44, height: 44, borderRadius: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                      📦
                    </div>
                  )}
                </td>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.nom}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.code}</div>
                </td>
                <td style={{ fontSize: '12px' }}>
                  <span style={{ fontWeight: 700, color: '#8b5cf6' }}>1 palette</span>
                  <span style={{ color: 'var(--text-muted)' }}> = {p.cartons_par_palette} cartons</span>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 800, fontSize: '15px', color: '#8b5cf6' }}>{(p as any).bouteilles_par_carton ?? 1}</div>
                  <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 600 }}>btl/ctn</div>
                </td>
                <td style={{ fontWeight: 600, color: '#8b5cf6' }}>{Number(p.prix_achat).toLocaleString('fr-DZ')} DA</td>
                <td>
                  <div style={{ fontWeight: 600, color: '#06b6d4' }}>{Number(p.prix_detail).toLocaleString('fr-DZ')} DA</div>
                  {(() => { const m = marge(String(p.prix_detail), String(p.prix_achat), String(p.cartons_par_palette)); return m ? (
                    <div style={{ fontSize: '10px', color: '#10b981', fontWeight: 700 }}>+{m.pct}% {fr ? 'bénéfice' : 'فائدة'}</div>
                  ) : null; })()}
                </td>
                <td>
                  <div style={{ fontWeight: 600, color: '#6366f1' }}>{Number(p.prix_gros).toLocaleString('fr-DZ')} DA</div>
                  {(() => { const m = marge(String(p.prix_gros), String(p.prix_achat), String(p.cartons_par_palette)); return m ? (
                    <div style={{ fontSize: '10px', color: '#10b981', fontWeight: 700 }}>+{m.pct}% {fr ? 'bénéfice' : 'فائدة'}</div>
                  ) : null; })()}
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    {p.stock_faible && <AlertTriangle size={12} color="#ef4444" />}
                    <div>
                      <span style={{ fontWeight: 700, color: p.stock_faible ? '#ef4444' : 'var(--text-primary)' }}>
                        {p.stock_palettes} pal.
                      </span>
                      {p.stock_cartons_restants > 0 && (
                        <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}> + {p.stock_cartons_restants} ctn</span>
                      )}
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        ({p.stock_actuel} ctn / min {p.stock_minimum})
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                    <span style={{
                      fontWeight: 900, fontSize: '20px',
                      color: p.stock_faible ? '#ef4444' : 'var(--brand-primary)'
                    }}>{p.stock_actuel}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>ctn</span>
                    {p.stock_faible && (
                      <span style={{ fontSize: '9px', background: 'rgba(239,68,68,0.12)', color: '#ef4444', borderRadius: '4px', padding: '1px 5px', fontWeight: 700 }}>⚠ FAIBLE</span>
                    )}
                  </div>
                </td>
                <td>
                  <span className={`badge ${p.actif ? 'badge-success' : 'badge-danger'}`}>
                    {p.actif ? (fr ? 'Actif' : 'نشط') : (fr ? 'Inactif' : 'غير نشط')}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button className="btn btn-secondary btn-icon" onClick={() => openEdit(p)}><Pencil size={12} /></button>
                    <button className="btn btn-danger btn-icon" onClick={() => del(p.id)}><Trash2 size={12} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div className="modal-title" style={{ margin: 0 }}>
                {editing ? (fr ? 'Modifier produit' : 'تعديل المنتج') : (fr ? 'Nouveau produit' : 'منتج جديد')}
              </div>
              <button
                onClick={() => setModal(false)}
                style={{
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  borderRadius: '8px', width: 32, height: 32,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'var(--text-muted)',
                  transition: 'all 0.15s',
                  flexShrink: 0,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#ef444420'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#ef444440'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                title="Fermer (Esc)"
              >
                <X size={16} />
              </button>
            </div>

            {/* Image Upload */}
            <div style={{ marginBottom: '16px' }}>
              <label className="form-label">{fr ? 'Photo du produit' : 'صورة المنتج'}</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {/* Preview */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: 88, height: 88, borderRadius: '14px',
                    border: `2px dashed ${imagePreview ? 'var(--brand-primary)' : 'var(--border)'}`,
                    background: 'var(--bg-elevated)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', overflow: 'hidden', flexShrink: 0,
                    transition: 'border-color 0.2s',
                    position: 'relative',
                  }}
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      <ImagePlus size={24} />
                      <div style={{ fontSize: '10px', marginTop: '4px' }}>{fr ? 'Ajouter' : 'إضافة'}</div>
                    </div>
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleImageChange}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => fileInputRef.current?.click()}
                    style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <ImagePlus size={14} />
                    {fr ? 'Choisir une image' : 'اختر صورة'}
                  </button>
                  {imagePreview && (
                    <button
                      type="button"
                      className="btn btn-danger"
                      onClick={clearImage}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '5px 10px' }}
                    >
                      <X size={12} /> {fr ? 'Supprimer' : 'حذف'}
                    </button>
                  )}
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                    {fr ? 'PNG, JPG, WEBP — max 5 MB' : 'PNG, JPG, WEBP — حد أقصى 5 ميغابايت'}
                  </p>
                </div>
              </div>
            </div>

            {/* Basic info */}
            <div className="grid-2" style={{ marginBottom: '12px' }}>
              <div className="form-group">
                <label className="form-label">{fr ? 'Nom' : 'الاسم'} *</label>
                <input className={`form-control ${formErrors.nom ? 'input-error' : ''}`} value={form.nom} onChange={e => { setForm(f => ({ ...f, nom: e.target.value })); setFormErrors(er => ({ ...er, nom: '' })); }} />
                {formErrors.nom && <p style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px' }}>⚠ {formErrors.nom}</p>}
              </div>
              <div className="form-group">
                <label className="form-label">
                  {fr ? 'Code' : 'الرمز'}
                  <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: '6px', textTransform: 'none', letterSpacing: 0 }}>
                    ({fr ? 'optionnel' : 'اختياري'})
                  </span>
                </label>
                <input
                  className={`form-control ${formErrors.code ? 'input-error' : ''}`}
                  value={form.code}
                  placeholder={fr ? 'Auto-généré si vide' : 'يُنشأ تلقائياً إن ترك فارغاً'}
                  onChange={e => { setForm(f => ({ ...f, code: e.target.value })); setFormErrors(er => ({ ...er, code: '' })); }}
                />
                {formErrors.code && <p style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px' }}>⚠ {formErrors.code}</p>}
              </div>
            </div>

            {/* Palette config */}
            <div style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '12px', padding: '16px', marginBottom: '14px' }}>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#8b5cf6', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🏭 {fr ? 'Configuration Palette → Cartons' : 'إعداد الباليت → كرتون'}
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">{fr ? 'Cartons par palette' : 'كرتون في الباليت'}</label>
                  <input className={`form-control ${formErrors.cartons_par_palette ? 'input-error' : ''}`} type="number" min="1" value={form.cartons_par_palette}
                    onChange={e => { setForm(f => ({ ...f, cartons_par_palette: e.target.value })); setFormErrors(er => ({ ...er, cartons_par_palette: '' })); }} />
                  {formErrors.cartons_par_palette && <p style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px' }}>⚠ {formErrors.cartons_par_palette}</p>}
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {fr ? '1 palette = N cartons' : 'باليت 1 = N كرتون'}
                  </p>
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ color: '#8b5cf6' }}>🍾 {fr ? 'Bouteilles par carton' : 'زجاجات في الكرتون'}</label>
                  <input className={`form-control`} type="number" min="1" value={form.bouteilles_par_carton}
                    onChange={e => setForm(f => ({ ...f, bouteilles_par_carton: e.target.value }))}
                    style={{ borderColor: '#8b5cf644' }} />
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {fr ? '1 carton = N bouteilles (unités)' : '1 كرتون = N زجاجة'}
                    {form.bouteilles_par_carton && form.prix_detail && (
                      <span style={{ color: '#8b5cf6', fontWeight: 700, display: 'block' }}>
                        → {(Number(form.prix_detail) / Number(form.bouteilles_par_carton)).toFixed(2)} DA/btl (détail)
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="form-group" style={{ marginTop: '12px' }}>
                <label className="form-label">💰 {fr ? "Prix d'achat / palette" : 'سعر الشراء / باليت'}</label>
                <div style={{ position: 'relative' }}>
                  <input className={`form-control ${formErrors.prix_achat ? 'input-error' : ''}`} type="number" min="0" step="0.01" value={form.prix_achat}
                    onChange={e => { setForm(f => ({ ...f, prix_achat: e.target.value })); setFormErrors(er => ({ ...er, prix_achat: '' })); }}
                    style={{ borderColor: formErrors.prix_achat ? '#ef4444' : '#8b5cf644', paddingRight: '36px', fontWeight: 700 }} />
                  {formErrors.prix_achat && <p style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px' }}>⚠ {formErrors.prix_achat}</p>}
                  <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: '#8b5cf6', fontWeight: 700 }}>DA</span>
                </div>
                {form.prix_achat && form.cartons_par_palette && (
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    = {(Number(form.prix_achat) / Number(form.cartons_par_palette)).toFixed(2)} DA/carton
                  </p>
                )}
              </div>
            </div>

            {/* Dual sale prices */}
            <div style={{ border: '1px solid rgba(99,102,241,0.2)', borderRadius: '12px', overflow: 'hidden', marginBottom: '14px' }}>
              <div style={{ padding: '10px 16px', background: 'rgba(99,102,241,0.08)', borderBottom: '1px solid rgba(99,102,241,0.2)', fontWeight: 700, fontSize: '13px', color: 'var(--brand-primary)' }}>
                📦 {fr ? 'Prix de vente par CARTON' : 'سعر البيع بالكرتون'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                {/* Detail */}
                <div style={{ padding: '16px', borderRight: '1px solid rgba(99,102,241,0.15)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '20px' }}>📦</span>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#06b6d4' }}>{fr ? 'Prix Détail' : 'سعر التجزئة'}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{fr ? 'par carton · clients détail' : 'للكرتون · عملاء تجزئة'}</div>
                    </div>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input className="form-control" type="number" min="0" step="0.01" value={form.prix_detail}
                      onChange={e => setForm(f => ({ ...f, prix_detail: e.target.value }))}
                      style={{ borderColor: '#06b6d444', paddingRight: '36px', fontWeight: 700, fontSize: '16px' }} />
                    <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: '#06b6d4', fontWeight: 700 }}>DA</span>
                  </div>
                  {(() => { const m = marge(form.prix_detail, form.prix_achat, form.cartons_par_palette); return m ? (
                    <div style={{ fontSize: '11px', marginTop: '6px', color: '#10b981' }}>
                      {fr ? 'Marge:' : 'هامش:'} {m.pct}% · +{m.val} DA/ctn
                    </div>
                  ) : null; })()}

                  {/* Volume discount (Detail only) */}
                  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px dashed rgba(99,102,241,0.2)' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#8b5cf6', marginBottom: '8px' }}>
                      🌟 {fr ? 'Prix de Volume (Optionnel)' : 'سعر الكمية (اختياري)'}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div>
                        <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{fr ? 'À partir de (ctn)' : 'ابتداءً من (كرتون)'}</label>
                        <input className="form-control" type="number" min="0" value={form.seuil_volume}
                          onChange={e => setForm(f => ({ ...f, seuil_volume: e.target.value }))}
                          style={{ padding: '6px 8px', fontSize: '12px' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{fr ? 'Nouveau Prix' : 'السعر الجديد'}</label>
                        <div style={{ position: 'relative' }}>
                          <input className="form-control" type="number" min="0" step="0.01" value={form.prix_volume_detail}
                            onChange={e => setForm(f => ({ ...f, prix_volume_detail: e.target.value }))}
                            style={{ padding: '6px 24px 6px 8px', fontSize: '12px' }} />
                          <span style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', fontSize: '9px', color: '#06b6d4', fontWeight: 700 }}>DA</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* Gros */}
                <div style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '20px' }}>🏪</span>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#6366f1' }}>{fr ? 'Prix Gros' : 'سعر الجملة'}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{fr ? 'par carton · clients gros' : 'للكرتون · عملاء جملة'}</div>
                    </div>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input className="form-control" type="number" min="0" step="0.01" value={form.prix_gros}
                      onChange={e => setForm(f => ({ ...f, prix_gros: e.target.value }))}
                      style={{ borderColor: '#6366f144', paddingRight: '36px', fontWeight: 700, fontSize: '16px' }} />
                    <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '11px', color: '#6366f1', fontWeight: 700 }}>DA</span>
                  </div>
                  {(() => { const m = marge(form.prix_gros, form.prix_achat, form.cartons_par_palette); return m ? (
                    <div style={{ fontSize: '11px', marginTop: '6px', color: '#10b981' }}>
                      {fr ? 'Marge:' : 'هامش:'} {m.pct}% · +{m.val} DA/ctn
                    </div>
                  ) : null; })()}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <input type="checkbox" id="actif-check" checked={form.actif} onChange={e => setForm(f => ({ ...f, actif: e.target.checked }))} />
              <label htmlFor="actif-check" style={{ fontSize: '13px', cursor: 'pointer' }}>{fr ? 'Produit actif' : 'المنتج نشط'}</label>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setModal(false)}>{fr ? 'Annuler' : 'إلغاء'}</button>
              <button className="btn btn-primary" onClick={save}>{fr ? 'Enregistrer' : 'حفظ'}</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
