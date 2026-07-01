import { useState, useEffect, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Search, Trash2, Edit2, TrendingDown, X } from 'lucide-react';
import Pagination, { usePagination } from '@/components/Pagination';

const TYPE_CHOICES = [
  { value: 'carburant',   label: '⛽ Carburant' },
  { value: 'vidange',     label: '🔧 Vidange' },
  { value: 'reparation',  label: '🛠️ Réparation' },
  { value: 'pneumatique', label: '🛞 Pneumatique (Pneu)' },
  { value: 'lavage',      label: '🚿 Lavage' },
  { value: 'vignette',    label: '📋 Vignette' },
  { value: 'assurance',   label: '🛡️ Assurance' },
  { value: 'amende',      label: '⚠️ Amende' },
  { value: 'peage',       label: '🛣️ Péage' },
  { value: 'location_camion', label: '🚚 Location camion' },
  { value: 'autre',       label: '📦 Autre' },
];

const TYPE_COLORS: Record<string, string> = {
  carburant: '#f59e0b',
  vidange: '#8b5cf6',
  reparation: '#ef4444',
  pneumatique: '#3b82f6',
  lavage: '#06b6d4',
  vignette: '#10b981',
  assurance: '#6366f1',
  amende: '#dc2626',
  salaire_chauffeur: '#14b8a6',
  peage: '#84cc16',
  location_camion: '#d946ef',
  autre: '#6b7280',
};

interface Charge {
  id: number;
  type_charge: string;
  type_charge_label: string;
  montant: number;
  date: string;
  camion: string;
  description: string;
  cree_par_nom: string;
  created_at: string;
}

const EMPTY_FORM = {
  type_charge: 'carburant',
  montant: '',
  date: new Date().toISOString().split('T')[0],
  description: '',
};

export default function ChargesPage() {
  const [charges, setCharges] = useState<Charge[]>([]);
  const [modal, setModal] = useState(false);
  const [editItem, setEditItem] = useState<Charge | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [stats, setStats] = useState<{ total_global: number; par_type: { type_charge: string; total: number }[] } | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const [r, s] = await Promise.all([
      api.get('/charges/'),
      api.get('/charges/stats/'),
    ]);
    setCharges(r.data.results || r.data);
    setStats(s.data);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => charges.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q || c.type_charge_label.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
    const matchType = !filterType || c.type_charge === filterType;
    const matchFrom = !filterFrom || c.date >= filterFrom;
    const matchTo = !filterTo || c.date <= filterTo;
    return matchSearch && matchType && matchFrom && matchTo;
  }), [charges, search, filterType, filterFrom, filterTo]);

  const { page, pageSize, paginated, total, setPage, setPageSize } = usePagination(filtered, 20);

  const totalFiltered = useMemo(() => filtered.reduce((s, c) => s + Number(c.montant), 0), [filtered]);

  const openCreate = () => {
    setEditItem(null);
    setForm({ ...EMPTY_FORM });
    setModal(true);
  };

  const openEdit = (c: Charge) => {
    setEditItem(c);
    setForm({
      type_charge: c.type_charge,
      montant: String(c.montant),
      date: c.date,
      description: c.description || '',
    });
    setModal(true);
  };

  const save = async () => {
    if (!form.montant || !form.date) {
      toast.error('Veuillez remplir le montant et la date');
      return;
    }
    setLoading(true);
    try {
      const payload = { ...form, montant: Number(form.montant) };
      if (editItem) {
        await api.patch(`/charges/${editItem.id}/`, payload);
        toast.success('Charge modifiée !');
      } else {
        await api.post('/charges/', payload);
        toast.success('Charge ajoutée !');
      }
      setModal(false);
      load();
    } catch (e: any) {
      toast.error(JSON.stringify(e?.response?.data || 'Erreur'));
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Supprimer cette charge ?')) return;
    await api.delete(`/charges/${id}/`);
    toast.success('Supprimée');
    load();
  };

  const fmt = (n: number) => Number(n).toLocaleString('fr-DZ', { minimumFractionDigits: 2 }) + ' DA';

  return (
    <AppLayout allowedRoles={['admin']}>
      <div className="page-header">
        <div>
          <h1>🚛 Charges</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Suivi des dépenses et frais</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={15} /> Nouvelle charge
        </button>
      </div>

      {/* ── Stats Cards ── */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginBottom: 20 }}>
          {/* Total global */}
          <div style={{ background: 'linear-gradient(135deg, #7132ca, #4c1d95)', borderRadius: 12, padding: '14px 16px', gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>Total global des charges</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{fmt(stats.total_global)}</div>
            </div>
            <TrendingDown size={36} style={{ color: 'rgba(255,255,255,0.3)' }} />
          </div>
          {/* Par type */}
          {stats.par_type.map(pt => {
            const tc = TYPE_CHOICES.find(t => t.value === pt.type_charge);
            const color = TYPE_COLORS[pt.type_charge] || '#6b7280';
            return (
              <div key={pt.type_charge} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', borderLeft: `3px solid ${color}` }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{tc?.label || pt.type_charge}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color }}>{fmt(pt.total)}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 180px', minWidth: 140 }}>
          <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="form-control" style={{ paddingLeft: 28, fontSize: '13px' }} placeholder="Description..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-control" style={{ fontSize: 13, flex: '0 0 180px' }} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">Tous les types</option>
          {TYPE_CHOICES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <input type="date" className="form-control" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} style={{ fontSize: 12, flex: '0 0 140px' }} title="De" />
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>→</span>
        <input type="date" className="form-control" value={filterTo} onChange={e => setFilterTo(e.target.value)} style={{ fontSize: 12, flex: '0 0 140px' }} title="À" />
        {(search || filterType || filterFrom || filterTo) && (
          <button onClick={() => { setSearch(''); setFilterType(''); setFilterFrom(''); setFilterTo(''); }}
            style={{ fontSize: 11, padding: '6px 10px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-muted)', cursor: 'pointer' }}>
            × Réinit.
          </button>
        )}
        {filtered.length < charges.length && (
          <div style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 700, color: '#ef4444' }}>
            Total filtré : {fmt(totalFiltered)}
          </div>
        )}
      </div>

      {/* ── Table ── */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type de charge</th>
              <th>Description</th>
              <th style={{ textAlign: 'right' }}>Montant</th>
              <th>Ajouté par</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Aucune charge enregistrée</td></tr>
            ) : paginated.map(c => {
              const color = TYPE_COLORS[c.type_charge] || '#6b7280';
              const tc = TYPE_CHOICES.find(t => t.value === c.type_charge);
              return (
                <tr key={c.id}>
                  <td style={{ fontSize: 12, fontWeight: 600 }}>
                    {new Date(c.date).toLocaleDateString('fr-FR')}
                  </td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: color + '22', color, borderRadius: 6, padding: '3px 9px', fontSize: 12, fontWeight: 700 }}>
                      {tc?.label || c.type_charge_label}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 220 }}>
                    {c.description || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 800, fontSize: 14, color: '#ef4444' }}>
                    {fmt(c.montant)}
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.cree_par_nom || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => openEdit(c)} title="Modifier"
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--brand-primary)', padding: 4 }}>
                        <Edit2 size={15} />
                      </button>
                      <button onClick={() => remove(c.id)} title="Supprimer"
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4 }}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </div>

      {/* ── Modal ── */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div className="modal-title" style={{ margin: 0 }}>
                {editItem ? '✏️ Modifier la charge' : '➕ Nouvelle charge'}
              </div>
              <button onClick={() => setModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">Type de charge *</label>
              <select className="form-control" value={form.type_charge} onChange={e => setForm(f => ({ ...f, type_charge: e.target.value }))}>
                {TYPE_CHOICES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Montant (DA) *</label>
                <input className="form-control" type="number" min="0" step="0.01"
                  value={form.montant} onChange={e => setForm(f => ({ ...f, montant: e.target.value }))}
                  placeholder="0.00" />
              </div>
              <div className="form-group">
                <label className="form-label">Date *</label>
                <input className="form-control" type="date"
                  value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
            </div>


            <div className="form-group">
              <label className="form-label">Description / Notes</label>
              <textarea className="form-control" rows={3}
                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Détails supplémentaires..." />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button className="btn btn-secondary" onClick={() => setModal(false)}>Annuler</button>
              <button className="btn btn-primary" onClick={save} disabled={loading}>
                {loading ? 'Enregistrement...' : (editItem ? 'Modifier' : 'Enregistrer')}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
