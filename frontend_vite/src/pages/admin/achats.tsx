import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { useLang } from '@/contexts/LangContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, CheckCircle, Eye } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = { brouillon: 'badge-gray', confirme: 'badge-info', recu: 'badge-success', annule: 'badge-danger' };

export default function AchatsPage() {
  const { lang } = useLang();
  const [achats, setAchats] = useState<any[]>([]);
  const [fournisseurs, setFournisseurs] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [viewModal, setViewModal] = useState<any | null>(null);
  const [lignes, setLignes] = useState([{ produit: '', quantite: '', prix_unitaire: '' }]);
  const [form, setForm] = useState({ reference: '', fournisseur: '', date: '', mode_paiement: 'especes', notes: '' });

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
      await api.post('/achats/', {
        ...form,
        fournisseur: Number(form.fournisseur),
        lignes: lignes.map(l => ({ produit: Number(l.produit), quantite: Number(l.quantite), prix_unitaire: Number(l.prix_unitaire), sous_total: Number(l.quantite) * Number(l.prix_unitaire) }))
      });
      toast.success(lang === 'fr' ? 'Bon d\'achat créé!' : 'تم إنشاء أمر الشراء!');
      setModal(false);
      load();
    } catch (e: any) { toast.error(JSON.stringify(e?.response?.data || 'Erreur')); }
  };

  const recevoir = async (id: number) => {
    await api.post(`/achats/${id}/recevoir/`);
    toast.success(lang === 'fr' ? 'Stock mis à jour!' : 'تم تحديث المخزون!');
    load();
  };

  const statusLabels: Record<string, Record<string, string>> = {
    brouillon: { fr: 'Brouillon', ar: 'مسودة' },
    confirme: { fr: 'Confirmé', ar: 'مؤكد' },
    recu: { fr: 'Reçu', ar: 'مستلم' },
    annule: { fr: 'Annulé', ar: 'ملغى' },
  };

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
          setModal(true);
        }}>
          <Plus size={15} /> {lang === 'fr' ? 'Nouveau bon' : 'أمر جديد'}
        </button>
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
            {achats.map(a => (
              <tr key={a.id}>
                <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{a.reference}</td>
                <td>{a.fournisseur_nom}</td>
                <td style={{ fontSize: '12px' }}>{a.date}</td>
                <td style={{ fontWeight: 600 }}>{a.montant_total?.toLocaleString()} DA</td>
                <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{a.montant_paye?.toLocaleString()} DA</td>
                <td style={{ fontSize: '12px' }}>{a.mode_paiement}</td>
                <td><span className={`badge ${STATUS_COLORS[a.statut]}`}>{statusLabels[a.statut]?.[lang]}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button className="btn btn-secondary btn-icon" onClick={() => setViewModal(a)}><Eye size={12} /></button>
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
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button className="btn btn-secondary" onClick={() => setViewModal(null)}>{lang === 'fr' ? 'Fermer' : 'إغلاق'}</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
