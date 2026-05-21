import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { useLang } from '@/contexts/LangContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { MapPin, Plus, ChevronDown, ChevronUp } from 'lucide-react';

const today = new Date().toISOString().split('T')[0];

type Reason = 'prix_eleve' | 'stock_disponible' | 'autres';

interface Visit {
  clientId: string;
  clientNom: string;
  reason: Reason | null;
  note: string;
  saved: boolean;
}

const REASONS: { key: Reason; emoji: string; fr: string; ar: string; color: string }[] = [
  { key: 'prix_eleve',      emoji: '💸', fr: 'Prix élevé',       ar: 'السعر مرتفع',       color: '#ef4444' },
  { key: 'stock_disponible',emoji: '📦', fr: 'Stock disponible', ar: 'المخزون متوفر',     color: '#f59e0b' },
  { key: 'autres',          emoji: '📝', fr: 'Autres',           ar: 'أسباب أخرى',        color: '#6366f1' },
];

export default function TourneePage() {
  const { lang } = useLang();
  const fr = lang === 'fr';

  const [clients, setClients]     = useState<any[]>([]);
  const [visits, setVisits]       = useState<Visit[]>([]);
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        let all: any[] = [];
        let url: string | null = '/clients/?page_size=500';
        while (url) {
          const r = await api.get(url);
          const data = r.data.results || r.data;
          all = [...all, ...data];
          if (r.data.next) url = r.data.next;
          else url = null;
        }
        setClients(all);
      } catch (e) {
        console.error(e);
      }
    };
    fetchAll();
  }, []);

  const visitedIds = new Set(visits.map(v => v.clientId));

  const addVisit = (client: any) => {
    if (visitedIds.has(String(client.id))) return;
    const v: Visit = { clientId: String(client.id), clientNom: client.nom, reason: null, note: '', saved: false };
    setVisits(prev => [...prev, v]);
    setExpanded(String(client.id));
  };

  const setReason = (clientId: string, reason: Reason) => {
    setVisits(prev => prev.map(v => v.clientId === clientId ? { ...v, reason } : v));
  };

  const setNote = (clientId: string, note: string) => {
    setVisits(prev => prev.map(v => v.clientId === clientId ? { ...v, note } : v));
  };

  const saveVisit = async (v: Visit) => {
    if (!v.reason) { toast.error(fr ? 'Sélectionnez une raison' : 'اختر سبباً'); return; }
    setLoading(true);
    try {
      // Store as a client note/visit — we use the clients notes endpoint or a simple paiement note
      // For now we save it as a POST to /clients/{id}/ updating notes field
      const client = clients.find(c => String(c.id) === v.clientId);
      const reasonLabel = REASONS.find(r => r.key === v.reason)?.[fr ? 'fr' : 'ar'] || v.reason;
      const noteText = `[Tournée ${today}] Raison: ${reasonLabel}${v.note ? ' — ' + v.note : ''}`;
      await api.patch(`/clients/${v.clientId}/`, {
        notes: client?.notes ? client.notes + '\n' + noteText : noteText,
      });
      setVisits(prev => prev.map(vis => vis.clientId === v.clientId ? { ...vis, saved: true } : vis));
      toast.success(`✅ ${v.clientNom} — ${fr ? 'enregistré' : 'تم الحفظ'}`);
    } catch {
      toast.error(fr ? 'Erreur lors de l\'enregistrement' : 'خطأ في الحفظ');
    } finally {
      setLoading(false);
    }
  };

  const removeVisit = (clientId: string) => {
    setVisits(prev => prev.filter(v => v.clientId !== clientId));
    if (expanded === clientId) setExpanded(null);
  };

  const savedCount = visits.filter(v => v.saved).length;

  return (
    <AppLayout allowedRoles={['admin', 'prevendeur']}>
      <div className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={20} color="var(--brand-primary)" />
            {fr ? 'Tournée — Clients non acheteurs' : 'جولة — عملاء لم يشتروا'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
            {visits.length} {fr ? 'visites enregistrées' : 'زيارة مسجلة'} · {savedCount} {fr ? 'sauvegardées' : 'محفوظة'}
          </p>
        </div>
      </div>

      {/* Client search to add visit */}
      <div style={{ background: 'var(--bg-elevated)', borderRadius: '14px', padding: '16px 20px', marginBottom: '24px', border: '1px solid var(--border)' }}>
        <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '12px', color: 'var(--text-muted)' }}>
          <Plus size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          {fr ? 'Ajouter un client visité' : 'إضافة عميل تمت زيارته'}
        </div>
        <select
          className="form-control"
          onChange={(e) => {
            const client = clients.find(c => String(c.id) === e.target.value);
            if (client) addVisit(client);
            // Reset the select back to default after adding
            e.target.value = "";
          }}
          defaultValue=""
          style={{ width: '100%', fontSize: '14px', fontWeight: 600 }}
        >
          <option value="" disabled>{fr ? '-- Sélectionner un client --' : '-- اختر عميلاً --'}</option>
          {clients.map(c => (
            <option key={c.id} value={c.id} disabled={visitedIds.has(String(c.id))}>
              {c.nom} {visitedIds.has(String(c.id)) ? (fr ? '(Déjà ajouté)' : '(تمت إضافته)') : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Visit cards */}
      {visits.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <MapPin size={40} style={{ opacity: 0.2, marginBottom: 12 }} />
          <p>{fr ? 'Aucune visite enregistrée.' : 'لا توجد زيارات مسجلة.'}</p>
          <p style={{ fontSize: '12px' }}>{fr ? 'Recherchez un client ci-dessus pour commencer.' : 'ابحث عن عميل أعلاه للبدء.'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {visits.map(v => {
            const isOpen = expanded === v.clientId;
            const chosenReason = REASONS.find(r => r.key === v.reason);
            return (
              <div key={v.clientId} style={{
                background: 'var(--bg-elevated)', borderRadius: '14px',
                border: `1px solid ${v.saved ? '#10b98140' : 'var(--border)'}`,
                overflow: 'hidden', transition: 'border-color 0.2s',
              }}>
                {/* Header */}
                <div
                  onClick={() => setExpanded(isOpen ? null : v.clientId)}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', cursor: 'pointer' }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: '10px', background: v.saved ? 'rgba(16,185,129,0.12)' : 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '14px', color: v.saved ? '#10b981' : '#6366f1', flexShrink: 0 }}>
                    {v.clientNom[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>{v.clientNom}</div>
                    {chosenReason && (
                      <div style={{ fontSize: '12px', color: chosenReason.color, fontWeight: 600, marginTop: '2px' }}>
                        {chosenReason.emoji} {chosenReason[fr ? 'fr' : 'ar']}
                      </div>
                    )}
                    {!chosenReason && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{fr ? 'Raison non sélectionnée' : 'لم تُختر السبب'}</div>}
                  </div>
                  {v.saved && <span style={{ fontSize: '11px', background: 'rgba(16,185,129,0.12)', color: '#10b981', borderRadius: '20px', padding: '2px 10px', fontWeight: 700 }}>✓ {fr ? 'Sauvegardé' : 'محفوظ'}</span>}
                  {isOpen ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
                </div>

                {/* Expanded content */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '16px' }}>
                    {/* Reason buttons */}
                    <div style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {fr ? 'Pourquoi n\'a-t-il pas acheté ?' : 'لماذا لم يشترِ؟'}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '14px' }}>
                      {REASONS.map(r => (
                        <button
                          key={r.key}
                          onClick={() => setReason(v.clientId, r.key)}
                          style={{
                            padding: '12px 8px', borderRadius: '12px', cursor: 'pointer',
                            border: `2px solid ${v.reason === r.key ? r.color : 'var(--border)'}`,
                            background: v.reason === r.key ? r.color + '15' : 'var(--bg-base)',
                            color: v.reason === r.key ? r.color : 'var(--text-secondary)',
                            fontFamily: 'inherit', fontWeight: 700, fontSize: '12px',
                            transition: 'all 0.15s', textAlign: 'center',
                          }}
                        >
                          <div style={{ fontSize: '20px', marginBottom: '4px' }}>{r.emoji}</div>
                          {r[fr ? 'fr' : 'ar']}
                        </button>
                      ))}
                    </div>

                    {/* Note */}
                    <div style={{ marginBottom: '14px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                        📝 {fr ? 'Note (optionnel)' : 'ملاحظة (اختياري)'}
                      </label>
                      <textarea
                        className="form-control"
                        rows={2}
                        value={v.note}
                        onChange={e => setNote(v.clientId, e.target.value)}
                        placeholder={fr ? 'Ajouter une note...' : 'أضف ملاحظة...'}
                        style={{ resize: 'vertical', fontSize: '13px' }}
                      />
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        className="btn btn-secondary"
                        onClick={() => removeVisit(v.clientId)}
                        style={{ fontSize: '12px' }}
                      >
                        🗑 {fr ? 'Supprimer' : 'حذف'}
                      </button>
                      <button
                        className="btn btn-primary"
                        onClick={() => saveVisit(v)}
                        disabled={loading || v.saved}
                        style={{ fontSize: '12px' }}
                      >
                        {v.saved ? `✓ ${fr ? 'Sauvegardé' : 'محفوظ'}` : `💾 ${fr ? 'Enregistrer' : 'حفظ'}`}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
