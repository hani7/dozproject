import { useState, useEffect, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import { useLang } from '@/contexts/LangContext';
import api from '@/lib/api';
import API_URL from '@/lib/config';
import toast from 'react-hot-toast';
import { CheckCircle, MapPin, Phone, Package, Navigation, Truck, RefreshCw, DollarSign, X, RotateCcw, Printer, Bluetooth, BluetoothOff } from 'lucide-react';
import type { Order } from '@/lib/types';
import {
  isBTSupported, tryAutoConnect, requestPrinter, isConnected, disconnect,
  printTicket, printTicketHTML, printViaBluetoothRaw, type PrinterStatus, type TicketData, getStoredDeviceName
} from '@/lib/bluetoothPrinter';

const MEDIA_BASE = API_URL.replace('/api', '');

export default function LivraisonsPage() {
  const { lang } = useLang();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'en_livraison' | 'livree'>('en_livraison');
  const [search, setSearch] = useState('');
  const [confirmingId, setConfirmingId] = useState<number | null>(null);

  // Payment modal state
  const [payModal, setPayModal] = useState<any | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMode, setPayMode] = useState('especes');
  const [paying, setPaying] = useState(false);
  // Multi-versement state
  const [versements, setVersements] = useState<{montant: string; mode: string}[]>([]);

  // Retour modal state
  const [retourModal, setRetourModal] = useState<any | null>(null);
  const [retourQty, setRetourQty] = useState<Record<number, string>>({});
  const [doingRetour, setDoingRetour] = useState(false);

  // Bluetooth printer state
  const [btStatus, setBtStatus] = useState<PrinterStatus>('disconnected');
  const [btName, setBtName] = useState<string | null>(getStoredDeviceName());

  const fr = lang === 'fr';

  // Auto-connect Bluetooth on mount
  useEffect(() => {
    if (!isBTSupported()) { setBtStatus('unsupported'); return; }
    setBtStatus('connecting');
    tryAutoConnect().then(ok => {
      if (ok) {
        setBtStatus('connected');
        setBtName(getStoredDeviceName());
        // Show BT connected toast only once per session
        if (!sessionStorage.getItem('bt_notif_shown')) {
          sessionStorage.setItem('bt_notif_shown', '1');
          toast.success(`🔵 Imprimante connectée: ${getStoredDeviceName()}`, { duration: 3000 });
        }
      } else {
        setBtStatus('disconnected');
      }
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [resCmd, resVente] = await Promise.all([
        api.get('/commandes/', { params: { statut: filter } }),
        api.get('/ventes/', { params: { statut: filter } })
      ]);
      const cmds = (resCmd.data.results || resCmd.data).map((c: any) => ({ ...c, is_vente: false }));
      const vts = (resVente.data.results || resVente.data).map((v: any) => ({ ...v, is_vente: true }));
      const data = [...cmds, ...vts].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setOrders(data as Order[]);
    } catch { }
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const deliver = async (order: any) => {
    setConfirmingId(order.id);
    try {
      const endpoint = order.is_vente ? `/ventes/${order.id}/livrer/` : `/commandes/${order.id}/livrer/`;
      await api.post(endpoint);
      toast.success(fr ? '✅ Livraison confirmée!' : '✅ تم تأكيد التوصيل!');
      printOrder(order);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Erreur');
    } finally { setConfirmingId(null); }
  };

  const buildTicket = (order: any): TicketData => ({
    reference:    order.reference,
    client_nom:   order.client_nom,
    client_phone: order.client_phone,
    lignes:       (order.lignes || []).map((l: any) => ({
      produit_nom:  l.produit_nom,
      quantite:     Number(l.quantite),
      prix_unitaire:Number(l.prix_unitaire),
      sous_total:   Number(l.sous_total),
    })),
    montant_total: Number(order.montant_total),
    montant_paye:  Number(order.montant_paye || 0),
    date:          order.date || new Date().toISOString().split('T')[0],
  });

  const printOrder = (order: any) => {
    const ticket = buildTicket(order);
    if (isConnected()) {
      printViaBluetoothRaw(ticket).then(ok => {
        if (ok) toast.success('🖨 Ticket imprimé!', { duration: 2000 });
        else    printTicketHTML(ticket);
      });
    } else {
      printTicketHTML(ticket);
    }
  };

  const connectBT = async () => {
    setBtStatus('connecting');
    const ok = await requestPrinter();
    if (ok) {
      setBtStatus('connected');
      setBtName(getStoredDeviceName());
      toast.success('🔵 Imprimante connectée ✓');
    } else {
      setBtStatus('disconnected');
      toast.error('Connexion échouée');
    }
  };

  const disconnectBT = () => {
    disconnect();
    setBtStatus('disconnected');
    setBtName(null);
  };

  const openPayModal = (order: any) => {
    setPayAmount('');
    setPayMode('especes');
    setVersements([{ montant: '', mode: 'especes' }]);
    setPayModal(order);
  };

  const doPaiement = async () => {
    if (!payModal) return;
    const valid = versements.filter(v => Number(v.montant) > 0);
    if (valid.length === 0) { toast.error(fr ? 'Aucun montant saisi' : 'لم يتم إدخال مبلغ'); return; }
    setPaying(true);
    try {
      const endpoint = payModal.is_vente ? `/ventes/${payModal.id}/payer/` : `/commandes/${payModal.id}/payer/`;
      for (const v of valid) {
        await api.post(endpoint, { montant: Number(v.montant), mode_paiement: v.mode });
      }
      toast.success(fr ? `✅ ${valid.length} versement(s) enregistré(s)!` : `✅ تم تسجيل ${valid.length} دفعة!`);
      setPayModal(null);
      load();
    } catch (e: any) {
      const data = e?.response?.data;
      const msg = data?.error || data?.detail || JSON.stringify(data) || 'Erreur';
      toast.error(msg, { duration: 6000 });
    } finally { setPaying(false); }
  };

  const openRetourModal = (order: any) => {
    const init: Record<number, string> = {};
    order.lignes?.forEach((l: any) => { init[l.produit] = '0'; });
    setRetourQty(init);
    setRetourModal(order);
  };

  const doRetour = async () => {
    if (!retourModal) return;
    const lignes = Object.entries(retourQty)
      .filter(([, q]) => Number(q) > 0)
      .map(([pid, q]) => ({ produit_id: Number(pid), quantite: Number(q) }));
    if (lignes.length === 0) { toast.error(fr ? 'Entrez au moins une quantité' : 'أدخل كمية واحدة على الأقل'); return; }
    setDoingRetour(true);
    try {
      const ep = retourModal.is_vente ? `/ventes/${retourModal.id}/retour/` : `/commandes/${retourModal.id}/retour/`;
      await api.post(ep, { lignes });
      toast.success(fr ? '↩ Retour enregistré ✓' : '↩ تم تسجيل الإرجاع ✓');
      setRetourModal(null);
      load();
    } catch (e: any) {
      const data = e?.response?.data;
      toast.error(data?.error || data?.detail || 'Erreur', { duration: 6000 });
    } finally { setDoingRetour(false); }
  };

  const openGPS = (order: any) => {
    const lat = order.client_latitude;
    const lng = order.client_longitude;
    if (lat && lng) {
      window.location.href = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    } else if (order.client_adresse) {
      window.location.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.client_adresse)}`;
    } else {
      toast.error(fr ? 'Aucune position GPS disponible' : 'لا يوجد موقع GPS');
    }
  };

  const callClient = (phone: string) => {
    if (!phone) {
      toast.error(fr ? 'Aucun numéro disponible (non saisi)' : 'لا يوجد رقم هاتف (لم يتم إدخاله)');
      return;
    }
    window.location.href = `tel:${phone.replace(/\s+/g, '')}`;
  };

  const filteredOrders = orders.filter(o => {
    const q = search.toLowerCase();
    return !q || o.reference?.toLowerCase().includes(q) || o.client_nom?.toLowerCase().includes(q) || (o as any).client_phone?.toLowerCase().includes(q);
  });

  const reste = payModal ? Math.max(0, Number(payModal.montant_total) - Number(payModal.montant_paye || 0)) : 0;

  return (
    <AppLayout allowedRoles={['livreur']}>
      <div className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Truck size={22} />
            {fr ? 'Mes Livraisons' : 'توصيلاتي'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
            {filteredOrders.length} {fr ? 'commande(s)' : 'طلب'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className={`btn ${filter === 'en_livraison' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('en_livraison')}>
            <Truck size={14} /> {fr ? 'À livrer' : 'للتوصيل'}
          </button>
          <button className={`btn ${filter === 'livree' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter('livree')}>
            <CheckCircle size={14} /> {fr ? 'Livrées' : 'مُسلَّمة'}
          </button>
          <button className="btn btn-secondary" onClick={load} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── Bluetooth status bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', padding: '8px 12px', borderRadius: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flex: 1 }}>
          {btStatus === 'connected'
            ? <Bluetooth size={15} color="#3b82f6" />
            : btStatus === 'connecting'
            ? <div className="spinner" style={{ width: 14, height: 14 }} />
            : <BluetoothOff size={15} color="var(--text-muted)" />}
          <span style={{ fontSize: '12px', fontWeight: 600,
            color: btStatus === 'connected' ? '#3b82f6' : btStatus === 'connecting' ? '#f59e0b' : 'var(--text-muted)' }}>
            {btStatus === 'connected' ? `🖨 ${btName || 'Imprimante'}` :
             btStatus === 'connecting' ? (fr ? 'Connexion...' : 'جارٍ الاتصال...') :
             btStatus === 'unsupported' ? (fr ? 'BT non supporté' : 'BT غير مدعوم') :
             (fr ? 'Imprimante non connectée' : 'الطابعة غير متصلة')}
          </span>
        </div>
        {btStatus === 'connected'
          ? <button onClick={disconnectBT} style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.07)', color: '#ef4444', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
              {fr ? 'Déconnecter' : 'قطع الاتصال'}
            </button>
          : btStatus !== 'unsupported' && btStatus !== 'connecting' &&
            <button onClick={connectBT} style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(59,130,246,0.35)', background: 'rgba(59,130,246,0.08)', color: '#3b82f6', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Bluetooth size={12} /> {fr ? 'Connecter imprimante' : 'توصيل طابعة'}
            </button>}
      </div>

      <div style={{ marginBottom: '16px', maxWidth: 360 }}>
        <input className="form-control" placeholder={fr ? 'Rechercher...' : 'بحث...'} value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><div className="spinner" /></div>
      ) : filteredOrders.length === 0 ? (
        <div className="empty-state card" style={{ padding: '50px' }}>
          {filter === 'en_livraison' ? <Truck size={40} /> : <CheckCircle size={40} />}
          <p style={{ marginTop: '12px', fontWeight: 600 }}>
            {filter === 'en_livraison'
              ? (fr ? 'Aucune livraison en cours' : 'لا توجد توصيلات جارية')
              : (fr ? 'Aucune livraison terminée' : 'لا توجد توصيلات منتهية')}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredOrders.map(o => {
            const paye = Number((o as any).montant_paye || 0);
            const total = Number(o.montant_total || 0);
            const resteO = Math.max(0, total - paye);
            const isPaid = resteO <= 0;

            return (
              <div key={`${(o as any).is_vente ? 'v' : 'c'}_${o.id}`} className="card" style={{ padding: '16px', overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--brand-primary)', letterSpacing: '0.5px' }}>
                      {o.reference}
                    </div>
                    <span className={`badge ${(o as any).is_vente ? 'badge-success' : (o as any).type_commande === 'gros' ? 'badge-purple' : 'badge-info'}`} style={{ fontSize: '10px', padding: '2px 6px' }}>
                      {(o as any).is_vente ? 'Camion' : (o as any).type_commande === 'gros' ? 'Gros' : 'Détail'}
                    </span>
                  </div>
                  {filter === 'livree' && (
                    <span className="badge badge-success" style={{ fontSize: '11px' }}>
                      <CheckCircle size={10} /> {fr ? 'Livré' : 'تم'}
                    </span>
                  )}
                </div>

                {/* Client info */}
                <div style={{ background: 'var(--bg-elevated)', borderRadius: '10px', padding: '12px', marginBottom: '12px' }}>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', marginBottom: '6px' }}>
                    {o.client_nom}
                  </div>
                  {o.client_adresse && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      <MapPin size={12} style={{ flexShrink: 0, marginTop: 2 }} />
                      <span>{o.client_adresse}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <button onClick={() => callClient(o.client_phone)}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '9px 12px', borderRadius: '8px', border: '1px solid rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.08)', color: '#3b82f6', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: o.client_phone ? 1 : 0.5 }}>
                      <Phone size={15} /> {fr ? 'Appeler' : 'اتصال'}
                    </button>
                    <button onClick={() => openGPS(o)}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '9px 12px', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.08)', color: '#10b981', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: ((o as any).client_latitude && (o as any).client_longitude) || (o as any).client_adresse ? 1 : 0.5 }}>
                      <Navigation size={15} /> {fr ? 'GPS' : 'GPS'}
                    </button>
                  </div>
                </div>

                {/* Products */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {fr ? 'Produits' : 'المنتجات'} ({o.lignes?.length || 0})
                  </div>
                  {o.lignes?.map((l: any, i: number) => (
                    <div key={l.id || i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', borderBottom: i < (o.lignes?.length || 0) - 1 ? '1px solid var(--border)' : 'none', alignItems: 'center', padding: '5px 0' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {l.produit_image ? (
                          <img src={`${MEDIA_BASE}${l.produit_image}`} alt={l.produit_nom} style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover', border: '1px solid var(--border)' }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                        ) : (
                          <div style={{ width: 32, height: 32, borderRadius: 6, background: 'rgba(0,96,69,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Package size={14} color="var(--brand-primary)" />
                          </div>
                        )}
                        {l.produit_nom}
                      </span>
                      <span style={{ fontWeight: 700 }}>× {l.quantite}</span>
                    </div>
                  ))}
                </div>

                {/* Payment status bar */}
                {paye > 0 && (
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', fontSize: '12px' }}>
                    <div style={{ flex: 1, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px', padding: '6px 10px' }}>
                      <div style={{ color: 'var(--text-muted)' }}>{fr ? 'Versé' : 'المدفوع'}</div>
                      <div style={{ fontWeight: 700, color: '#10b981' }}>{paye.toLocaleString('fr-DZ')} DA</div>
                    </div>
                    <div style={{ flex: 1, background: resteO > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)', border: `1px solid ${resteO > 0 ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`, borderRadius: '8px', padding: '6px 10px' }}>
                      <div style={{ color: 'var(--text-muted)' }}>{fr ? 'Reste' : 'المتبقي'}</div>
                      <div style={{ fontWeight: 700, color: resteO > 0 ? '#ef4444' : '#10b981' }}>{resteO.toLocaleString('fr-DZ')} DA</div>
                    </div>
                  </div>
                )}

                {/* Total + Action buttons */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '2px solid var(--border)', gap: '8px', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>{fr ? 'Total' : 'المجموع'}</div>
                    <div style={{ fontWeight: 900, color: 'var(--brand-primary)', fontSize: '18px' }}>{total.toLocaleString('fr-DZ')} DA</div>
                  </div>

                  {filter === 'en_livraison' && (
                    <div style={{ display: 'flex', gap: '6px', width: '100%', marginTop: '12px' }}>
                      {/* Retour */}
                      <button onClick={() => openRetourModal(o)}
                        style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '8px 2px', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.08)', color: '#d97706', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                        <RotateCcw size={16} /> {fr ? 'Retour' : 'إرجاع'}
                      </button>

                      {/* Paiement */}
                      <button onClick={() => openPayModal(o)}
                        style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '8px 2px', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.4)', background: isPaid ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.1)', color: '#10b981', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                        <DollarSign size={16} /> {isPaid ? (fr ? 'Payé' : 'مدفوع') : (fr ? 'Paiement' : 'دفع')}
                      </button>

                      {/* Print ticket */}
                      <button onClick={() => printOrder(o)}
                        title={fr ? 'Imprimer ticket client' : 'طباعة التذكرة'}
                        style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '8px 2px', borderRadius: '8px', border: '1px solid rgba(99,102,241,0.35)', background: 'rgba(99,102,241,0.08)', color: '#6366f1', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                        <Printer size={16} /> {fr ? 'Ticket' : 'تذكرة'}
                      </button>

                      {/* Livrer */}
                      <button className="btn btn-success"
                        style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '8px 2px', fontSize: '11px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(16,185,129,0.2)' }}
                        onClick={() => deliver(o)} disabled={confirmingId === o.id}>
                        {confirmingId === o.id ? <div className="spinner" style={{ width: 16, height: 16, borderColor: 'white', borderTopColor: 'transparent' }} /> : <CheckCircle size={16} />}
                        {fr ? 'Livrer' : 'تسليم'}
                      </button>
                    </div>
                  )}

                  {/* Livree: retour + paiement + ticket */}
                  {filter === 'livree' && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button onClick={() => printOrder(o)}
                        title={fr ? 'Imprimer ticket client' : 'طباعة التذكرة'}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 12px', borderRadius: '10px', border: '1px solid rgba(99,102,241,0.35)', background: 'rgba(99,102,241,0.08)', color: '#6366f1', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                        <Printer size={14} /> {fr ? 'Ticket' : 'تذكرة'}
                      </button>
                    </div>
                  )}
                </div>

                {o.notes && (
                  <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '6px 8px', background: 'rgba(245,158,11,0.06)', borderRadius: '6px', border: '1px solid rgba(245,158,11,0.15)' }}>
                    📝 {o.notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Payment Modal (multi-versement) ── */}
      {payModal && (() => {
        const total    = Number(payModal.montant_total);
        const dejaPaye = Number(payModal.montant_paye || 0);
        const totalVersements = versements.reduce((s, v) => s + (Number(v.montant) || 0), 0);
        const resteApres = Math.max(0, total - dejaPaye - totalVersements);
        const modes = [
          { value: 'especes',  label: '💵 Espèces' },
          { value: 'virement', label: '🏦 Virement' },
          { value: 'cheque',   label: '📝 Chèque' },
          { value: 'credit',   label: '⏳ Crédit' },
        ];
        return (
          <div className="modal-overlay" onClick={() => setPayModal(null)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 460, maxHeight: '90vh', overflowY: 'auto' }}>

              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <DollarSign size={20} color="#10b981" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '15px' }}>{fr ? 'Encaissement' : 'تحصيل الدفع'}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{payModal.reference} · {payModal.client_nom}</div>
                  </div>
                </div>
                <button onClick={() => setPayModal(null)} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  <X size={16} />
                </button>
              </div>

              {/* ─ Actions Moved to Top */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                <button className="btn btn-secondary" style={{ flex: 1, padding: '10px', fontSize: '13px' }} onClick={() => setPayModal(null)}>
                  {fr ? 'Annuler' : 'إلغاء'}
                </button>
                <button className="btn btn-danger" style={{ flex: 1, padding: '10px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', fontWeight: 700, fontSize: '13px' }}
                  onClick={() => {
                    setPayModal(null);
                    toast.success(fr ? 'Commande marquée comme Non payée' : 'تم التعليم كغير مدفوع');
                  }}>
                  {fr ? 'Non payé' : 'غير مدفوع'}
                </button>
                <button
                  onClick={doPaiement}
                  disabled={paying || totalVersements <= 0}
                  style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', borderRadius: '10px', border: 'none', background: totalVersements > 0 ? '#10b981' : '#aaa', color: '#fff', fontWeight: 700, fontSize: '13px', cursor: paying || totalVersements <= 0 ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}
                >
                  {paying ? <div className="spinner" style={{ width: 16, height: 16 }} /> : <DollarSign size={16} />}
                  {fr
                    ? `Valider ${versements.filter(v => Number(v.montant) > 0).length} vers.`
                    : `تأكيد الدفع`}
                </button>
              </div>

              {/* ─ Big total banner */}
              <div style={{ background: 'linear-gradient(135deg,rgba(0,96,69,0.12),rgba(16,185,129,0.08))', border: '2px solid rgba(16,185,129,0.25)', borderRadius: '12px', padding: '14px 16px', marginBottom: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: '4px' }}>{fr ? 'Total commande' : 'إجمالي الطلب'}</div>
                <div style={{ fontWeight: 900, fontSize: '28px', color: 'var(--brand-primary)', lineHeight: 1 }}>{total.toLocaleString('fr-DZ')} <span style={{ fontSize: '16px' }}>DA</span></div>
              </div>

              {/* ─ Already paid row */}
              {dejaPaye > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px', padding: '9px 14px', marginBottom: '10px', fontSize: '13px' }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>✓ {fr ? 'Déjà versé' : 'تم دفعه'}</span>
                  <span style={{ fontWeight: 800, color: '#10b981' }}>+ {dejaPaye.toLocaleString('fr-DZ')} DA</span>
                </div>
              )}

              {/* ─ Versements list */}
              <div style={{ marginBottom: '10px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.5px' }}>
                  {fr ? 'Versements' : 'الدفعات'}
                </div>
                {versements.map((v, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '6px', alignItems: 'center', marginBottom: '8px' }}>
                    {/* Amount */}
                    <input
                      type="number" min="0"
                      placeholder={fr ? 'Montant (DA)' : 'المبلغ (DA)'}
                      value={v.montant}
                      onChange={e => setVersements(prev => prev.map((vv, j) => j === i ? { ...vv, montant: e.target.value } : vv))}
                      style={{ fontSize: '15px', fontWeight: 700, textAlign: 'center', borderRadius: '8px', border: '2px solid rgba(16,185,129,0.3)', background: 'var(--bg-base)', color: Number(v.montant) > 0 ? 'var(--brand-primary)' : 'var(--text-primary)', padding: '9px 8px', fontFamily: 'inherit', width: '100%' }}
                      autoFocus={i === 0}
                    />
                    {/* Mode */}
                    <select
                      value={v.mode}
                      onChange={e => setVersements(prev => prev.map((vv, j) => j === i ? { ...vv, mode: e.target.value } : vv))}
                      style={{ fontSize: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-primary)', padding: '8px 6px', fontFamily: 'inherit', cursor: 'pointer', height: 42 }}
                    >
                      {modes.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                    {/* Remove */}
                    {versements.length > 1 && (
                      <button onClick={() => setVersements(prev => prev.filter((_, j) => j !== i))}
                        style={{ width: 34, height: 34, borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.06)', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: 'inherit' }}>
                        <X size={14} />
                      </button>
                    )}
                    {versements.length === 1 && <div style={{ width: 34 }} />}
                  </div>
                ))}

                {/* + Add versement */}
                <button
                  onClick={() => setVersements(prev => [...prev, { montant: String(Math.max(0, resteApres)), mode: 'especes' }])}
                  style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '2px dashed rgba(16,185,129,0.35)', background: 'transparent', color: '#10b981', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  + {fr ? 'Ajouter un versement' : 'إضافة دفعة'}
                </button>
              </div>

              {/* ─ Running balance */}
              <div style={{ background: 'var(--bg-elevated)', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '5px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{fr ? 'Total versé' : 'مجموع المدفوع'}</span>
                  <span style={{ fontWeight: 700, color: '#10b981' }}>{(dejaPaye + totalVersements).toLocaleString('fr-DZ')} DA</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '5px' }}>
                  <span style={{ fontWeight: 700 }}>{fr ? 'Reste après' : 'المتبقي بعد'}</span>
                  <span style={{ fontWeight: 900, fontSize: '18px', color: resteApres > 0 ? '#ef4444' : '#10b981' }}>
                    {resteApres > 0 ? `${resteApres.toLocaleString('fr-DZ')} DA` : '✅ Soldé'}
                  </span>
                </div>
              </div>

              {/* ─ Quick fill */}
              {resteApres > 0 && versements.length === 1 && (
                <button className="btn btn-secondary btn-sm" style={{ width: '100%', marginBottom: '14px' }}
                  onClick={() => setVersements([{ montant: String(Math.max(0, total - dejaPaye)), mode: versements[0].mode }])}>
                  {fr ? '⇨ Montant exact' : '⇨ المبلغ كاملاً'} ({(total - dejaPaye).toLocaleString('fr-DZ')} DA)
                </button>
              )}

              {/* Removed old bottom actions */}

            </div>
          </div>
        );
      })()}
      {/* ── Retour Modal ── */}
      {retourModal && (() => {
        const lignes = retourModal.lignes || [];
        const totalRetourne = lignes.reduce((sum: number, l: any) => {
          const q = Number(retourQty[l.produit] || 0);
          return sum + q * Number(l.prix_unitaire || 0);
        }, 0);
        const nouveauTotal = Math.max(0, Number(retourModal.montant_total) - totalRetourne);
        return (
          <div className="modal-overlay" onClick={() => setRetourModal(null)}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 460, maxHeight: '90vh', overflowY: 'auto', paddingBottom: '60px' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <RotateCcw size={20} color="#d97706" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '15px' }}>{fr ? 'Retour produits' : 'إرجاع منتجات'}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{retourModal.reference} · {retourModal.client_nom}</div>
                  </div>
                </div>
                <button onClick={() => setRetourModal(null)} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={16} /></button>
              </div>

              {/* Actions Moved to Top */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                <button className="btn btn-secondary" style={{ flex: 1, padding: '10px' }} onClick={() => setRetourModal(null)}>{fr ? 'Annuler' : 'إلغاء'}</button>
                <button
                  disabled={doingRetour || totalRetourne === 0}
                  onClick={doRetour}
                  style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', borderRadius: '10px', border: 'none', background: totalRetourne > 0 ? '#d97706' : '#aaa', color: '#fff', fontWeight: 700, fontSize: '14px', cursor: totalRetourne === 0 || doingRetour ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}
                >
                  {doingRetour ? <div className="spinner" style={{ width: 16, height: 16 }} /> : <RotateCcw size={16} />}
                  {fr ? `Confirmer retour` : 'تأكيد الإرجاع'}
                </button>
              </div>

              {/* Per-product qty inputs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {lignes.map((l: any) => (
                  <div key={l.produit} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '10px', alignItems: 'center', background: 'var(--bg-elevated)', borderRadius: '8px', padding: '10px 12px' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13px' }}>{l.produit_nom}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{fr ? 'Commandé :' : 'الكمية :'} <strong>{l.quantite} ctn</strong> · {Number(l.prix_unitaire).toLocaleString('fr-DZ')} DA/u</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>{fr ? 'Retour' : 'إرجاع'}</span>
                      <input
                        type="number" min="0" max={l.quantite}
                        value={retourQty[l.produit] || '0'}
                        onChange={e => setRetourQty(prev => ({ ...prev, [l.produit]: e.target.value }))}
                        style={{ width: 70, textAlign: 'center', fontSize: '15px', fontWeight: 700, borderRadius: '8px', border: '2px solid rgba(245,158,11,0.4)', background: 'var(--bg-base)', color: Number(retourQty[l.produit] || 0) > 0 ? '#d97706' : 'var(--text-primary)', padding: '6px', fontFamily: 'inherit' }}
                      />
                    </div>
                    <div style={{ textAlign: 'right', minWidth: 80 }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{fr ? 'Déduit' : 'مخصوم'}</div>
                      <div style={{ fontWeight: 700, color: Number(retourQty[l.produit] || 0) > 0 ? '#ef4444' : 'var(--text-muted)', fontSize: '13px' }}>
                        - {(Number(retourQty[l.produit] || 0) * Number(l.prix_unitaire)).toLocaleString('fr-DZ')} DA
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary: old total → new total */}
              {totalRetourne > 0 && (
                <div style={{ background: 'rgba(245,158,11,0.06)', border: '2px solid rgba(245,158,11,0.25)', borderRadius: '10px', padding: '12px 14px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{fr ? 'Total original' : 'الإجمالي الأصلي'}</span>
                    <span style={{ fontWeight: 600, textDecoration: 'line-through', color: 'var(--text-muted)' }}>{Number(retourModal.montant_total).toLocaleString('fr-DZ')} DA</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
                    <span style={{ color: '#d97706', fontWeight: 600 }}>{fr ? 'Valeur retournée' : 'قيمة الإرجاع'}</span>
                    <span style={{ fontWeight: 700, color: '#d97706' }}>- {totalRetourne.toLocaleString('fr-DZ')} DA</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', borderTop: '1px solid rgba(245,158,11,0.2)', paddingTop: '8px' }}>
                    <span style={{ fontWeight: 700 }}>✅ {fr ? 'Nouveau total' : 'الإجمالي الجديد'}</span>
                    <span style={{ fontWeight: 900, color: 'var(--brand-primary)', fontSize: '18px' }}>{nouveauTotal.toLocaleString('fr-DZ')} DA</span>
                  </div>
                </div>
              )}

              {/* Removed old bottom actions */}
            </div>
          </div>
        );
      })()}
    </AppLayout>
  );
}
