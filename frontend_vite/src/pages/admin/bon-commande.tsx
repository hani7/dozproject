import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { useLang } from '@/contexts/LangContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { FileText, Printer, Search, Package, ChevronDown, ChevronUp, Plus, X } from 'lucide-react';

// ── helpers ──────────────────────────────────────────────────────────────────
function getPalettes(quantite: number, unitesPalette = 40): { palettes: number; reste: number } {
  const palettes = Math.floor(quantite / unitesPalette);
  const reste    = quantite % unitesPalette;
  return { palettes, reste };
}

function printBonCommande(achat: any, fr: boolean) {
  const dateStr = new Date().toLocaleDateString('fr-DZ', { day: '2-digit', month: 'long', year: 'numeric' });
  const lignesHTML = (achat.lignes || []).map((l: any, i: number) => {
    const pal = Number(l.quantite); // already in PALETTES
    return `
      <tr>
        <td>${i + 1}</td>
        <td style="font-weight:700">${l.produit_nom || '—'}</td>
        <td style="text-align:center;font-weight:800;font-size:15px;color:#006045">${pal} pal</td>
      </tr>`;
  }).join('');

  const totalPal = (achat.lignes || []).reduce((s: number, l: any) => s + Number(l.quantite), 0);

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Bon de Commande — ${achat.reference}</title>
<style>
  @page { size: A4; margin: 20mm 18mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #111; background: #fff; }

  /* Header */
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; }
  .company { }
  .company h1 { font-size: 26px; font-weight: 900; color: #006045; letter-spacing: -0.5px; }
  .company p  { font-size: 11px; color: #666; margin-top: 2px; }
  .doc-title { text-align: right; }
  .doc-title h2 { font-size: 20px; font-weight: 800; color: #111; text-transform: uppercase; letter-spacing: 1px; }
  .doc-title .ref { font-size: 13px; font-weight: 700; color: #006045; margin-top: 4px; }
  .doc-title .date { font-size: 11px; color: #666; margin-top: 2px; }

  /* Info boxes */
  .info-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
  .info-box { border: 1.5px solid #e5e7eb; border-radius: 8px; padding: 12px 14px; }
  .info-box .label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #999; letter-spacing: 0.5px; margin-bottom: 5px; }
  .info-box .value { font-size: 13px; font-weight: 700; color: #111; }
  .info-box .sub   { font-size: 11px; color: #555; margin-top: 2px; }

  /* Table */
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  thead tr { background: #006045; color: #fff; }
  thead th { padding: 10px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; text-align: left; }
  thead th:nth-child(3), thead th:nth-child(4), thead th:nth-child(5) { text-align: center; }
  tbody tr { border-bottom: 1px solid #f0f0f0; }
  tbody tr:nth-child(even) { background: #f9fafb; }
  tbody td { padding: 9px 12px; font-size: 12px; vertical-align: middle; }

  /* Summary */
  .summary { border: 2px solid #006045; border-radius: 8px; padding: 14px 16px; margin-bottom: 24px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
  .summary .item .lbl { font-size: 10px; color: #888; text-transform: uppercase; font-weight: 600; }
  .summary .item .val { font-size: 16px; font-weight: 800; color: #006045; margin-top: 2px; }

  /* Signatures */
  .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-top: 20px; }
  .sig-box { border-top: 2px solid #111; padding-top: 8px; text-align: center; }
  .sig-box .title { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #555; }
  .sig-box .space { height: 48px; }
  .sig-box .name  { font-size: 11px; color: #888; margin-top: 4px; }

  /* Footer */
  .footer { margin-top: 28px; border-top: 1px solid #e5e7eb; padding-top: 10px; display: flex; justify-content: space-between; font-size: 10px; color: #aaa; }

  .stamp { border: 3px solid #006045; border-radius: 50%; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; color: #006045; font-weight: 800; font-size: 10px; text-align: center; margin: 0 auto 8px; opacity: 0.25; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div class="company">
      <h1>ForCli</h1>
      <p>Distribution &amp; Commerce</p>
      <p>doz.baitul.tech</p>
    </div>
    <div class="doc-title">
      <h2>${fr ? 'Bon de Commande' : 'أمر الشراء'}</h2>
      <div class="ref">${achat.reference}</div>
      <div class="date">${dateStr}</div>
    </div>
  </div>

  <!-- Info -->
  <div class="info-row">
    <div class="info-box">
      <div class="label">${fr ? 'Fournisseur' : 'المورد'}</div>
      <div class="value">${achat.fournisseur_nom || '—'}</div>
      ${achat.fournisseur_tel ? `<div class="sub">📞 ${achat.fournisseur_tel}</div>` : ''}
      ${achat.fournisseur_adresse ? `<div class="sub">📍 ${achat.fournisseur_adresse}</div>` : ''}
    </div>
    <div class="info-box">
      <div class="label">${fr ? 'Détails' : 'التفاصيل'}</div>
      <div class="value">${fr ? 'Date' : 'التاريخ'}: ${achat.date || dateStr}</div>
      <div class="sub">${fr ? 'Mode paiement' : 'طريقة الدفع'}: ${achat.mode_paiement || '—'}</div>
      <div class="sub">${fr ? 'Statut' : 'الحالة'}: ${achat.statut || '—'}</div>
    </div>
  </div>

  <!-- Products table -->
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>${fr ? 'Produit' : 'المنتج'}</th>
        <th style="text-align:center">${fr ? 'Quantité (pal)' : 'الكمية (باليت)'}</th>
      </tr>
    </thead>
    <tbody>
      ${lignesHTML}
    </tbody>
  </table>

  <!-- Summary -->
  <div class="summary">
    <div class="item">
      <div class="lbl">${fr ? 'Total palettes' : 'مجموع الباليت'}</div>
      <div class="val">${totalPal} pal</div>
    </div>
  </div>

  <!-- Signatures -->
  <div class="signatures">
    <div class="sig-box">
      <div class="space"></div>
      <div class="title">${fr ? 'Commandé par' : 'صادر عن'}</div>
      <div class="name">ForCli Distribution</div>
    </div>
    <div class="sig-box">
      <div class="stamp">CACHET</div>
      <div class="title">${fr ? 'Cachet société' : 'ختم الشركة'}</div>
    </div>
    <div class="sig-box">
      <div class="space"></div>
      <div class="title">${fr ? 'Reçu par fournisseur' : 'مستلم من المورد'}</div>
      <div class="name">${achat.fournisseur_nom || ''}</div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <span>${fr ? 'Document généré le' : 'تم الإنشاء في'} ${new Date().toLocaleString('fr-DZ')}</span>
    <span>ForCli — doz.baitul.tech</span>
    <span>${fr ? 'Bon de Commande' : 'أمر الشراء'} · ${achat.reference}</span>
  </div>
</body>
</html>`;

  const w = window.open('', '_blank', 'width=900,height=700,scrollbars=yes');
  if (!w) { toast.error('Activez les pop-ups'); return; }
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 600);
}

// ── Component ─────────────────────────────────────────────────────────────────
const EMPTY_LIGNE = { produit_nom: '', quantite: '' };

export default function BonCommandePage() {
  const { lang } = useLang();
  const fr = lang === 'fr';
  const [achats, setAchats] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [fournisseurs, setFournisseurs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);
  // New standalone modal
  const [newModal, setNewModal] = useState(false);
  const [newForm, setNewForm] = useState({ reference: '', fournisseur_id: '', date: new Date().toISOString().split('T')[0], notes: '' });
  const [newLignes, setNewLignes] = useState([{ ...EMPTY_LIGNE }]);
  // Saved standalone bons (localStorage)
  const [savedBons, setSavedBons] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem('forcli_bons_commande') || '[]'); } catch { return []; }
  });

  useEffect(() => {
    Promise.all([
      api.get('/achats/'),
      api.get('/products/'),
      api.get('/fournisseurs/'),
    ]).then(([ra, rp, rf]) => {
      setAchats(ra.data.results || ra.data);
      setProducts(rp.data.results || rp.data);
      setFournisseurs(rf.data.results || rf.data);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = achats.filter(a => {
    const q = search.toLowerCase();
    return !q || a.reference?.toLowerCase().includes(q) || a.fournisseur_nom?.toLowerCase().includes(q);
  });

  const openNew = () => {
    setNewForm({ reference: `BC-${Date.now()}`, fournisseur_id: '', date: new Date().toISOString().split('T')[0], notes: '' });
    setNewLignes([{ ...EMPTY_LIGNE }]);
    setNewModal(true);
  };

  const generateNew = () => {
    const fournisseur = fournisseurs.find((f: any) => String(f.id) === newForm.fournisseur_id);
    // quantite stored in PALETTES directly
    const lignes = newLignes.filter(l => l.produit_nom.trim() && Number(l.quantite) > 0)
      .map(l => ({ produit_nom: l.produit_nom, quantite: l.quantite, prix_unitaire: 0 }));
    if (!lignes.length) { toast.error(fr ? 'Ajoutez au moins un produit' : 'أضف منتجاً واحداً'); return; }
    const bon = {
      reference: newForm.reference || `BC-${Date.now()}`,
      fournisseur_nom: fournisseur?.nom || '',
      fournisseur_tel: fournisseur?.telephone || '',
      fournisseur_adresse: fournisseur?.adresse || '',
      date: newForm.date, notes: newForm.notes,
      statut: '', mode_paiement: '',
      lignes,
      saved_at: new Date().toISOString(),
    };
    // Persist to localStorage
    const updated = [bon, ...savedBons];
    setSavedBons(updated);
    try { localStorage.setItem('forcli_bons_commande', JSON.stringify(updated)); } catch {}
    toast.success(fr ? '✅ Bon enregistré et imprimé!' : '✅ تم الحفظ والطباعة!');
    printBonCommande(bon, fr);
    setNewModal(false);
  };

  return (
    <AppLayout allowedRoles={['admin']}>
      <div className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={22} /> {fr ? 'Bons de Commande' : 'أوامر الشراء'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
            {fr ? 'Créez et imprimez des bons de commande fournisseur' : 'أنشئ وأطبع أوامر الشراء للموردين'}
          </p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          <Plus size={15} /> {fr ? 'Nouveau bon de commande' : 'أمر شراء جديد'}
        </button>
      </div>

      {/* ── Quick-create card ── */}
      <div className="card" style={{ padding: '14px 18px', marginBottom: '20px', background: 'linear-gradient(135deg,rgba(0,96,69,0.05),rgba(16,185,129,0.03))', border: '2px dashed rgba(0,96,69,0.25)', cursor: 'pointer' }} onClick={openNew}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: 42, height: 42, borderRadius: '12px', background: 'rgba(0,96,69,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Plus size={20} color="var(--brand-primary)" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--brand-primary)' }}>{fr ? 'Créer un bon de commande indépendant' : 'إنشاء أمر شراء مستقل'}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 2 }}>{fr ? 'Fournisseur + produits + palettes → PDF sans prix' : 'مورد + منتجات + باليت → PDF بدون سعر'}</div>
          </div>
          <Printer size={18} color="var(--text-muted)" />
        </div>
      </div>

      {/* ── Saved standalone bons ── */}
      {savedBons.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--brand-primary)', letterSpacing: '1px', marginBottom: '10px' }}>
            📋 {fr ? `${savedBons.length} bon(s) enregistré(s)` : `${savedBons.length} أمر/أوامر محفوظة`}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {savedBons.map((bon, idx) => (
              <div key={idx} className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'rgba(0,96,69,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileText size={16} color="var(--brand-primary)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: '13px' }}>{bon.reference}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>
                    {bon.fournisseur_nom || (fr ? '— sans fournisseur —' : '— بدون مورد —')}
                    {' · '}
                    {(bon.lignes || []).reduce((s: number, l: any) => s + Number(l.quantite), 0)} pal
                    {' · '}
                    {new Date(bon.saved_at).toLocaleDateString('fr-DZ')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button onClick={() => printBonCommande(bon, fr)}
                    style={{ padding: '5px 10px', borderRadius: '7px', border: '1px solid rgba(0,96,69,0.3)', background: 'rgba(0,96,69,0.06)', color: 'var(--brand-primary)', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Printer size={12} /> {fr ? 'Réimprimer' : 'إعادة طباعة'}
                  </button>
                  <button onClick={() => { const u = savedBons.filter((_, i) => i !== idx); setSavedBons(u); try { localStorage.setItem('forcli_bons_commande', JSON.stringify(u)); } catch {} }}
                    style={{ width: 28, height: 28, borderRadius: '7px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>
                    <X size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Divider ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '1px', flexShrink: 0 }}>{fr ? "Depuis les bons d'achat" : 'من المشتريات'}</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>


      {/* Search */}
      <div style={{ marginBottom: '16px', maxWidth: 400, position: 'relative' }}>
        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input className="form-control"
          style={{ paddingLeft: 32, fontSize: '13px' }}
          placeholder={fr ? 'Rechercher référence ou fournisseur...' : 'بحث...'}
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state card" style={{ padding: 50 }}>
          <FileText size={40} />
          <p style={{ marginTop: 12, fontWeight: 600 }}>{fr ? 'Aucun bon d\'achat trouvé' : 'لا توجد أوامر شراء'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map(a => {
            const totalCtns = (a.lignes || []).reduce((s: number, l: any) => s + Number(l.quantite), 0);
            const { palettes, reste } = getPalettes(totalCtns);
            const isOpen = expanded === a.id;
            return (
              <div key={a.id} className="card" style={{ overflow: 'hidden' }}>
                {/* Row header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', cursor: 'pointer' }}
                  onClick={() => setExpanded(isOpen ? null : a.id)}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(0,96,69,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FileText size={18} color="var(--brand-primary)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: '14px', color: 'var(--brand-primary)' }}>{a.reference}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: 2 }}>
                      {a.fournisseur_nom} · {a.date} · <strong>{(a.lignes || []).length}</strong> réf.
                    </div>
                  </div>
                  {/* Palette summary badge */}
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <span style={{ background: 'rgba(0,96,69,0.1)', color: 'var(--brand-primary)', border: '1px solid rgba(0,96,69,0.2)', borderRadius: 20, padding: '3px 10px', fontSize: '12px', fontWeight: 700 }}>
                      📦 {totalCtns.toLocaleString()} ctn
                    </span>
                    <span style={{ background: 'rgba(99,102,241,0.08)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 20, padding: '3px 10px', fontSize: '12px', fontWeight: 700 }}>
                      🏗 {palettes} pal{reste > 0 ? ` +${reste}` : ''}
                    </span>
                    <span className={`badge ${a.statut === 'recu' ? 'badge-success' : a.statut === 'confirme' ? 'badge-info' : a.statut === 'annule' ? 'badge-danger' : 'badge-gray'}`} style={{ fontSize: '11px' }}>
                      {a.statut}
                    </span>
                  </div>
                  {/* Print button */}
                  <button
                    onClick={e => { e.stopPropagation(); printBonCommande(a, fr); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', border: '1px solid rgba(0,96,69,0.3)', background: 'rgba(0,96,69,0.06)', color: 'var(--brand-primary)', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                    <Printer size={14} /> {fr ? 'PDF' : 'PDF'}
                  </button>
                  {isOpen ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
                </div>

                {/* Expanded product details */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-elevated)', padding: '12px 16px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid var(--border)' }}>
                          <th style={{ textAlign: 'left', padding: '6px 8px', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                            <Package size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} /> {fr ? 'Produit' : 'المنتج'}
                          </th>
                          <th style={{ textAlign: 'center', padding: '6px 8px', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{fr ? 'Caisses (ctn)' : 'كراتين'}</th>
                          <th style={{ textAlign: 'center', padding: '6px 8px', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{fr ? 'Palettes' : 'باليت'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(a.lignes || []).map((l: any, i: number) => {
                          const { palettes: p, reste: r } = getPalettes(Number(l.quantite));
                          return (
                            <tr key={l.id || i} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '8px', fontWeight: 600 }}>{l.produit_nom}</td>
                              <td style={{ textAlign: 'center', padding: '8px', fontWeight: 700, color: 'var(--brand-primary)' }}>{Number(l.quantite).toLocaleString('fr-DZ')} ctn</td>
                              <td style={{ textAlign: 'center', padding: '8px' }}>
                                {p > 0
                                  ? <span style={{ fontWeight: 700, color: '#6366f1' }}>{p} pal{r > 0 ? ` + ${r} ctn` : ''}</span>
                                  : <span style={{ color: 'var(--text-muted)' }}>{r} ctn</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: 'rgba(0,96,69,0.06)', borderTop: '2px solid var(--border)' }}>
                          <td style={{ padding: '8px', fontWeight: 800 }}>{fr ? 'TOTAL' : 'المجموع'}</td>
                          <td style={{ textAlign: 'center', padding: '8px', fontWeight: 800, color: 'var(--brand-primary)' }}>{totalCtns.toLocaleString('fr-DZ')} ctn</td>
                          <td style={{ textAlign: 'center', padding: '8px', fontWeight: 800, color: '#6366f1' }}>{palettes} pal{reste > 0 ? ` + ${reste} ctn` : ''}</td>
                        </tr>
                      </tfoot>
                    </table>
                    <button
                      onClick={() => printBonCommande(a, fr)}
                      style={{ marginTop: '12px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', borderRadius: '10px', border: '2px solid rgba(0,96,69,0.3)', background: 'rgba(0,96,69,0.05)', color: 'var(--brand-primary)', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      <Printer size={16} /> {fr ? 'Générer PDF Bon de Commande' : 'إنشاء PDF أمر الشراء'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}


      {/* ── New Bon Modal ── */}
      {newModal && (
        <div className="modal-overlay" onClick={() => setNewModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 540, maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(0,96,69,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FileText size={18} color="var(--brand-primary)" /></div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '15px' }}>{fr ? 'Nouveau bon de commande' : 'أمر شراء جديد'}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{fr ? 'Sans prix — pour envoi fournisseur' : 'بدون سعر — للإرسال للمورد'}</div>
                </div>
              </div>
              <button onClick={() => setNewModal(false)} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={16} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">{fr ? 'Référence' : 'المرجع'}</label>
                <input className="form-control" value={newForm.reference} onChange={e => setNewForm(f => ({ ...f, reference: e.target.value }))} placeholder="BC-..." style={{ fontSize: '13px' }} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">{fr ? 'Date' : 'التاريخ'}</label>
                <input type="date" className="form-control" value={newForm.date} onChange={e => setNewForm(f => ({ ...f, date: e.target.value }))} style={{ fontSize: '13px' }} />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label">{fr ? 'Fournisseur' : 'المورد'}</label>
              <select className="form-control" value={newForm.fournisseur_id} onChange={e => setNewForm(f => ({ ...f, fournisseur_id: e.target.value }))} style={{ fontSize: '13px' }}>
                <option value="">{fr ? '— Choisir un fournisseur —' : '— اختر مورداً —'}</option>
                {fournisseurs.map((f: any) => <option key={f.id} value={f.id}>{f.nom}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label className="form-label" style={{ margin: 0 }}>{fr ? 'Produits' : 'المنتجات'}</label>
                <button onClick={() => setNewLignes(l => [...l, { ...EMPTY_LIGNE }])} style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', border: '1px solid rgba(0,96,69,0.3)', background: 'rgba(0,96,69,0.06)', color: 'var(--brand-primary)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}><Plus size={11} /> {fr ? 'Ligne' : 'سطر'}</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 28px', gap: '6px', marginBottom: '4px', padding: '0 2px' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>{fr ? 'Produit' : 'المنتج'}</span>
                <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#006045', textAlign: 'center' }}>{fr ? 'Palettes' : 'باليت'}</span>
                <span />
              </div>
              {newLignes.map((l, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 28px', gap: '6px', marginBottom: '6px', alignItems: 'center' }}>
                  <select className="form-control" value={l.produit_nom} onChange={e => setNewLignes(prev => prev.map((li, j) => j === i ? { ...li, produit_nom: e.target.value } : li))} style={{ fontSize: '12px', height: 34 }}>
                    <option value="">{fr ? '— Produit —' : '— منتج —'}</option>
                    {products.map((p: any) => <option key={p.id} value={p.nom}>{p.nom}</option>)}
                  </select>
                  <input type="number" className="form-control" min="0" placeholder="0" value={l.quantite} onChange={e => setNewLignes(prev => prev.map((li, j) => j === i ? { ...li, quantite: e.target.value } : li))} style={{ fontSize: '14px', fontWeight: 800, textAlign: 'center', height: 34, color: '#006045' }} />
                  <button onClick={() => setNewLignes(prev => prev.filter((_, j) => j !== i))} disabled={newLignes.length === 1} style={{ width: 28, height: 28, borderRadius: '6px', border: '1px solid rgba(239,68,68,0.3)', background: newLignes.length === 1 ? 'transparent' : 'rgba(239,68,68,0.06)', color: newLignes.length === 1 ? 'var(--border)' : '#ef4444', cursor: newLignes.length === 1 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}><X size={12} /></button>
                </div>
              ))}
            </div>

            <div className="form-group" style={{ marginBottom: '18px' }}>
              <label className="form-label">{fr ? 'Notes' : 'ملاحظات'}</label>
              <textarea className="form-control" rows={2} value={newForm.notes} onChange={e => setNewForm(f => ({ ...f, notes: e.target.value }))} placeholder={fr ? 'Instructions pour le fournisseur...' : 'تعليمات للمورد...'} style={{ fontSize: '13px', resize: 'vertical' }} />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setNewModal(false)}>{fr ? 'Annuler' : 'إلغاء'}</button>
              <button onClick={generateNew} style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '10px', border: 'none', background: 'var(--brand-primary)', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}>
                <Package size={16} /> {fr ? 'Enregistrer & Imprimer' : 'حفظ وطباعة'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
