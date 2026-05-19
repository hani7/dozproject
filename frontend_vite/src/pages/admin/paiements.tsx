import { useState, useEffect, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { useLang } from '@/contexts/LangContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, CreditCard, ArrowRightLeft, Wallet, BadgeCheck, Search } from 'lucide-react';

const today = new Date().toISOString().split('T')[0];
const EMPTY_P = { type_paiement: 'vente', mode: 'especes', montant: '', date: today, client_nom: '', fournisseur_nom: '', notes: '' };
const EMPTY_V = { employe: '', montant: '', date: today, banque: '', motif: 'Salaire', statut: 'en_attente' };

// Solde info panel
function SoldePanel({ items }: { items: { icon: string; label: string; value: number; color: string }[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: '1px', background: 'var(--border)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)', marginBottom: '16px' }}>
      {items.map((item, i) => (
        <div key={i} style={{ background: 'var(--bg-elevated)', padding: '14px', textAlign: 'center' }}>
          <div style={{ fontSize: '18px', marginBottom: '4px' }}>{item.icon}</div>
          <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' as const, color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: '6px' }}>{item.label}</div>
          <div style={{ fontSize: '15px', fontWeight: 900, color: item.color }}>{item.value.toLocaleString()} DA</div>
        </div>
      ))}
    </div>
  );
}

// Versement toggle
function VersementToggle({ mode, onSelect, resteLabel }: { mode: string; onSelect: (m: 'versement' | 'total') => void; resteLabel: string }) {
  return (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
      {([['versement', '🪙', 'Versement partiel'] as const, ['total', '✅', resteLabel] as const]).map(([val, icon, label]) => (
        <button key={val} type="button" onClick={() => onSelect(val)} style={{
          flex: 1, padding: '10px 8px', borderRadius: '10px', cursor: 'pointer',
          border: `2px solid ${mode === val ? (val === 'total' ? '#10b981' : 'var(--brand-primary)') : 'var(--border)'}`,
          background: mode === val ? (val === 'total' ? 'rgba(16,185,129,0.08)' : 'rgba(0,96,69,0.08)') : 'var(--bg-elevated)',
          color: mode === val ? (val === 'total' ? '#10b981' : 'var(--brand-primary)') : 'var(--text-secondary)',
          fontWeight: 700, fontSize: '13px', transition: 'all 0.15s',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
        }}>
          {icon} {label}
        </button>
      ))}
    </div>
  );
}

export default function PaiementsPage() {
  const { lang } = useLang();
  const [paiements, setPaiements] = useState<any[]>([]);
  const [virements, setVirements] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [fournisseurs, setFournisseurs] = useState<any[]>([]);
  const [employes, setEmployes] = useState<any[]>([]);
  const [tab, setTab] = useState<'paiements' | 'virements'>('paiements');
  const [modal, setModal] = useState(false);
  const [pMode, setPMode] = useState<'versement' | 'total'>('versement');
  const [vMode, setVMode] = useState<'versement' | 'total'>('versement');
  const [search, setSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedFournisseurId, setSelectedFournisseurId] = useState('');
  const [pForm, setPForm] = useState({ ...EMPTY_P });
  const [vForm, setVForm] = useState({ ...EMPTY_V });
  const [multiVirements, setMultiVirements] = useState([{ montant: '', date: today }]);
  const [montantGlobalFourn, setMontantGlobalFourn] = useState('');

  const loadData = () => {
    api.get('/paiements/paiements/').then(r => setPaiements(r.data.results || r.data));
    api.get('/paiements/virements/').then(r => setVirements(r.data.results || r.data));
    api.get('/clients/').then(r => setClients(r.data.results || r.data));
    api.get('/fournisseurs/').then(r => setFournisseurs(r.data.results || r.data));
    api.get('/hr/employes/').then(r => setEmployes(r.data.results || r.data));
  };
  useEffect(() => { loadData(); }, []);

  // Client/Fournisseur solde
  const selClient = useMemo(() => clients.find(c => String(c.id) === selectedClientId), [clients, selectedClientId]);
  const selFourn = useMemo(() => fournisseurs.find(f => String(f.id) === selectedFournisseurId), [fournisseurs, selectedFournisseurId]);
  const clientDette = selClient ? Math.max(0, -Number(selClient.solde)) : 0;   // negative solde = owes us
  const fournDette = selFourn ? Math.max(0, -Number(selFourn.solde)) : 0;       // negative solde = we owe them

  const resteP = pForm.type_paiement === 'vente' ? clientDette : fournDette;

  const handlePModeToggle = (m: 'versement' | 'total') => {
    setPMode(m);
    if (m === 'total') setPForm(f => ({ ...f, montant: String(resteP) }));
    else setPForm(f => ({ ...f, montant: '' }));
  };

  const handleClientChange = (id: string) => {
    setSelectedClientId(id);
    setPForm(f => ({ ...f, client_nom: clients.find(c => String(c.id) === id)?.nom || '', montant: '' }));
    setPMode('versement');
  };

  const handleFournChange = (id: string) => {
    setSelectedFournisseurId(id);
    setPForm(f => ({ ...f, fournisseur_nom: fournisseurs.find(f => String(f.id) === id)?.nom || '', montant: '' }));
    setPMode('versement');
  };

  // Virement employee
  const selEmploye = useMemo(() => employes.find(e => String(e.id) === String(vForm.employe)), [employes, vForm.employe]);
  const salaire = Number(selEmploye?.salaire_base || 0);
  const currentMonth = today.slice(0, 7);
  const totalPaye = useMemo(() =>
    virements.filter(v => String(v.employe) === String(vForm.employe) && v.date?.startsWith(currentMonth)).reduce((s, v) => s + Number(v.montant), 0),
    [virements, vForm.employe, currentMonth]);
  const resteV = Math.max(0, salaire - totalPaye);

  const handleVModeToggle = (m: 'versement' | 'total') => {
    setVMode(m);
    if (m === 'total') setVForm(f => ({ ...f, montant: String(resteV) }));
    else setVForm(f => ({ ...f, montant: '' }));
  };

  const savePaiement = async () => {
    // Cas spécial: Paiement fournisseur (achat) en virement multiple
    if (pForm.type_paiement === 'achat') {
      const vValid = multiVirements.filter(v => Number(v.montant) > 0);
      if (vValid.length === 0) { toast.error('Veuillez ajouter au moins un virement valide'); return; }
      
      const totalMulti = vValid.reduce((s, v) => s + Number(v.montant), 0);
      if (resteP > 0 && totalMulti > resteP) { toast.error(`Total des virements dépasse la dette (${resteP.toLocaleString()} DA)`); return; }

      try {
        await Promise.all(vValid.map(v => 
          api.post('/paiements/paiements/', {
            ...pForm,
            montant: Number(v.montant),
            date: v.date,
            mode: 'virement' // On force le virement
          })
        ));
        toast.success(`${vValid.length} paiement(s) enregistré(s) ✓`);
        setModal(false); setPForm({ ...EMPTY_P }); setSelectedFournisseurId('');
        setMultiVirements([{ montant: '', date: today }]); setMontantGlobalFourn('');
        loadData();
      } catch (e: any) { toast.error(JSON.stringify(e?.response?.data || 'Erreur lors de l\'enregistrement')); }
      return;
    }

    if (!pForm.montant || Number(pForm.montant) <= 0) { toast.error('Montant invalide'); return; }
    if (resteP > 0 && Number(pForm.montant) > resteP) { toast.error(`Max: ${resteP.toLocaleString()} DA`); return; }
    try {
      await api.post('/paiements/paiements/', { ...pForm, montant: Number(pForm.montant) });
      toast.success('Paiement enregistré ✓');
      setModal(false); setPForm({ ...EMPTY_P }); setSelectedClientId(''); setSelectedFournisseurId('');
      loadData();
    } catch (e: any) { toast.error(JSON.stringify(e?.response?.data || 'Erreur')); }
  };

  const saveVirement = async () => {
    if (!vForm.employe) { toast.error('Sélectionner un employé'); return; }
    if (!vForm.montant || Number(vForm.montant) <= 0) { toast.error('Montant invalide'); return; }
    if (resteV > 0 && Number(vForm.montant) > resteV) { toast.error(`Max: ${resteV.toLocaleString()} DA`); return; }
    try {
      await api.post('/paiements/virements/', { ...vForm, montant: Number(vForm.montant), employe: Number(vForm.employe) });
      toast.success('Virement enregistré ✓');
      setModal(false); setVForm({ ...EMPTY_V }); loadData();
    } catch (e: any) { toast.error(JSON.stringify(e?.response?.data || 'Erreur')); }
  };

  const sc: Record<string, string> = { en_attente: 'badge-warning', valide: 'badge-success', execute: 'badge-success', rejete: 'badge-danger' };
  const fr = lang === 'fr';

  const filteredPaiements = paiements.filter(p => {
    const q = search.toLowerCase();
    return !q || p.client_nom?.toLowerCase().includes(q) || p.fournisseur_nom?.toLowerCase().includes(q);
  });

  const filteredVirements = virements.filter(v => {
    const q = search.toLowerCase();
    return !q || v.employe_nom?.toLowerCase().includes(q) || v.banque?.toLowerCase().includes(q) || v.motif?.toLowerCase().includes(q);
  });

  return (
    <AppLayout allowedRoles={['admin']}>
      <div className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Wallet size={20} color="var(--brand-primary)" />
            {fr ? 'Paiements & Virements' : 'المدفوعات والتحويلات'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
            {filteredPaiements.length} {fr ? 'paiements' : 'مدفوعات'} · {filteredVirements.length} {fr ? 'virements' : 'تحويلات'}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={15} /> {fr ? 'Nouveau' : 'جديد'}</button>
      </div>

      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: 'var(--bg-elevated)', padding: '4px', borderRadius: '10px', width: 'fit-content' }}>
        <button className={`btn ${tab === 'paiements' ? 'btn-primary' : 'btn-secondary'}`} style={{ border: 'none' }} onClick={() => setTab('paiements')}><CreditCard size={14} /> {fr ? 'Paiements' : 'مدفوعات'}</button>
        <button className={`btn ${tab === 'virements' ? 'btn-primary' : 'btn-secondary'}`} style={{ border: 'none' }} onClick={() => setTab('virements')}><ArrowRightLeft size={14} /> {fr ? 'Virements' : 'تحويلات'}</button>
      </div>

      <div className="search-bar" style={{ marginBottom: '16px' }}>
        <div className="search-input-wrap" style={{ maxWidth: 360 }}>
          <Search size={18} />
          <input className="form-control" placeholder={fr ? 'Rechercher...' : 'بحث...'} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="table-container">
        {tab === 'paiements' && (
          <table>
            <thead><tr>
              <th>{fr ? 'Date' : 'التاريخ'}</th><th>{fr ? 'Type' : 'النوع'}</th><th>{fr ? 'Mode' : 'الطريقة'}</th>
              <th>{fr ? 'Client/Fournisseur' : 'العميل/المورد'}</th><th>{fr ? 'Montant' : 'المبلغ'}</th><th>Statut</th>
            </tr></thead>
            <tbody>{filteredPaiements.map(p => (
              <tr key={p.id}>
                <td style={{ fontSize: '12px' }}>{new Date(p.created_at).toLocaleDateString()}</td>
                <td><span className="badge badge-info">{p.type_paiement}</span></td>
                <td>{p.mode}</td>
                <td>{p.client_nom || p.fournisseur_nom || '-'}</td>
                <td style={{ fontWeight: 700, color: 'var(--brand-primary)' }}>{Number(p.montant).toLocaleString()} DA</td>
                <td><span className={`badge ${sc[p.statut] || 'badge-gray'}`}>{p.statut}</span></td>
              </tr>
            ))}</tbody>
          </table>
        )}

        {tab === 'virements' && (
          <table>
            <thead><tr>
              <th>{fr ? 'Date' : 'التاريخ'}</th><th>{fr ? 'Employé' : 'الموظف'}</th><th>{fr ? 'Montant' : 'المبلغ'}</th>
              <th>{fr ? 'Banque' : 'البنك'}</th><th>{fr ? 'Motif' : 'السبب'}</th><th>Statut</th>
            </tr></thead>
            <tbody>{filteredVirements.map(v => (
              <tr key={v.id}>
                <td style={{ fontSize: '12px' }}>{new Date(v.created_at).toLocaleDateString()}</td>
                <td style={{ fontWeight: 600 }}>{v.employe_nom}</td>
                <td style={{ fontWeight: 700, color: 'var(--brand-primary)' }}>{Number(v.montant).toLocaleString()} DA</td>
                <td>{v.banque || '-'}</td><td>{v.motif || '-'}</td>
                <td><span className={`badge ${sc[v.statut] || 'badge-gray'}`}>{v.statut}</span></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            {/* Tab */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: 'var(--bg-elevated)', padding: '4px', borderRadius: '8px' }}>
              <button className={`btn ${tab === 'paiements' ? 'btn-primary' : 'btn-secondary'}`} style={{ border: 'none', flex: 1 }} onClick={() => setTab('paiements')}>{fr ? 'Paiement Client/Fourn.' : 'دفع'}</button>
              <button className={`btn ${tab === 'virements' ? 'btn-primary' : 'btn-secondary'}`} style={{ border: 'none', flex: 1 }} onClick={() => setTab('virements')}>{fr ? 'Virement Employé' : 'تحويل'}</button>
            </div>

            {/* ── PAIEMENT FORM ─────────────────────────────── */}
            {tab === 'paiements' && (
              <>
                <div className="modal-title">💳 {fr ? 'Nouveau paiement' : 'دفعة جديدة'}</div>
                <div className="grid-2" style={{ marginBottom: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">{fr ? 'Type' : 'النوع'}</label>
                    <select className="form-control" value={pForm.type_paiement}
                      onChange={e => { 
                        const isAchat = e.target.value === 'achat';
                        setPForm(f => ({ ...EMPTY_P, type_paiement: e.target.value, date: f.date, mode: isAchat ? 'virement' : f.mode })); 
                        setSelectedClientId(''); 
                        if (isAchat) {
                          // Auto-select the first (or SARL VERY NET)
                          const sarl = fournisseurs.find(f => f.nom.toUpperCase().includes('SARL VERY NET'));
                          if (sarl) setSelectedFournisseurId(String(sarl.id));
                          else if (fournisseurs.length > 0) setSelectedFournisseurId(String(fournisseurs[0].id));
                        } else {
                          setSelectedFournisseurId(''); 
                        }
                        setPMode('versement'); 
                      }}>
                      <option value="vente">{fr ? 'Règlement client' : 'تسوية عميل'}</option>
                      <option value="achat">{fr ? 'Paiement fournisseur (SARL VERY NET)' : 'دفع للمورد'}</option>
                      <option value="autre">Autre</option>
                    </select>
                  </div>
                  {pForm.type_paiement !== 'achat' && (
                    <div className="form-group">
                      <label className="form-label">{fr ? 'Mode' : 'الطريقة'}</label>
                      <select className="form-control" value={pForm.mode} onChange={e => setPForm(f => ({ ...f, mode: e.target.value }))}>
                        <option value="especes">{fr ? 'Espèces' : 'نقداً'}</option>
                        <option value="virement">{fr ? 'Virement' : 'تحويل'}</option>
                        <option value="cheque">{fr ? 'Chèque' : 'شيك'}</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Client or Fournisseur selector */}
                {pForm.type_paiement === 'vente' && (
                  <div className="form-group">
                    <label className="form-label">👤 {fr ? 'Client' : 'العميل'}</label>
                    <select className="form-control" value={selectedClientId} onChange={e => handleClientChange(e.target.value)}>
                      <option value="">{fr ? '-- Sélectionner client --' : '-- اختر عميلاً --'}</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.nom} {Number(c.solde) < 0 ? `· دين ${Math.abs(Number(c.solde)).toLocaleString()} DA` : ''}</option>)}
                    </select>
                  </div>
                )}
                {pForm.type_paiement === 'achat' && (
                  <div className="form-group">
                    <label className="form-label">🏭 {fr ? 'Fournisseur' : 'المورد'}</label>
                    <select className="form-control" value={selectedFournisseurId} onChange={e => handleFournChange(e.target.value)}>
                      <option value="">{fr ? '-- Sélectionner fournisseur --' : '-- اختر مورداً --'}</option>
                      {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom} {Number(f.solde) < 0 ? `· dette ${Math.abs(Number(f.solde)).toLocaleString()} DA` : ''}</option>)}
                    </select>
                  </div>
                )}

                {/* Solde panel for client */}
                {pForm.type_paiement === 'vente' && selClient && (
                  <SoldePanel items={[
                    { icon: '💰', label: fr ? 'Solde client' : 'رصيد العميل', value: Number(selClient.solde), color: Number(selClient.solde) < 0 ? '#ef4444' : '#10b981' },
                    { icon: '⏳', label: fr ? 'Dette (reste à payer)' : 'الدين المتبقي', value: clientDette, color: clientDette > 0 ? '#ef4444' : '#10b981' },
                  ]} />
                )}

                {/* Solde panel for fournisseur */}
                {pForm.type_paiement === 'achat' && selFourn && (
                  <SoldePanel items={[
                    { icon: '🏭', label: fr ? 'Solde fournisseur' : 'رصيد المورد', value: Number(selFourn.solde), color: Number(selFourn.solde) < 0 ? '#ef4444' : '#10b981' },
                    { icon: '⏳', label: fr ? 'Notre dette' : 'ديننا', value: fournDette, color: fournDette > 0 ? '#ef4444' : '#10b981' },
                  ]} />
                )}

                {/* Versement toggle (Client only) */}
                {pForm.type_paiement === 'vente' && resteP > 0 && (
                  <VersementToggle mode={pMode} onSelect={handlePModeToggle}
                    resteLabel={fr ? `Tout régler · ${resteP.toLocaleString()} DA` : `تسوية كاملة · ${resteP.toLocaleString()} DA`} />
                )}
                {pForm.type_paiement === 'vente' && resteP === 0 && selClient && (
                  <div className="alert alert-success">✅ {fr ? 'Aucune dette — solde à jour.' : 'لا يوجد دين — الرصيد محدّث.'}</div>
                )}
                {pForm.type_paiement === 'achat' && resteP === 0 && selFourn && (
                  <div className="alert alert-success" style={{ marginBottom: '16px' }}>✅ {fr ? 'Aucune dette — solde fournisseur à jour.' : 'لا يوجد دين — الرصيد محدّث.'}</div>
                )}

                {/* Form fields */}
                {pForm.type_paiement === 'achat' ? (
                  // ACHAT : DYNAMIC VIREMENTS
                  <div style={{ background: 'var(--bg-elevated)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <div style={{ marginBottom: '16px', display: 'flex', gap: '16px', alignItems: 'flex-end' }}>
                      <div className="form-group" style={{ flex: 1, margin: 0 }}>
                        <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>{fr ? 'Montant Global Estimé' : 'المبلغ الإجمالي'}</span>
                          <span style={{ color: 'var(--brand-primary)', fontWeight: 800 }}>
                            {multiVirements.reduce((s, v) => s + Number(v.montant), 0).toLocaleString()} DA
                          </span>
                        </label>
                        <input className="form-control" type="number" min="0" value={montantGlobalFourn}
                          onChange={e => setMontantGlobalFourn(e.target.value)}
                          placeholder="Ex: 500000" style={{ fontWeight: 700, fontSize: '16px' }} />
                      </div>
                    </div>
                    
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {fr ? 'Détails des virements' : 'تفاصيل التحويلات'}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {multiVirements.map((v, i) => (
                        <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input className="form-control" type="number" min="0" placeholder="Montant"
                            value={v.montant} onChange={e => {
                              const newV = [...multiVirements]; newV[i].montant = e.target.value; setMultiVirements(newV);
                            }}
                            style={{ flex: 1, fontWeight: 600 }} />
                          <input className="form-control" type="date" value={v.date}
                            onChange={e => {
                              const newV = [...multiVirements]; newV[i].date = e.target.value; setMultiVirements(newV);
                            }}
                            style={{ width: '140px' }} />
                          <button className="btn btn-danger" style={{ padding: '8px' }} 
                            onClick={() => setMultiVirements(multiVirements.filter((_, idx) => idx !== i))}
                            disabled={multiVirements.length === 1}>
                            ✕
                          </button>
                        </div>
                      ))}
                      <button className="btn btn-secondary" style={{ width: 'fit-content', padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => setMultiVirements([...multiVirements, { montant: '', date: today }])}>
                        <Plus size={14} /> {fr ? 'Ajouter un virement' : 'إضافة تحويل'}
                      </button>
                    </div>
                  </div>
                ) : (
                  // VENTE / AUTRE : SINGLE PAYMENT
                  <div className="grid-2">
                    <div className="form-group">
                      <label className="form-label">
                        {fr ? 'Montant (DA)' : 'المبلغ (DA)'}
                        {resteP > 0 && <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: '6px', textTransform: 'none' }}>max {resteP.toLocaleString()} DA</span>}
                      </label>
                      <input className="form-control" type="number" min="0" value={pForm.montant}
                        onChange={e => { setPMode('versement'); setPForm(f => ({ ...f, montant: e.target.value })); }}
                        style={{ fontWeight: 700, fontSize: '16px' }} placeholder="0" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">{fr ? 'Date' : 'التاريخ'}</label>
                      <input className="form-control" type="date" value={pForm.date} onChange={e => setPForm(f => ({ ...f, date: e.target.value }))} />
                    </div>
                    {pForm.type_paiement === 'autre' && (
                      <div className="form-group" style={{ gridColumn: 'span 2' }}>
                        <label className="form-label">{fr ? 'Nom client/fourn.' : 'اسم العميل/المورد'}</label>
                        <input className="form-control" value={pForm.client_nom} onChange={e => setPForm(f => ({ ...f, client_nom: e.target.value }))} />
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button className="btn btn-secondary" onClick={() => setModal(false)}>{fr ? 'Annuler' : 'إلغاء'}</button>
                  <button className="btn btn-primary" onClick={savePaiement}>💳 {fr ? 'Enregistrer' : 'حفظ'}</button>
                </div>
              </>
            )}

            {/* ── VIREMENT FORM ─────────────────────────────── */}
            {tab === 'virements' && (
              <>
                <div className="modal-title">💸 {fr ? 'Virement employé' : 'تحويل للموظف'}</div>
                <div className="form-group">
                  <label className="form-label">{fr ? 'Employé' : 'الموظف'}</label>
                  <select className="form-control" value={vForm.employe}
                    onChange={e => { setVForm(f => ({ ...f, employe: e.target.value, montant: '' })); setVMode('versement'); }}>
                    <option value="">{fr ? '-- Sélectionner --' : '-- اختر --'}</option>
                    {employes.map(e => <option key={e.id} value={e.id}>{e.prenom} {e.nom} — {Number(e.salaire_base).toLocaleString()} DA</option>)}
                  </select>
                </div>

                {selEmploye && (
                  <SoldePanel items={[
                    { icon: '💰', label: fr ? 'Salaire' : 'الراتب', value: salaire, color: 'var(--text-primary)' },
                    { icon: '✅', label: fr ? 'Payé ce mois' : 'مدفوع', value: totalPaye, color: '#10b981' },
                    { icon: '⏳', label: fr ? 'Reste' : 'المتبقي', value: resteV, color: resteV > 0 ? '#ef4444' : '#10b981' },
                  ]} />
                )}

                {selEmploye && resteV > 0 && (
                  <VersementToggle mode={vMode} onSelect={handleVModeToggle}
                    resteLabel={fr ? `Tout payer · ${resteV.toLocaleString()} DA` : `دفع الكل · ${resteV.toLocaleString()} DA`} />
                )}
                {selEmploye && resteV === 0 && (
                  <div className="alert alert-success">✅ {fr ? 'Salaire entièrement payé ce mois.' : 'تم دفع الراتب كاملاً.'}</div>
                )}

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">
                      {fr ? 'Montant (DA)' : 'المبلغ (DA)'}
                      {selEmploye && resteV > 0 && <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: '6px', textTransform: 'none' }}>max {resteV.toLocaleString()} DA</span>}
                    </label>
                    <input className="form-control" type="number" min="0" value={vForm.montant}
                      onChange={e => { setVMode('versement'); setVForm(f => ({ ...f, montant: e.target.value })); }}
                      style={{ fontWeight: 700, fontSize: '16px' }} placeholder="0" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{fr ? 'Date' : 'التاريخ'}</label>
                    <input className="form-control" type="date" value={vForm.date} onChange={e => setVForm(f => ({ ...f, date: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{fr ? 'Banque' : 'البنك'}</label>
                    <input className="form-control" value={vForm.banque} onChange={e => setVForm(f => ({ ...f, banque: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{fr ? 'Motif' : 'السبب'}</label>
                    <input className="form-control" value={vForm.motif} onChange={e => setVForm(f => ({ ...f, motif: e.target.value }))} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button className="btn btn-secondary" onClick={() => setModal(false)}>{fr ? 'Annuler' : 'إلغاء'}</button>
                  <button className="btn btn-primary" onClick={saveVirement} disabled={!!selEmploye && resteV === 0}>
                    💸 {fr ? 'Enregistrer' : 'تسجيل'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
