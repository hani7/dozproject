import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { useLang } from '@/contexts/LangContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Eye, RotateCcw } from 'lucide-react';

interface Props { type: 'detail' | 'gros'; }
const STATUS_COLORS: Record<string, string> = { 
  en_attente: 'badge-warning', 
  brouillon: 'badge-gray', 
  confirmee: 'badge-info', 
  en_livraison: 'badge-purple',
  livree: 'badge-success', 
  annulee: 'badge-danger' 
};
const statusLabels: Record<string, Record<string, string>> = {
  en_attente: { fr: 'En attente', ar: 'في الانتظار' },
  brouillon: { fr: 'Brouillon', ar: 'مسودة' },
  confirmee: { fr: 'Confirmée', ar: 'مؤكدة' },
  en_livraison: { fr: 'En livraison', ar: 'قيد التوصيل' },
  livree: { fr: 'Livrée', ar: 'مُسلَّمة' },
  annulee: { fr: 'Annulée', ar: 'ملغاة' },
};

function VentesPageContent({ type }: Props) {
  const { lang } = useLang();
  const fr = lang === 'fr';
  const [ventes, setVentes] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [viewModal, setViewModal] = useState<any | null>(null);
  const [retourModal, setRetourModal] = useState<any | null>(null);
  const [retourQty, setRetourQty] = useState<Record<number, string>>({});
  const [lignes, setLignes] = useState([{ produit: '', quantite: '', prix_unitaire: '' }]);
  const [form, setForm] = useState({ reference: '', client: '', date: '', mode_paiement: 'especes', remise: '0', notes: '' });
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = () => {
    const params: any = { type_vente: type };
    if (dateFrom) params['date__gte'] = dateFrom;
    if (dateTo) params['date__lte'] = dateTo;
    api.get('/ventes/', { params }).then(r => setVentes(r.data.results || r.data));
  };

  useEffect(() => { load(); }, [type, dateFrom, dateTo]);
  useEffect(() => {
    // Load clients filtered by type. If it fails, load all as fallback.
    api.get('/clients/', { params: { type_client: type, page_size: 1000 } })
      .then(r => {
        const list = r.data.results || r.data;
        setClients(list);
      })
      .catch(() => {
        // Fallback: load all clients and filter client-side
        api.get('/clients/', { params: { page_size: 1000 } })
          .then(r => {
            const all = r.data.results || r.data;
            setClients(all.filter((c: any) => c.type_client === type));
          });
      });
    api.get('/products/', { params: { actif: true, page_size: 1000 } }).then(r => setProducts(r.data.results || r.data));
  }, [type]);

  // Close modals on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') { setModal(false); setViewModal(null); setRetourModal(null); } };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const addLigne = () => setLignes(l => [...l, { produit: '', quantite: '', prix_unitaire: '' }]);
  const updateLigne = (i: number, field: string, val: string) => setLignes(l => l.map((li, j) => j === i ? { ...li, [field]: val } : li));
  const getDefaultPrice = (productId: string) => {
    const p = products.find(p => String(p.id) === productId);
    if (!p) return '';
    return String(type === 'gros' ? p.prix_gros : p.prix_detail);
  };

  const save = async () => {
    try {
      await api.post('/ventes/', {
        ...form, type_vente: type, client: Number(form.client), remise: Number(form.remise),
        lignes: lignes.map(l => ({ produit: Number(l.produit), quantite: Number(l.quantite), prix_unitaire: Number(l.prix_unitaire), sous_total: Number(l.quantite) * Number(l.prix_unitaire) }))
      });
      toast.success(fr ? 'Vente créée!' : 'تم إنشاء البيع!');
      setModal(false); load();
    } catch (e: any) { toast.error(JSON.stringify(e?.response?.data || 'Erreur')); }
  };

  const openRetour = (v: any) => {
    const init: Record<number, string> = {};
    v.lignes?.forEach((l: any) => { init[l.produit] = '0'; });
    setRetourQty(init);
    setRetourModal(v);
  };

  const doRetour = async () => {
    if (!retourModal) return;
    const lignesRetour = Object.entries(retourQty)
      .filter(([, q]) => Number(q) > 0)
      .map(([produit_id, quantite]) => ({ produit_id: Number(produit_id), quantite: Number(quantite) }));
    if (lignesRetour.length === 0) { toast.error(fr ? 'Entrez au moins une quantité.' : 'أدخل كمية واحدة على الأقل.'); return; }
    try {
      await api.post(`/ventes/${retourModal.id}/retour/`, { lignes: lignesRetour });
      toast.success(fr ? 'Retour effectué ✓' : 'تم الإرجاع ✓');
      setRetourModal(null); load();
    } catch (e: any) { toast.error(e?.response?.data?.error || 'Erreur'); }
  };

  const title = type === 'gros' ? (fr ? 'Vente Gros' : 'بيع الجملة') : (fr ? 'Vente Détail' : 'بيع التجزئة');

  const CloseBtn = ({ onClick }: { onClick: () => void }) => (
    <button onClick={onClick} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}
      onMouseEnter={e => { e.currentTarget.style.background = '#ef444420'; e.currentTarget.style.color = '#ef4444'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-muted)'; }}>✕</button>
  );

  return (
    <AppLayout allowedRoles={['admin']}>
      <div className="page-header">
        <div>
          <h1>{title}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{ventes.length} {fr ? 'ventes' : 'عملية بيع'}</p>
        </div>
        <button className="btn btn-primary" onClick={() => {
          setForm({ reference: `V-${Date.now()}`, client: '', date: new Date().toISOString().split('T')[0], mode_paiement: 'especes', remise: '0', notes: '' });
          setLignes([{ produit: '', quantite: '1', prix_unitaire: '' }]);
          setModal(true);
        }}>
          <Plus size={15} /> {fr ? 'Nouvelle vente' : 'بيع جديد'}
        </button>
      </div>

      {/* Date filters */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>📅 {fr ? 'Période :' : 'الفترة :'}</span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input type="date" className="form-control" style={{ width: 160, fontSize: '13px' }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <span style={{ color: 'var(--text-muted)' }}>→</span>
          <input type="date" className="form-control" style={{ width: 160, fontSize: '13px' }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
          {(dateFrom || dateTo) && (
            <button className="btn btn-secondary btn-sm" onClick={() => { setDateFrom(''); setDateTo(''); }}>{fr ? 'Effacer' : 'مسح'}</button>
          )}
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>{fr ? 'Référence' : 'المرجع'}</th>
              <th>{fr ? 'Client' : 'العميل'}</th>
              <th>{fr ? 'Date' : 'التاريخ'}</th>
              <th>{fr ? 'Total' : 'المجموع'}</th>
              <th>{fr ? 'Payé' : 'المدفوع'}</th>
              <th>{fr ? 'Reste' : 'المتبقي'}</th>
              <th>{fr ? 'Statut' : 'الحالة'}</th>
              <th>{fr ? 'Actions' : 'الإجراءات'}</th>
            </tr>
          </thead>
          <tbody>
            {ventes.map(v => (
              <tr key={v.id}>
                <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{v.reference}</td>
                <td>{v.client_nom}</td>
                <td style={{ fontSize: '12px' }}>{v.date}</td>
                <td style={{ fontWeight: 600 }}>{v.montant_total?.toLocaleString()} DA</td>
                <td style={{ color: 'var(--text-muted)' }}>{v.montant_paye?.toLocaleString()} DA</td>
                <td style={{ fontWeight: 600, color: v.reste_a_payer > 0 ? '#ef4444' : '#10b981' }}>{v.reste_a_payer?.toLocaleString()} DA</td>
                <td><span className={`badge ${STATUS_COLORS[v.statut]}`}>{statusLabels[v.statut]?.[lang]}</span></td>
                <td>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button className="btn btn-secondary btn-icon" title={fr ? 'Voir' : 'عرض'} onClick={() => setViewModal(v)}><Eye size={12} /></button>
                    <button className="btn btn-warning btn-icon" title={fr ? 'Retour' : 'إرجاع'} onClick={() => openRetour(v)} style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b' }}><RotateCcw size={12} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── New Sale Modal ── */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div className="modal-title" style={{ margin: 0 }}>{fr ? 'Nouvelle vente' : 'بيع جديد'} — {type === 'gros' ? 'Gros' : 'Détail'}</div>
              <CloseBtn onClick={() => setModal(false)} />
            </div>
            <div className="grid-2" style={{ marginBottom: '12px' }}>
              <div className="form-group">
                <label className="form-label">{fr ? 'Référence' : 'المرجع'}</label>
                <input className="form-control" value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">{fr ? 'Client' : 'العميل'}</label>
                <select className="form-control" value={form.client} onChange={e => setForm(f => ({ ...f, client: e.target.value }))}>
                  <option value="">--</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{fr ? 'Date' : 'التاريخ'}</label>
                <input className="form-control" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">{fr ? 'Mode de paiement' : 'طريقة الدفع'}</label>
                <select className="form-control" value={form.mode_paiement} onChange={e => setForm(f => ({ ...f, mode_paiement: e.target.value }))}>
                  <option value="especes">{fr ? 'Espèces' : 'نقداً'}</option>
                  <option value="virement">{fr ? 'Virement' : 'تحويل'}</option>
                  <option value="cheque">{fr ? 'Chèque' : 'شيك'}</option>
                  <option value="credit">{fr ? 'Crédit' : 'آجل'}</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>{fr ? 'Produits' : 'المنتجات'}</div>
              {lignes.map((l, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                  <select className="form-control" value={l.produit} onChange={e => {
                    const price = getDefaultPrice(e.target.value);
                    setLignes(lines => lines.map((li, j) => j === i ? { ...li, produit: e.target.value, prix_unitaire: price } : li));
                  }}>
                    <option value="">--</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
                  </select>
                  <input className="form-control" type="number" placeholder={fr ? 'Qté' : 'كمية'} value={l.quantite} onChange={e => updateLigne(i, 'quantite', e.target.value)} />
                  <input className="form-control" type="number" placeholder="Prix DA" value={l.prix_unitaire} onChange={e => updateLigne(i, 'prix_unitaire', e.target.value)} />
                  <button className="btn btn-danger btn-icon" onClick={() => setLignes(lines => lines.filter((_, j) => j !== i))}>×</button>
                </div>
              ))}
              <button className="btn btn-secondary btn-sm" onClick={addLigne}><Plus size={12} /> {fr ? 'Ajouter' : 'إضافة'}</button>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setModal(false)}>{fr ? 'Annuler' : 'إلغاء'}</button>
              <button className="btn btn-primary" onClick={save}>{fr ? 'Créer la vente' : 'إنشاء البيع'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── View Modal ── */}
      {viewModal && (
        <div className="modal-overlay" onClick={() => setViewModal(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: 680 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>{viewModal.reference}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {type === 'gros' ? '🏪 Vente Gros' : '📦 Vente Détail'}
                  <span className={`badge ${STATUS_COLORS[viewModal.statut]}`}>{statusLabels[viewModal.statut]?.[lang]}</span>
                </div>
              </div>
              <CloseBtn onClick={() => setViewModal(null)} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
              {[
                { icon: '👤', label: fr ? 'Client' : 'العميل', value: viewModal.client_nom },
                { icon: '📅', label: fr ? 'Date' : 'التاريخ', value: viewModal.date },
                { icon: '💳', label: fr ? 'Paiement' : 'الدفع', value: viewModal.mode_paiement },
              ].map((item, i) => (
                <div key={i} style={{ background: 'var(--bg-elevated)', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>{item.icon} {item.label}</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', textTransform: 'capitalize' }}>{item.value || '—'}</div>
                </div>
              ))}
            </div>
            <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border)', marginBottom: '16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-elevated)' }}>
                    {[fr ? 'Produit' : 'المنتج', fr ? 'Qté (ctn)' : 'الكمية', fr ? 'Prix/ctn' : 'السعر', fr ? 'Sous-total' : 'المجموع'].map((h, i) => (
                      <th key={i} style={{ padding: '9px 12px', textAlign: i === 0 ? 'left' : 'right', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {viewModal.lignes?.map((l: any) => (
                    <tr key={l.id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>{l.produit_nom}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>{l.quantite}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-secondary)' }}>{l.prix_unitaire?.toLocaleString('fr-DZ')} DA</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>{l.sous_total?.toLocaleString('fr-DZ')} DA</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ background: 'var(--bg-elevated)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
              {viewModal.remise > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                  <span style={{ color: '#f59e0b' }}>🏷 {fr ? 'Remise' : 'الخصم'}</span>
                  <span style={{ fontWeight: 600, color: '#f59e0b' }}>- {Number(viewModal.remise).toLocaleString('fr-DZ')} DA</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '16px', marginBottom: '10px' }}>
                <span>Total</span>
                <span style={{ color: 'var(--brand-primary)' }}>{viewModal.montant_total?.toLocaleString('fr-DZ')} DA</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                <span style={{ color: '#10b981' }}>✅ {fr ? 'Montant payé' : 'المبلغ المدفوع'}</span>
                <span style={{ fontWeight: 700, color: '#10b981' }}>{viewModal.montant_paye?.toLocaleString('fr-DZ')} DA</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                <span style={{ color: viewModal.reste_a_payer > 0 ? '#ef4444' : '#10b981', fontWeight: 700 }}>
                  {viewModal.reste_a_payer > 0 ? '⚠ ' : '✅ '}{fr ? 'Reste à payer' : 'المتبقي'}
                </span>
                <span style={{ fontWeight: 800, color: viewModal.reste_a_payer > 0 ? '#ef4444' : '#10b981' }}>{viewModal.reste_a_payer?.toLocaleString('fr-DZ')} DA</span>
              </div>
            </div>
            {viewModal.notes && (
              <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '10px', padding: '12px', marginBottom: '16px', fontSize: '13px' }}>
                📝 {viewModal.notes}
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn btn-warning btn-sm" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b' }}
                onClick={() => { setViewModal(null); openRetour(viewModal); }}>
                <RotateCcw size={13} /> {fr ? 'Faire un retour' : 'إرجاع'}
              </button>
              <button className="btn btn-secondary" onClick={() => setViewModal(null)}>{fr ? 'Fermer' : 'إغلاق'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Retour Modal ── */}
      {retourModal && (
        <div className="modal-overlay" onClick={() => setRetourModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <div className="modal-title" style={{ margin: 0 }}>↩ {fr ? 'Retour produit' : 'إرجاع المنتج'}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>{retourModal.reference} · {retourModal.client_nom}</div>
              </div>
              <CloseBtn onClick={() => setRetourModal(null)} />
            </div>

            <div style={{ marginBottom: '6px', fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              {fr ? 'Entrez la quantité (en cartons) à retourner pour chaque produit :' : 'أدخل كمية الكرتون المُرتجع لكل منتج :'}
            </div>

            <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border)', marginBottom: '20px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-elevated)' }}>
                    <th style={{ padding: '9px 12px', textAlign: 'left', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>{fr ? 'Produit' : 'المنتج'}</th>
                    <th style={{ padding: '9px 12px', textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>{fr ? 'Vendu' : 'مُباع'}</th>
                    <th style={{ padding: '9px 12px', textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>{fr ? 'Retourner' : 'إرجاع'}</th>
                  </tr>
                </thead>
                <tbody>
                  {retourModal.lignes?.map((l: any) => (
                    <tr key={l.id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>{l.produit_nom}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', color: 'var(--text-muted)' }}>{l.quantite} ctn</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <input
                          type="number" min="0" max={l.quantite}
                          className="form-control"
                          style={{ width: 80, textAlign: 'center', margin: '0 auto' }}
                          value={retourQty[l.produit] ?? '0'}
                          onChange={e => setRetourQty(q => ({ ...q, [l.produit]: e.target.value }))}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '10px', padding: '12px', marginBottom: '20px', fontSize: '12px', color: '#f59e0b' }}>
              ⚠️ {fr ? 'Le stock sera réintégré et le montant total de la vente sera réduit automatiquement.' : 'سيتم إعادة المخزون وتخفيض إجمالي البيع تلقائياً.'}
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setRetourModal(null)}>{fr ? 'Annuler' : 'إلغاء'}</button>
              <button className="btn btn-primary" onClick={doRetour} style={{ background: '#f59e0b', border: 'none' }}>
                <RotateCcw size={13} /> {fr ? 'Confirmer le retour' : 'تأكيد الإرجاع'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export { VentesPageContent };
