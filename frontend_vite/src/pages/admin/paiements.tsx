import { useState, useEffect, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { useLang } from '@/contexts/LangContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Search, ChevronDown, ChevronUp, CheckCircle, Clock, X } from 'lucide-react';

const todayStr = new Date().toISOString().split('T')[0];

type Plan = {
  id: number; reference: string; type_plan: string;
  client_nom: string; fournisseur_nom: string;
  montant_total: number; montant_paye: number; montant_restant: number;
  pct_paye: number; statut: string; date_debut: string; notes: string;
  versements: Versement[];
};
type Versement = { id: number; plan: number; montant: number; date: string; mode: string; notes: string };

const fmtDA = (n: number) => Number(n).toLocaleString('fr-DZ') + ' DA';
const MODE_OPTIONS = ['especes', 'virement', 'cheque', 'mobile'];

export default function PaiementsPage() {
  const { lang } = useLang();
  const fr = lang === 'fr';

  const [plans, setPlans]       = useState<Plan[]>([]);
  const [clients, setClients]   = useState<any[]>([]);
  const [fournisseurs, setFournisseurs] = useState<any[]>([]);
  const [search, setSearch]     = useState('');
  const [filterStatut, setFilterStatut] = useState<'all' | 'en_cours' | 'termine'>('all');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // Create plan form
  const [form, setForm] = useState({
    type_plan: 'client', client_nom: '', fournisseur_nom: '',
    montant_total: '', date_debut: todayStr, notes: '',
  });
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedFournId, setSelectedFournId]   = useState('');

  // Add versement form per plan
  const [versForm, setVersForm] = useState<Record<number, { montant: string; date: string; mode: string; notes: string }>>({});

  const load = () => {
    api.get('/paiements/plans/').then(r => setPlans(r.data.results || r.data));
  };

  useEffect(() => {
    load();
    api.get('/clients/', { params: { page_size: 500 } }).then(r => setClients(r.data.results || r.data));
    api.get('/fournisseurs/', { params: { page_size: 200 } }).then(r => setFournisseurs(r.data.results || r.data));
  }, []);

  const filtered = useMemo(() => plans.filter(p => {
    const q = search.toLowerCase();
    const matchQ = !q || p.client_nom.toLowerCase().includes(q) || p.fournisseur_nom.toLowerCase().includes(q) || p.reference.toLowerCase().includes(q);
    const matchS = filterStatut === 'all' || p.statut === filterStatut;
    return matchQ && matchS;
  }), [plans, search, filterStatut]);

  const createPlan = async () => {
    const nom = form.type_plan === 'client' ? form.client_nom : form.fournisseur_nom;
    if (!nom) { toast.error(fr ? 'Sélectionner un client/fournisseur' : 'اختر عميلاً/مورداً'); return; }
    if (!form.montant_total || Number(form.montant_total) <= 0) { toast.error(fr ? 'Montant requis' : 'المبلغ مطلوب'); return; }
    try {
      await api.post('/paiements/plans/', {
        type_plan: form.type_plan,
        client_nom: form.type_plan === 'client' ? form.client_nom : '',
        fournisseur_nom: form.type_plan === 'fournisseur' ? form.fournisseur_nom : '',
        montant_total: Number(form.montant_total),
        date_debut: form.date_debut,
        notes: form.notes,
      });
      toast.success('✅ ' + (fr ? 'Plan créé' : 'تم إنشاء الخطة'));
      setShowCreate(false);
      setForm({ type_plan: 'client', client_nom: '', fournisseur_nom: '', montant_total: '', date_debut: todayStr, notes: '' });
      setSelectedClientId(''); setSelectedFournId('');
      load();
    } catch (e: any) { toast.error(JSON.stringify(e?.response?.data || 'Erreur')); }
  };

  const addVersement = async (plan: Plan) => {
    const vf = versForm[plan.id];
    if (!vf?.montant || Number(vf.montant) <= 0) { toast.error(fr ? 'Montant invalide' : 'مبلغ غير صالح'); return; }
    if (plan.montant_restant > 0 && Number(vf.montant) > plan.montant_restant) {
      toast.error(`Max: ${fmtDA(plan.montant_restant)}`); return;
    }
    try {
      await api.post('/paiements/versements-plan/', {
        plan: plan.id, montant: Number(vf.montant),
        date: vf.date || todayStr, mode: vf.mode || 'especes', notes: vf.notes || '',
      });
      toast.success('✅ ' + (fr ? 'Versement ajouté' : 'تمت إضافة الدفعة'));
      setVersForm(f => ({ ...f, [plan.id]: { montant: '', date: todayStr, mode: 'especes', notes: '' } }));
      load();
    } catch (e: any) { toast.error(JSON.stringify(e?.response?.data || 'Erreur')); }
  };

  const deletePlan = async (id: number) => {
    if (!confirm(fr ? 'Supprimer ce plan ?' : 'حذف هذه الخطة؟')) return;
    await api.delete(`/paiements/plans/${id}/`);
    toast.success(fr ? 'Supprimé' : 'تم الحذف');
    load();
  };

  const vf = (planId: number) => versForm[planId] || { montant: '', date: todayStr, mode: 'especes', notes: '' };
  const setVf = (planId: number, patch: Partial<typeof versForm[0]>) =>
    setVersForm(f => ({ ...f, [planId]: { ...vf(planId), ...patch } }));

  const totals = useMemo(() => ({
    total: plans.reduce((s, p) => s + p.montant_total, 0),
    paye:  plans.reduce((s, p) => s + p.montant_paye, 0),
    en_cours: plans.filter(p => p.statut === 'en_cours').length,
    termine:  plans.filter(p => p.statut === 'termine').length,
  }), [plans]);

  return (
    <AppLayout allowedRoles={['admin']}>
      <div className="page-header">
        <div>
          <h1>💳 {fr ? 'Plans de Paiement' : 'خطط الدفع'}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
            {totals.en_cours} {fr ? 'en cours' : 'جارية'} · {totals.termine} {fr ? 'terminés' : 'مكتملة'}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={15} /> {fr ? 'Nouveau plan' : 'خطة جديدة'}
        </button>
      </div>

      {/* Summary KPIs */}
      <div className="grid-4" style={{ marginBottom: '20px' }}>
        {[
          { label: fr ? 'Total à recevoir' : 'المجموع', value: fmtDA(totals.total), color: '#6366f1' },
          { label: fr ? 'Déjà payé'       : 'تم دفعه',  value: fmtDA(totals.paye),  color: '#10b981' },
          { label: fr ? 'Restant'          : 'المتبقي',  value: fmtDA(totals.total - totals.paye), color: '#f59e0b' },
          { label: fr ? 'Plans actifs'     : 'خطط نشطة', value: String(totals.en_cours), color: '#06b6d4' },
        ].map((k, i) => (
          <div key={i} className="kpi-card">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value" style={{ fontSize: '18px', color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-input-wrap" style={{ maxWidth: 300 }}>
          <Search size={16} />
          <input className="form-control" placeholder={fr ? 'Rechercher...' : 'بحث...'} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {(['all', 'en_cours', 'termine'] as const).map(s => (
          <button key={s} onClick={() => setFilterStatut(s)} style={{
            padding: '7px 14px', borderRadius: '8px', fontWeight: 700, fontSize: '12px',
            border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit',
            background: filterStatut === s ? 'var(--brand-primary)' : 'var(--bg-elevated)',
            color: filterStatut === s ? '#fff' : 'var(--text-muted)',
          }}>
            {s === 'all' ? (fr ? 'Tous' : 'الكل') : s === 'en_cours' ? (fr ? 'En cours' : 'جارية') : (fr ? 'Terminés' : 'مكتملة')}
          </button>
        ))}
      </div>

      {/* Plans list */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <p>💳 {fr ? 'Aucun plan trouvé.' : 'لا توجد خطط.'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filtered.map(plan => {
            const isOpen = expanded === plan.id;
            const isDone = plan.statut === 'termine';
            const restant = plan.montant_restant;
            const cvf = vf(plan.id);
            const nom = plan.client_nom || plan.fournisseur_nom;
            return (
              <div key={plan.id} style={{
                background: 'var(--bg-elevated)', borderRadius: '14px',
                border: `1px solid ${isDone ? '#10b98140' : 'var(--border)'}`,
                overflow: 'hidden',
              }}>
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', cursor: 'pointer' }}
                  onClick={() => setExpanded(isOpen ? null : plan.id)}>
                  {/* Status icon */}
                  <div style={{ flexShrink: 0 }}>
                    {isDone
                      ? <CheckCircle size={22} color="#10b981" />
                      : <Clock size={22} color="#f59e0b" />
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, fontSize: '14px' }}>{nom}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{plan.reference}</span>
                      <span style={{ fontSize: '10px', padding: '1px 8px', borderRadius: '10px', fontWeight: 700,
                        background: isDone ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                        color: isDone ? '#10b981' : '#f59e0b' }}>
                        {isDone ? (fr ? 'Terminé' : 'مكتمل') : (fr ? 'En cours' : 'جارية')}
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                        <span>{fmtDA(plan.montant_paye)} / {fmtDA(plan.montant_total)}</span>
                        <span style={{ fontWeight: 700, color: isDone ? '#10b981' : '#6366f1' }}>{plan.pct_paye}%</span>
                      </div>
                      <div style={{ height: 8, background: 'var(--border)', borderRadius: 4 }}>
                        <div style={{ height: 8, width: `${plan.pct_paye}%`, background: isDone ? '#10b981' : '#6366f1', borderRadius: 4, transition: 'width 0.4s' }} />
                      </div>
                      {!isDone && <div style={{ fontSize: '11px', color: '#f59e0b', marginTop: '3px', fontWeight: 600 }}>
                        {fr ? 'Restant :' : 'المتبقي:'} {fmtDA(restant)}
                      </div>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <button className="btn btn-danger btn-icon" onClick={e => { e.stopPropagation(); deletePlan(plan.id); }}>
                      <X size={12} />
                    </button>
                    {isOpen ? <ChevronUp size={18} color="var(--text-muted)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
                  </div>
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '16px' }}>
                    {/* Versements history */}
                    {plan.versements.length > 0 && (
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                          {fr ? 'Historique des versements' : 'سجل الدفعات'}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {plan.versements.map((v, i) => (
                            <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-base)', borderRadius: '8px', fontSize: '13px' }}>
                              <span style={{ color: 'var(--text-muted)', minWidth: 24 }}>#{i + 1}</span>
                              <span style={{ fontWeight: 700, color: '#10b981' }}>{fmtDA(v.montant)}</span>
                              <span style={{ color: 'var(--text-muted)' }}>{new Date(v.date).toLocaleDateString(fr ? 'fr-DZ' : 'ar-DZ')}</span>
                              <span style={{ fontSize: '11px', padding: '1px 8px', borderRadius: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>{v.mode}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Add versement */}
                    {!isDone && (
                      <div style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: '12px', padding: '14px' }}>
                        <div style={{ fontWeight: 700, fontSize: '12px', color: '#6366f1', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          ➕ {fr ? 'Ajouter un versement' : 'إضافة دفعة'}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                              {fr ? `Montant (max ${fmtDA(restant)})` : `المبلغ (أقصى ${fmtDA(restant)})`}
                            </label>
                            <input className="form-control" type="number" min="1" max={restant}
                              value={cvf.montant} onChange={e => setVf(plan.id, { montant: e.target.value })}
                              style={{ fontWeight: 700 }} placeholder="0" />
                          </div>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>{fr ? 'Date' : 'التاريخ'}</label>
                            <input className="form-control" type="date" value={cvf.date}
                              onChange={e => setVf(plan.id, { date: e.target.value })} />
                          </div>
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>{fr ? 'Mode' : 'الطريقة'}</label>
                            <select className="form-control" value={cvf.mode} onChange={e => setVf(plan.id, { mode: e.target.value })}>
                              {MODE_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input className="form-control" placeholder={fr ? 'Note (optionnel)' : 'ملاحظة (اختياري)'} value={cvf.notes}
                            onChange={e => setVf(plan.id, { notes: e.target.value })} style={{ flex: 1, fontSize: '12px' }} />
                          <button className="btn btn-primary" onClick={() => addVersement(plan)} style={{ whiteSpace: 'nowrap' }}>
                            💾 {fr ? 'Enregistrer' : 'حفظ'}
                          </button>
                          {restant > 0 && (
                            <button className="btn btn-secondary" onClick={() => setVf(plan.id, { montant: String(restant) })} style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                              ✅ {fr ? 'Tout régler' : 'تسوية كاملة'}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                    {isDone && (
                      <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(16,185,129,0.08)', borderRadius: '10px', color: '#10b981', fontWeight: 700, fontSize: '13px' }}>
                        ✅ {fr ? 'Plan entièrement payé — solde à zéro.' : 'تم السداد الكامل.'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Plan Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">💳 {fr ? 'Nouveau plan de paiement' : 'خطة دفع جديدة'}</div>

            <div className="form-group">
              <label className="form-label">{fr ? 'Type' : 'النوع'}</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['client', 'fournisseur'] as const).map(t => (
                  <button key={t} type="button" onClick={() => setForm(f => ({ ...f, type_plan: t, client_nom: '', fournisseur_nom: '' }))}
                    style={{ flex: 1, padding: '9px', borderRadius: '9px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: '13px',
                      border: `2px solid ${form.type_plan === t ? 'var(--brand-primary)' : 'var(--border)'}`,
                      background: form.type_plan === t ? 'rgba(0,96,69,0.08)' : 'var(--bg-elevated)',
                      color: form.type_plan === t ? 'var(--brand-primary)' : 'var(--text-muted)' }}>
                    {t === 'client' ? '👤 ' + (fr ? 'Client' : 'عميل') : '🏭 ' + (fr ? 'Fournisseur' : 'مورد')}
                  </button>
                ))}
              </div>
            </div>

            {form.type_plan === 'client' ? (
              <div className="form-group">
                <label className="form-label">👤 {fr ? 'Client' : 'العميل'}</label>
                <select className="form-control" value={selectedClientId} onChange={e => {
                  setSelectedClientId(e.target.value);
                  setForm(f => ({ ...f, client_nom: clients.find(c => String(c.id) === e.target.value)?.nom || '' }));
                }}>
                  <option value="">{fr ? '-- Sélectionner --' : '-- اختر --'}</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">🏭 {fr ? 'Fournisseur' : 'المورد'}</label>
                <select className="form-control" value={selectedFournId} onChange={e => {
                  setSelectedFournId(e.target.value);
                  setForm(f => ({ ...f, fournisseur_nom: fournisseurs.find(x => String(x.id) === e.target.value)?.nom || '' }));
                }}>
                  <option value="">{fr ? '-- Sélectionner --' : '-- اختر --'}</option>
                  {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
                </select>
              </div>
            )}

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">💰 {fr ? 'Montant total (DA)' : 'المبلغ الإجمالي'}</label>
                <input className="form-control" type="number" min="1"
                  value={form.montant_total} onChange={e => setForm(f => ({ ...f, montant_total: e.target.value }))}
                  style={{ fontWeight: 700, fontSize: '16px' }} placeholder="0" />
              </div>
              <div className="form-group">
                <label className="form-label">{fr ? 'Date début' : 'تاريخ البدء'}</label>
                <input className="form-control" type="date" value={form.date_debut}
                  onChange={e => setForm(f => ({ ...f, date_debut: e.target.value }))} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{fr ? 'Notes (optionnel)' : 'ملاحظات (اختياري)'}</label>
              <textarea className="form-control" rows={2} value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>{fr ? 'Annuler' : 'إلغاء'}</button>
              <button className="btn btn-primary" onClick={createPlan}>💳 {fr ? 'Créer le plan' : 'إنشاء الخطة'}</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
