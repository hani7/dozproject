import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { useLang } from '@/contexts/LangContext';
import api from '@/lib/api';
import API_URL from '@/lib/config';
import toast from 'react-hot-toast';
import { Plus, CheckCircle, Eye, Search, FileText, Upload, X } from 'lucide-react';

const MEDIA_BASE = API_URL.replace('/api', '');

const STATUS_COLORS: Record<string, string> = { brouillon: 'badge-gray', confirme: 'badge-info', recu: 'badge-success', annule: 'badge-danger' };

export default function AchatsPage() {
  const { lang } = useLang();
  const [achats, setAchats] = useState<any[]>([]);
  const [fournisseurs, setFournisseurs] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [viewModal, setViewModal] = useState<any | null>(null);
  const [lignes, setLignes] = useState([{ produit: '', quantite: '', prix_unitaire: '' }]);
  const [form, setForm] = useState({ reference: '', fournisseur: '', date: '', mode_paiement: 'especes', notes: '' });
  const [editModal, setEditModal] = useState<any | null>(null); // achat being edited
  const [editRef, setEditRef] = useState('');                   // N° facture value
  const [editSaving, setEditSaving] = useState(false);
  const [factureFile, setFactureFile] = useState<File | null>(null);
  const [editFactureFile, setEditFactureFile] = useState<File | null>(null);
  const [shouldClearFacturePdf, setShouldClearFacturePdf] = useState(false);

  const load = () => api.get('/achats/').then(r => setAchats(r.data.results || r.data));
  useEffect(() => {
    load();
    api.get('/fournisseurs/').then(r => setFournisseurs(r.data.results || r.data));
    api.get('/products/').then(r => setProducts(r.data.results || r.data));
  }, []);

  const addLigne = () => setLignes(l => [...l, { produit: '', quantite: '', prix_unitaire: '' }]);
  const removeLigne = (i: number) => setLignes(l => l.filter((_, j) => j !== i));
  const updateLigne = (i: number, field: string, val: string) => setLignes(l => l.map((li, j) => j === i ? { ...li, [field]: val } : li));

  const save = async () => {
    try {
      const payload: any = {
        ...form,
        fournisseur: Number(form.fournisseur),
        lignes: lignes.map(l => ({
          produit: Number(l.produit),
          quantite: Number(l.quantite),
          prix_unitaire: Number(l.prix_unitaire),
          sous_total: Number(l.quantite) * Number(l.prix_unitaire)
        }))
      };

      if (factureFile) {
        const fd = new FormData();
        fd.append('reference', payload.reference);
        fd.append('fournisseur', String(payload.fournisseur));
        fd.append('date', payload.date);
        fd.append('mode_paiement', payload.mode_paiement);
        fd.append('notes', payload.notes || '');
        fd.append('lignes', JSON.stringify(payload.lignes));
        fd.append('facture_pdf', factureFile);
        await api.post('/achats/', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await api.post('/achats/', payload);
      }
      toast.success(lang === 'fr' ? 'Bon d\'achat créé!' : 'تم إنشاء أمر الشراء!');
      setModal(false);
      load();
    } catch (e: any) {
      const d = e?.response?.data;
      const msg = d && typeof d === 'object' ? JSON.stringify(d) : (lang === 'fr' ? 'Erreur' : 'خطأ');
      toast.error(msg);
    }
  };

  const recevoir = async (id: number) => {
    await api.post(`/achats/${id}/recevoir/`);
    toast.success(lang === 'fr' ? 'Stock mis à jour!' : 'تم تحديث المخزون!');
    load();
  };

  const openEditFacture = (a: any) => {
    setEditRef(a.reference);
    setEditFactureFile(null);
    setShouldClearFacturePdf(false);
    setEditModal(a);
  };

  const saveFacture = async () => {
    if (!editModal || !editRef.trim()) return;
    setEditSaving(true);
    try {
      if (editFactureFile) {
        const fd = new FormData();
        fd.append('reference', editRef.trim());
        fd.append('facture_pdf', editFactureFile);
        await api.patch(`/achats/${editModal.id}/`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        const payload: Record<string, any> = { reference: editRef.trim() };
        if (shouldClearFacturePdf) {
          payload.facture_pdf = null;
        }
        await api.patch(`/achats/${editModal.id}/`, payload);
      }
      toast.success(lang === 'fr' ? 'Bon d\'achat mis à jour ✓' : 'تم تحديث أمر الشراء ✓');
      setEditModal(null);
      load();
    } catch (e: any) {
      const d = e?.response?.data;
      const msg = d?.reference?.[0] || d?.detail || (lang === 'fr' ? 'Erreur lors de la mise à jour' : 'خطأ أثناء التحديث');
      toast.error(msg, { duration: 5000 });
    } finally { setEditSaving(false); }
  };

  const statusLabels: Record<string, Record<string, string>> = {
    brouillon: { fr: 'Brouillon', ar: 'مسودة' },
    confirme: { fr: 'Confirmé', ar: 'مؤكد' },
    recu: { fr: 'Reçu', ar: 'مستلم' },
    annule: { fr: 'Annulé', ar: 'ملغى' },
  };

  const filtered = achats.filter(a => {
    const q = search.toLowerCase();
    return !q || a.reference?.toLowerCase().includes(q) || a.fournisseur_nom?.toLowerCase().includes(q);
  });

  return (
    <AppLayout allowedRoles={['admin']}>
      <div className="page-header">
        <div>
          <h1>{lang === 'fr' ? "Bons d'Achat" : 'أوامر الشراء'}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{achats.length} {lang === 'fr' ? 'bons' : 'أمر'}</p>
        </div>
        <button className="btn btn-primary" onClick={() => {
          const autoFournisseur = fournisseurs.length === 1 ? String(fournisseurs[0].id) : '';
          setForm({ reference: `BA-${Date.now()}`, fournisseur: autoFournisseur, date: new Date().toISOString().split('T')[0], mode_paiement: 'especes', notes: '' });
          setLignes([{ produit: '', quantite: '', prix_unitaire: '' }]);
          setFactureFile(null);
          setModal(true);
        }}>
          <Plus size={15} /> {lang === 'fr' ? 'Nouveau bon' : 'أمر جديد'}
        </button>
      </div>

      <div className="search-bar" style={{ marginBottom: '16px' }}>
        <div className="search-input-wrap" style={{ maxWidth: 360 }}>
          <Search />
          <input className="form-control" placeholder={lang === 'fr' ? 'Rechercher référence ou fournisseur...' : 'بحث عن مرجع أو مورد...'} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>{lang === 'fr' ? 'Référence' : 'المرجع'}</th>
              <th>{lang === 'fr' ? 'Fournisseur' : 'المورد'}</th>
              <th>{lang === 'fr' ? 'Date' : 'التاريخ'}</th>
              <th>{lang === 'fr' ? 'Total' : 'المجموع'}</th>
              <th>{lang === 'fr' ? 'Payé' : 'المدفوع'}</th>
              <th>{lang === 'fr' ? 'Mode' : 'الطريقة'}</th>
              <th>{lang === 'fr' ? 'Statut' : 'الحالة'}</th>
              <th>{lang === 'fr' ? 'Actions' : 'الإجراءات'}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(a => (
              <tr key={a.id}>
                <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{a.reference}</span>
                    {a.facture_pdf && (
                      <a
                        href={a.facture_pdf.startsWith('http') ? a.facture_pdf : `${MEDIA_BASE}${a.facture_pdf}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={lang === 'fr' ? 'Voir la facture PDF' : 'عرض الفاتورة PDF'}
                        style={{ display: 'inline-flex', alignItems: 'center', color: '#ef4444', textDecoration: 'none' }}
                      >
                        <FileText size={15} />
                      </a>
                    )}
                  </div>
                </td>
                <td>{a.fournisseur_nom}</td>
                <td style={{ fontSize: '12px' }}>{a.date}</td>
                <td style={{ fontWeight: 600 }}>{a.montant_total?.toLocaleString()} DA</td>
                <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{a.montant_paye?.toLocaleString()} DA</td>
                <td style={{ fontSize: '12px' }}>{a.mode_paiement}</td>
                <td><span className={`badge ${STATUS_COLORS[a.statut]}`}>{statusLabels[a.statut]?.[lang]}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button className="btn btn-secondary btn-icon" title={lang === 'fr' ? 'Voir' : 'عرض'} onClick={() => setViewModal(a)}><Eye size={12} /></button>
                    <button
                      className="btn btn-secondary btn-icon"
                      title={lang === 'fr' ? 'Modifier N° Facture' : 'تعديل رقم الفاتورة'}
                      onClick={() => openEditFacture(a)}
                      style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.3)', color: '#6366f1' }}
                    >
                      ✏️
                    </button>
                    {a.statut !== 'recu' && a.statut !== 'annule' && (
                      <button className="btn btn-success btn-sm" onClick={() => recevoir(a.id)}>
                        <CheckCircle size={12} /> {lang === 'fr' ? 'Recevoir' : 'استلام'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-title">{lang === 'fr' ? "Nouveau bon d'achat" : 'أمر شراء جديد'}</div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">{lang === 'fr' ? 'Référence' : 'المرجع'}</label>
                <input className="form-control" value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">{lang === 'fr' ? 'Fournisseur' : 'المورد'}</label>
                <select className="form-control" value={form.fournisseur} onChange={e => setForm(f => ({ ...f, fournisseur: e.target.value }))}>
                  <option value="">--</option>
                  {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{lang === 'fr' ? 'Date' : 'التاريخ'}</label>
                <input className="form-control" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">{lang === 'fr' ? 'Mode de paiement' : 'طريقة الدفع'}</label>
                <select className="form-control" value={form.mode_paiement} onChange={e => setForm(f => ({ ...f, mode_paiement: e.target.value }))}>
                  <option value="especes">{lang === 'fr' ? 'Espèces' : 'نقداً'}</option>
                  <option value="virement">{lang === 'fr' ? 'Virement' : 'تحويل'}</option>
                  <option value="cheque">{lang === 'fr' ? 'Chèque' : 'شيك'}</option>
                  <option value="credit">{lang === 'fr' ? 'Crédit' : 'آجل'}</option>
                </select>
              </div>
            </div>

            {/* PDF Upload */}
            <div className="form-group" style={{ marginBottom: '16px', marginTop: '8px' }}>
              <label className="form-label">{lang === 'fr' ? 'Facture PDF (optionnel)' : 'فاتورة PDF (اختياري)'}</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="file"
                  accept=".pdf"
                  id="facture-pdf-upload"
                  style={{ display: 'none' }}
                  onChange={e => setFactureFile(e.target.files?.[0] || null)}
                />
                <label
                  htmlFor="facture-pdf-upload"
                  className="btn btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}
                >
                  <Upload size={14} />
                  {lang === 'fr' ? 'Choisir un fichier PDF' : 'اختر  ملف PDF'}
                </label>
                {factureFile && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: '8px', fontSize: '13px' }}>
                    <FileText size={14} color="#ef4444" />
                    <span style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                      {factureFile.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setFactureFile(null)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                      title={lang === 'fr' ? 'Supprimer' : 'حذف'}
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Lines */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>
                {lang === 'fr' ? 'Lignes de commande' : 'أسطر الطلب'}
              </div>
              {lignes.map((l, i) => {
                const produitInfo = products.find((p: any) => String(p.id) === l.produit);
                return (
                  <div key={i} style={{ marginBottom: '10px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '8px', alignItems: 'center' }}>
                      <select className="form-control" value={l.produit} onChange={e => {
                        const p = products.find((p: any) => String(p.id) === e.target.value);
                        setLignes(lines => lines.map((li, j) => j === i ? {
                          ...li,
                          produit: e.target.value,
                          prix_unitaire: p ? String(p.prix_achat) : '',
                        } : li));
                      }}>
                        <option value="">{lang === 'fr' ? '-- Produit --' : '-- منتج --'}</option>
                        {products.map((p: any) => <option key={p.id} value={p.id}>{p.nom}</option>)}
                      </select>
                      <input className="form-control" type="number" min="1" placeholder={lang === 'fr' ? 'Qté palettes' : 'كمية باليت'} value={l.quantite} onChange={e => updateLigne(i, 'quantite', e.target.value)} />
                      <input className="form-control" type="number" placeholder={lang === 'fr' ? 'P.U palette (DA)' : 'سعر الباليت'} value={l.prix_unitaire} onChange={e => updateLigne(i, 'prix_unitaire', e.target.value)} />
                      <button className="btn btn-danger btn-icon" onClick={() => removeLigne(i)}>×</button>
                    </div>
                    {produitInfo && (
                      <div style={{ display: 'flex', gap: '16px', marginTop: '5px', paddingLeft: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                        <span>🏭 <strong style={{ color: '#8b5cf6' }}>{produitInfo.cartons_par_palette}</strong> {lang === 'fr' ? 'cartons/palette' : 'كرتون/باليت'}</span>
                        {l.quantite && <span>📦 {lang === 'fr' ? 'Total cartons:' : 'مجموع الكرتون:'} <strong style={{ color: 'var(--brand-primary)' }}>{Number(l.quantite) * produitInfo.cartons_par_palette}</strong></span>}
                        {l.quantite && l.prix_unitaire && <span>💰 {lang === 'fr' ? 'Sous-total:' : 'المجموع الفرعي:'} <strong>{(Number(l.quantite) * Number(l.prix_unitaire)).toLocaleString('fr-DZ')} DA</strong></span>}
                      </div>
                    )}
                  </div>
                );
              })}
              <button className="btn btn-secondary btn-sm" onClick={addLigne}><Plus size={12} /> {lang === 'fr' ? 'Ajouter ligne' : 'إضافة سطر'}</button>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setModal(false)}>{lang === 'fr' ? 'Annuler' : 'إلغاء'}</button>
              <button className="btn btn-primary" onClick={save}>{lang === 'fr' ? 'Créer le bon' : 'إنشاء الأمر'}</button>
            </div>
          </div>
        </div>
      )}

      {viewModal && (
        <div className="modal-overlay" onClick={() => setViewModal(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-title">{lang === 'fr' ? 'Détails:' : 'التفاصيل:'} {viewModal.reference}</div>
            <table style={{ width: '100%', marginBottom: '16px' }}>
              <thead><tr><th>{lang === 'fr' ? 'Produit' : 'المنتج'}</th><th>{lang === 'fr' ? 'Qté' : 'الكمية'}</th><th>{lang === 'fr' ? 'P.U' : 'السعر'}</th><th>{lang === 'fr' ? 'Sous-total' : 'المجموع الفرعي'}</th></tr></thead>
              <tbody>
                {viewModal.lignes?.map((l: any) => (
                  <tr key={l.id}><td>{l.produit_nom}</td><td>{l.quantite}</td><td>{l.prix_unitaire?.toLocaleString()} DA</td><td style={{ fontWeight: 600 }}>{l.sous_total?.toLocaleString()} DA</td></tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '16px' }}>
              <span>Total:</span><span style={{ color: 'var(--brand-primary)' }}>{viewModal.montant_total?.toLocaleString()} DA</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', alignItems: 'center' }}>
              <div>
                {viewModal.facture_pdf && (
                  <a
                    href={viewModal.facture_pdf.startsWith('http') ? viewModal.facture_pdf : `${MEDIA_BASE}${viewModal.facture_pdf}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#ef4444', borderColor: '#ef444440', background: '#ef44440a' }}
                  >
                    <FileText size={14} />
                    {lang === 'fr' ? 'Télécharger Facture PDF' : 'تحميل الفاتورة PDF'}
                  </a>
                )}
              </div>
              <button className="btn btn-secondary" onClick={() => setViewModal(null)}>{lang === 'fr' ? 'Fermer' : 'إغلاق'}</button>
            </div>
          </div>
        </div>
      )}
      {/* ── Edit N° Facture Modal ── */}
      {editModal && (
        <div className="modal-overlay" onClick={() => setEditModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                  ✏️
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '15px' }}>{lang === 'fr' ? 'Modifier N° Facture' : 'تعديل رقم الفاتورة'}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{editModal.fournisseur_nom}</div>
                </div>
              </div>
              <button onClick={() => setEditModal(null)} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '16px' }}>
                ×
              </button>
            </div>

            {/* Current reference info */}
            <div style={{ background: 'var(--bg-elevated)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
              <span>{lang === 'fr' ? 'Référence actuelle :' : 'الرقم الحالي :'}</span>
              <strong style={{ marginLeft: '8px', color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '13px' }}>{editModal.reference}</strong>
            </div>

            {/* Input */}
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">{lang === 'fr' ? 'N° Facture fournisseur' : 'رقم فاتورة المورد'}</label>
              <input
                type="text"
                className="form-control"
                placeholder={lang === 'fr' ? 'Ex: F-2026-0045' : 'مثال: F-2026-0045'}
                value={editRef}
                onChange={e => setEditRef(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveFacture()}
                autoFocus
                style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '0.5px' }}
              />
            </div>

            {/* Facture PDF handling in Edit */}
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">{lang === 'fr' ? 'Facture PDF' : 'فاتورة PDF'}</label>
              
              {/* Display existing PDF if not marked for clearing and no new file selected */}
              {editModal.facture_pdf && !shouldClearFacturePdf && !editFactureFile && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.2)', padding: '8px 12px', borderRadius: '10px', marginBottom: '10px' }}>
                  <a
                    href={editModal.facture_pdf.startsWith('http') ? editModal.facture_pdf : `${MEDIA_BASE}${editModal.facture_pdf}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', textDecoration: 'none', fontWeight: 600, fontSize: '13px' }}
                  >
                    <FileText size={16} />
                    {lang === 'fr' ? 'Voir le PDF existant' : 'عرض ملف PDF الحالي'}
                  </a>
                  <button
                    type="button"
                    onClick={() => setShouldClearFacturePdf(true)}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px', fontWeight: 700, padding: '4px 8px' }}
                  >
                    {lang === 'fr' ? 'Supprimer' : 'حذف'}
                  </button>
                </div>
              )}

              {/* Upload Input */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="file"
                  accept=".pdf"
                  id="edit-facture-pdf-upload"
                  style={{ display: 'none' }}
                  onChange={e => {
                    setEditFactureFile(e.target.files?.[0] || null);
                    setShouldClearFacturePdf(false);
                  }}
                />
                <label
                  htmlFor="edit-facture-pdf-upload"
                  className="btn btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}
                >
                  <Upload size={14} />
                  {lang === 'fr' ? 'Choisir un nouveau PDF' : 'اختر ملف PDF جديد'}
                </label>
                
                {editFactureFile && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: '8px', fontSize: '13px' }}>
                    <FileText size={14} color="#ef4444" />
                    <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                      {editFactureFile.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditFactureFile(null)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
              
              {shouldClearFacturePdf && (
                <p style={{ fontSize: '11px', color: '#ef4444', marginTop: '6px', fontWeight: 600 }}>
                  ⚠ {lang === 'fr' ? 'Le fichier existant sera supprimé lors de l\'enregistrement.' : 'سيتم حذف الملف الحالي عند الحفظ.'}
                </p>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setEditModal(null)}>
                {lang === 'fr' ? 'Annuler' : 'إلغاء'}
              </button>
              {(() => {
                const isRefChanged = editRef.trim() !== editModal.reference;
                const isFileChanged = !!editFactureFile || shouldClearFacturePdf;
                const canSave = editRef.trim() && (isRefChanged || isFileChanged);
                return (
                  <button
                    onClick={saveFacture}
                    disabled={editSaving || !canSave}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '7px',
                      padding: '9px 20px',
                      borderRadius: '10px',
                      border: 'none',
                      background: canSave ? '#6366f1' : '#aaa',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '14px',
                      cursor: editSaving || !canSave ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit',
                      transition: 'all 0.2s'
                    }}
                  >
                    {editSaving ? <div className="spinner" style={{ width: 14, height: 14 }} /> : '✏️'}
                    {lang === 'fr' ? 'Enregistrer' : 'حفظ'}
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
