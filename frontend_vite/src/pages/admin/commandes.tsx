import { useState, useEffect, useCallback, useRef } from 'react';
import AppLayout from '@/components/AppLayout';
import { useLang } from '@/contexts/LangContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { CheckCircle, Truck, XCircle, RefreshCw, Eye, UserCheck, FileText, PackageCheck, Search } from 'lucide-react';
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

export default function CommandesLivePage() {
  const { lang } = useLang();
  const fr = lang === 'fr';
  const [orders, setOrders] = useState<Order[]>([]);
  const [livreurs, setLivreurs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewOrder, setViewOrder] = useState<Order | null>(null);
  const [assignOrder, setAssignOrder] = useState<Order | null>(null);
  const [selectedLivreur, setSelectedLivreur] = useState('');
  const prevCountRef = useRef(0);

  const load = useCallback(async () => {
    try {
      const [resCmd, resVente] = await Promise.all([
        api.get('/commandes/', { params: { ordering: '-created_at', page_size: 100 } }),
        api.get('/ventes/', { params: { ordering: '-created_at', page_size: 100 } })
      ]);
      const cmds = (resCmd.data.results || resCmd.data).map((c: any) => ({ ...c, is_vente: false }));
      const vts = (resVente.data.results || resVente.data).map((v: any) => ({ ...v, is_vente: true }));
      
      const data = [...cmds, ...vts].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      const pending = data.filter(o => o.statut === 'en_attente').length;
      if (pending > prevCountRef.current && prevCountRef.current > 0) {
        toast.success(fr ? `🔔 ${pending - prevCountRef.current} nouvelle(s) demande(s)!` : `🔔 ${pending - prevCountRef.current} طلب جديد!`, { duration: 5000 });
      }
      prevCountRef.current = pending;
      setOrders(data as Order[]);
      setLoading(false);
    } catch { setLoading(false); }
  }, [lang, fr]);

  useEffect(() => {
    api.get('/auth/users/', { params: { role: 'livreur' } })
      .then(r => setLivreurs(r.data.results || r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

  // Close modals on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setViewOrder(null); setAssignOrder(null); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const confirm = async (order: any) => {
    try {
      const endpoint = order.is_vente ? `/ventes/${order.id}/confirmer/` : `/commandes/${order.id}/confirmer/`;
      await api.post(endpoint);
      toast.success(fr ? 'Confirmé ✓' : 'تم التأكيد ✓');
      load();
    } catch (e: any) { toast.error(e?.response?.data?.error || 'Erreur'); }
  };

  const openAssign = (order: Order) => {
    setSelectedLivreur('');
    setAssignOrder(order);
  };

  const doAssign = async () => {
    if (!assignOrder || !selectedLivreur) return;
    try {
      const endpoint = (assignOrder as any).is_vente ? `/ventes/${assignOrder.id}/assigner_livreur/` : `/commandes/${assignOrder.id}/assigner_livreur/`;
      await api.post(endpoint, { livreur_id: selectedLivreur });
      toast.success(fr ? 'Livreur assigné ✓' : 'تم تعيين الموزع ✓');
      setAssignOrder(null);
      load();
    } catch (e: any) { toast.error(e?.response?.data?.error || 'Erreur'); }
  };

  const cancel = async (order: any) => {
    if (!window.confirm(`${fr ? 'Annuler cette demande?' : 'إلغاء هذا الطلب؟'}`)) return;
    try {
      const endpoint = order.is_vente ? `/ventes/${order.id}/` : `/commandes/${order.id}/`;
      await api.patch(endpoint, { statut: 'annulee' });
      toast.success(fr ? 'Annulé' : 'تم الإلغاء');
      load();
    } catch { }
  };

  const filteredOrders = orders.filter(o => {
    const q = search.toLowerCase();
    return !q || o.reference?.toLowerCase().includes(q) || o.client_nom?.toLowerCase().includes(q);
  });

  const pending = orders.filter(o => o.statut === 'en_attente').length;
  const active  = orders.filter(o => ['confirmee', 'en_livraison'].includes(o.statut)).length;

  const compatibleLivreurs = assignOrder
    ? livreurs.filter((l: any) => l.specialite === 'les_deux' || l.specialite === assignOrder.type_commande)
    : [];

  const age = (created_at: string) => {
    const diff = Date.now() - new Date(created_at).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return fr ? 'à l\'instant' : 'الآن';
    if (mins < 60) return `${mins} min`;
    return `${Math.floor(mins / 60)}h`;
  };

  return (
    <AppLayout allowedRoles={['admin']}>
      <div className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {fr ? 'Commandes en Temps Réel' : 'الطلبات المباشرة'}
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '4px 10px', borderRadius: '20px', border: '1px solid rgba(16,185,129,0.3)', fontWeight: 600 }}>
              <span className="pulse-dot" />
              {fr ? 'En direct · 5s' : 'مباشر · 5 ث'}
            </span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
            {pending} {fr ? 'en attente' : 'معلق'} · {active} {fr ? 'en cours' : 'نشط'}
          </p>
        </div>
        <button className="btn btn-secondary" onClick={() => load()} disabled={loading}>
          <RefreshCw size={14} /> {fr ? 'Actualiser' : 'تحديث'}
        </button>
      </div>

      <div className="search-bar" style={{ marginBottom: '16px' }}>
        <div className="search-input-wrap" style={{ maxWidth: 360 }}>
          <Search />
          <input className="form-control" placeholder={fr ? 'Rechercher commande...' : 'بحث عن طلب...'} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>{fr ? 'Référence' : 'المرجع'}</th>
              <th>{fr ? 'Client' : 'العميل'}</th>
              <th>{fr ? 'Prévendeur' : 'البائع'}</th>
              <th>{fr ? 'Type' : 'النوع'}</th>
              <th>{fr ? 'Produits' : 'المنتجات'}</th>
              <th>{fr ? 'Total' : 'المجموع'}</th>
              <th>{fr ? 'Statut' : 'الحالة'}</th>
              <th>{fr ? 'Il y a' : 'منذ'}</th>
              <th>{fr ? 'Livreur' : 'الموزع'}</th>
              <th>{fr ? 'Actions' : 'الإجراءات'}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: '40px' }}><div className="spinner" /></td></tr>
            ) : filteredOrders.length === 0 ? (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>{fr ? 'Aucune commande' : 'لا توجد طلبات'}</td></tr>
            ) : filteredOrders.map(o => {
              const isNew = (Date.now() - new Date(o.created_at).getTime()) < 120000 && o.statut === 'en_attente';
              return (
                <tr key={o.id} style={isNew ? { background: 'rgba(245,158,11,0.05)', borderLeft: '3px solid #f59e0b' } : {}}>
                  <td>
                    <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '13px' }}>{o.reference}</div>
                    {isNew && <span style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 700 }}>🆕 NOUVEAU</span>}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{o.client_nom}</div>
                    {o.client_phone && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>📞 {o.client_phone}</div>}
                    {o.client_adresse && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>📍 {o.client_adresse?.substring(0, 30)}</div>}
                  </td>
                  <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{o.prevendeur_nom}</td>
                  <td>
                    <span className={`badge ${(o.type_commande || (o as any).type_vente) === 'gros' ? 'badge-purple' : 'badge-info'}`}>
                      {(o.type_commande || (o as any).type_vente) === 'gros' ? '🏭 Palette' : '📦 Carton'}
                    </span>
                  </td>
                  <td style={{ fontSize: '12px' }}>
                    {o.lignes?.slice(0, 2).map((l: any, i: number) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{l.produit_nom}</span>
                        <span style={{ fontWeight: 600 }}>×{l.quantite}</span>
                      </div>
                    ))}
                    {(o.lignes?.length || 0) > 2 && <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>+{o.lignes!.length - 2} {fr ? 'autres' : 'أخرى'}</span>}
                  </td>
                  <td style={{ fontWeight: 900, color: 'var(--brand-primary)' }}>
                    {Number(o.montant_total).toLocaleString('fr-DZ')} DA
                  </td>
                  <td>
                    <span className={`badge ${STATUS_COLORS[o.statut]}`}>
                      {STATUS_LABELS[o.statut]?.[lang]}
                    </span>
                  </td>
                  <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{age(o.created_at)}</td>
                  <td style={{ fontSize: '12px' }}>
                    {o.livreur_nom ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#6366f1', fontWeight: 600 }}>
                        <Truck size={12} /> {o.livreur_nom}
                      </span>
                    ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                      <button className="btn btn-secondary btn-icon" title={fr ? 'Voir détails' : 'التفاصيل'} onClick={() => setViewOrder(o)}>
                        <Eye size={12} />
                      </button>
                      {o.statut === 'en_attente' && (
                        <button className="btn btn-success btn-sm" title={fr ? 'Confirmer' : 'تأكيد'} onClick={() => confirm(o)}>
                          <CheckCircle size={12} /> {fr ? 'Confirmer' : 'تأكيد'}
                        </button>
                      )}
                      {o.statut === 'confirmee' && (
                        <button className="btn btn-primary btn-sm" title={fr ? 'Assigner livreur' : 'تعيين موزع'} onClick={() => openAssign(o)}>
                          <UserCheck size={12} /> {fr ? 'Assigner' : 'تعيين'}
                        </button>
                      )}
                      <button className="btn btn-secondary btn-icon" title={fr ? 'Imprimer Facture' : 'طباعة الفاتورة'} onClick={() => printFacture(o)} style={{ color: '#059669' }}>
                        <FileText size={12} />
                      </button>
                      <button className="btn btn-secondary btn-icon" title={fr ? 'Bon de Livraison' : 'وصل التسليم'} onClick={() => printBonLivraison(o)} style={{ color: '#0284c7' }}>
                        <PackageCheck size={12} />
                      </button>
                      {!['livree', 'annulee'].includes(o.statut) && (
                        <button className="btn btn-danger btn-icon" title={fr ? 'Annuler' : 'إلغاء'} onClick={() => cancel(o)}>
                          <XCircle size={12} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── View Details Modal ── */}
      {viewOrder && (
        <div className="modal-overlay" onClick={() => setViewOrder(null)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxWidth: 620 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 800 }}>{viewOrder.reference}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', gap: '8px' }}>
                  <span className={`badge ${STATUS_COLORS[viewOrder.statut]}`}>{STATUS_LABELS[viewOrder.statut]?.[lang]}</span>
                  <span className={`badge ${viewOrder.type_commande === 'gros' ? 'badge-purple' : 'badge-info'}`}>
                    {viewOrder.type_commande === 'gros' ? '🏭 Palette' : '📦 Carton'}
                  </span>
                </div>
              </div>
              <button onClick={() => setViewOrder(null)} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#ef444420'; e.currentTarget.style.color = '#ef4444'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-muted)'; }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              {[
                { label: fr ? 'Client' : 'العميل', value: viewOrder.client_nom },
                { label: fr ? 'Téléphone' : 'الهاتف', value: viewOrder.client_phone || '—' },
                { label: fr ? 'Prévendeur' : 'البائع', value: viewOrder.prevendeur_nom },
                { label: fr ? 'Livreur' : 'الموزع', value: viewOrder.livreur_nom || '—' },
              ].map((item, i) => (
                <div key={i} style={{ background: 'var(--bg-elevated)', borderRadius: '10px', padding: '10px 14px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '3px' }}>{item.label}</div>
                  <div style={{ fontWeight: 700 }}>{item.value}</div>
                </div>
              ))}
            </div>

            {viewOrder.client_adresse && (
              <div style={{ background: 'var(--bg-elevated)', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px' }}>
                📍 {viewOrder.client_adresse}
              </div>
            )}

            <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border)', marginBottom: '16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-elevated)' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{fr ? 'Produit' : 'المنتج'}</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{fr ? 'Qté' : 'الكمية'}</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{fr ? 'P.U' : 'السعر'}</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{fr ? 'Total' : 'المجموع'}</th>
                  </tr>
                </thead>
                <tbody>
                  {viewOrder.lignes?.map((l: any) => (
                    <tr key={l.id} style={{ borderTop: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>{l.produit_nom}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>{l.quantite}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-secondary)' }}>{l.prix_unitaire?.toLocaleString('fr-DZ')} DA</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>{l.sous_total?.toLocaleString('fr-DZ')} DA</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '16px', marginBottom: '16px' }}>
              <span>Total</span>
              <span style={{ color: 'var(--brand-primary)' }}>{Number(viewOrder.montant_total).toLocaleString('fr-DZ')} DA</span>
            </div>

            {viewOrder.notes && (
              <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                📝 {viewOrder.notes}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              {viewOrder.statut === 'en_attente' && (
                <button className="btn btn-success" onClick={() => { confirm(viewOrder.id); setViewOrder(null); }}>
                  <CheckCircle size={13} /> {fr ? 'Confirmer' : 'تأكيد'}
                </button>
              )}
              {viewOrder.statut === 'confirmee' && (
                <button className="btn btn-primary" onClick={() => { setViewOrder(null); openAssign(viewOrder); }}>
                  <UserCheck size={13} /> {fr ? 'Assigner livreur' : 'تعيين موزع'}
                </button>
              )}
              <button className="btn btn-secondary" onClick={() => printFacture(viewOrder)} style={{ color: '#059669', borderColor: '#059669' }}>
                <FileText size={13} /> {fr ? 'Facture PDF' : 'فاتورة PDF'}
              </button>
              <button className="btn btn-secondary" onClick={() => printBonLivraison(viewOrder)} style={{ color: '#0284c7', borderColor: '#0284c7' }}>
                <PackageCheck size={13} /> {fr ? 'Bon de Livraison' : 'وصل التسليم'}
              </button>
              <button className="btn btn-secondary" onClick={() => setViewOrder(null)}>{fr ? 'Fermer' : 'إغلاق'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Assign Livreur Modal ── */}
      {assignOrder && (
        <div className="modal-overlay" onClick={() => setAssignOrder(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div className="modal-title" style={{ margin: 0 }}>
                🚚 {fr ? 'Assigner un livreur' : 'تعيين موزع'}
              </div>
              <button onClick={() => setAssignOrder(null)} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#ef444420'; e.currentTarget.style.color = '#ef4444'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-muted)'; }}>✕</button>
            </div>

            <div style={{ background: 'var(--bg-elevated)', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px' }}>
              <div style={{ fontWeight: 700, fontSize: '14px' }}>{assignOrder.reference}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '3px' }}>
                👤 {assignOrder.client_nom}
                {assignOrder.client_adresse && <span> · 📍 {assignOrder.client_adresse}</span>}
              </div>
              <div style={{ fontWeight: 800, color: 'var(--brand-primary)', marginTop: '6px' }}>
                {Number(assignOrder.montant_total).toLocaleString('fr-DZ')} DA
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">{fr ? 'Choisir le livreur' : 'اختر الموزع'}</label>
              {compatibleLivreurs.length === 0 ? (
                <div style={{ padding: '12px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '8px', fontSize: '13px', color: '#f59e0b' }}>
                  ⚠️ {fr ? 'Aucun livreur compatible disponible' : 'لا يوجد موزع متوافق'}
                </div>
              ) : (
                <select className="form-control" value={selectedLivreur} onChange={e => setSelectedLivreur(e.target.value)}>
                  <option value="">{fr ? '-- Sélectionner un livreur --' : '-- اختر موزعاً --'}</option>
                  {compatibleLivreurs.map((l: any) => (
                    <option key={l.id} value={l.id}>{l.first_name} {l.last_name}</option>
                  ))}
                </select>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setAssignOrder(null)}>{fr ? 'Annuler' : 'إلغاء'}</button>
              <button className="btn btn-primary" onClick={doAssign} disabled={!selectedLivreur || compatibleLivreurs.length === 0}>
                <UserCheck size={14} /> {fr ? 'Confirmer l\'assignation' : 'تأكيد التعيين'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
