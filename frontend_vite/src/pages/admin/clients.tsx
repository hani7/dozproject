import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { useLang } from '@/contexts/LangContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Search, MapPin, X } from 'lucide-react';
import type { Client } from '@/lib/types';
import Pagination, { usePagination } from '@/components/Pagination';

const EMPTY = {
  nom: '', type_client: 'detail' as 'detail' | 'gros',
  phone: '', adresse: '', email: '',
  rc: '', nif: '', n_article: '', nis: '', notes: '',
};

export default function ClientsPage() {
  const { lang } = useLang();
  const fr = lang === 'fr';
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState(EMPTY);
  const { page, pageSize, paginated: pagedClients, total, setPage, setPageSize } = usePagination(clients, 25);

  const load = async () => {
    try {
      let all: any[] = [];
      let nextUrl: string | null = `/clients/?page_size=500${search ? `&search=${search}` : ''}${typeFilter ? `&type_client=${typeFilter}` : ''}`;
      while (nextUrl) {
        const r = await api.get(nextUrl);
        const data = r.data.results || r.data;
        all = [...all, ...data];
        if (r.data.next) nextUrl = r.data.next;
        else nextUrl = null;
      }
      setClients(all);
    } catch (e) {
      console.error(e);
    }
  };
  useEffect(() => { load(); }, [search, typeFilter]);

  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setModal(false); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (c: Client) => {
    setEditing(c);
    setForm({
      nom: c.nom, type_client: c.type_client,
      phone: c.phone || '', adresse: c.adresse || '',
      email: c.email || '',
      rc: (c as any).rc || '', nif: (c as any).nif || '',
      n_article: (c as any).n_article || '', nis: (c as any).nis || '',
      notes: c.notes || '',
    });
    setModal(true);
  };

  const save = async () => {
    try {
      if (editing) await api.patch(`/clients/${editing.id}/`, form);
      else await api.post('/clients/', form);
      toast.success(fr ? 'Enregistré!' : 'تم الحفظ!');
      setModal(false);
      load();
    } catch (e: any) {
      const errData = e?.response?.data;
      if (errData && typeof errData === 'object') {
        const msgs = Object.entries(errData).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' | ');
        toast.error(msgs);
      } else {
        toast.error(fr ? 'Erreur' : 'خطأ');
      }
    }
  };

  const del = async (id: number) => {
    if (!confirm(fr ? 'Supprimer ce client?' : 'حذف هذا العميل؟')) return;
    await api.delete(`/clients/${id}/`);
    load();
  };

  const fv = (key: string) => (form as any)[key] || '';
  const sv = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }));

  return (
    <AppLayout allowedRoles={['admin']}>
      <div className="page-header">
        <div>
          <h1>{fr ? 'Clients' : 'العملاء'}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{clients.length} {fr ? 'clients' : 'عميل'}</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}><Plus size={15} /> {fr ? 'Ajouter' : 'إضافة'}</button>
      </div>

      <div className="search-bar">
        <div className="search-input-wrap" style={{ flex: 1, maxWidth: 360 }}>
          <Search />
          <input className="form-control" placeholder={fr ? 'Rechercher client...' : 'بحث عن عميل...'} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-control" style={{ maxWidth: 180 }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">{fr ? 'Tous les types' : 'كل الأنواع'}</option>
          <option value="detail">{fr ? 'Détaillants' : 'تجزئة'}</option>
          <option value="gros">{fr ? 'Grossistes' : 'جملة'}</option>
        </select>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>{fr ? 'Client' : 'العميل'}</th>
              <th>{fr ? 'Type' : 'النوع'}</th>
              <th>RC / NIF</th>
              <th>{fr ? 'Téléphone' : 'الهاتف'}</th>
              <th>{fr ? 'Solde' : 'الرصيد'}</th>
              <th>{fr ? 'Actions' : 'الإجراءات'}</th>
            </tr>
          </thead>
          <tbody>
            {pagedClients.map(c => (
              <tr key={c.id}>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.nom}</div>
                  {c.adresse && <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}><MapPin size={10} />{c.adresse.substring(0, 40)}</div>}
                </td>
                <td><span className={`badge ${c.type_client === 'gros' ? 'badge-purple' : 'badge-info'}`}>{c.type_client === 'gros' ? (fr ? 'Grossiste' : 'جملة') : (fr ? 'Détaillant' : 'تجزئة')}</span></td>
                <td style={{ fontSize: '12px' }}>
                  {(c as any).rc && <div><span style={{ color: 'var(--text-muted)' }}>RC:</span> {(c as any).rc}</div>}
                  {(c as any).nif && <div><span style={{ color: 'var(--text-muted)' }}>NIF:</span> {(c as any).nif}</div>}
                  {(c as any).n_article && <div><span style={{ color: 'var(--text-muted)' }}>Art:</span> {(c as any).n_article}</div>}
                  {!(c as any).rc && !(c as any).nif && '-'}
                </td>
                <td style={{ fontSize: '13px' }}>{c.phone || '-'}</td>
                <td style={{ fontWeight: 600, color: c.solde < 0 ? '#ef4444' : c.solde > 0 ? '#10b981' : 'var(--text-muted)' }}>
                  {c.solde?.toLocaleString()} DA
                </td>
                <td>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button className="btn btn-secondary btn-icon" onClick={() => openEdit(c)}><Pencil size={12} /></button>
                    <button className="btn btn-danger btn-icon" onClick={() => del(c.id)}><Trash2 size={12} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </div>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div className="modal-title" style={{ margin: 0 }}>
                {editing ? (fr ? 'Modifier client' : 'تعديل العميل') : (fr ? 'Nouveau client' : 'عميل جديد')}
              </div>
              <button
                onClick={() => setModal(false)}
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#ef444420'; e.currentTarget.style.color = '#ef4444'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
              >
                <X size={16} />
              </button>
            </div>

            {/* General info */}
            <div className="grid-2" style={{ marginBottom: '16px' }}>
              <div className="form-group">
                <label className="form-label">{fr ? 'Nom du client' : 'اسم العميل'} *</label>
                <input className="form-control" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">{fr ? 'Type de client' : 'نوع العميل'}</label>
                <select className="form-control" value={form.type_client} onChange={e => setForm(f => ({ ...f, type_client: e.target.value as any }))}>
                  <option value="detail">{fr ? 'Détaillant (vente carton)' : 'تجزئة (بالكرتون)'}</option>
                  <option value="gros">{fr ? 'Grossiste (vente carton)' : 'جملة (بالكرتون)'}</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{fr ? 'Téléphone' : 'الهاتف'}</label>
                <input className="form-control" type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-control" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
            </div>

            {/* Legal / Fiscal identifiers */}
            <div style={{ background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#06b6d4', marginBottom: '12px' }}>
                🏛 {fr ? 'Identifiants fiscaux / légaux' : 'المعرفات القانونية والجبائية'}
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">RC — {fr ? 'Registre de Commerce' : 'السجل التجاري'}</label>
                  <input className="form-control" placeholder="ex: 12-345678-B-00" value={fv('rc')} onChange={e => sv('rc', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">NIF — {fr ? "Numéro d'Identification Fiscale" : 'رقم التعريف الجبائي'}</label>
                  <input className="form-control" placeholder="ex: 000123456789000" value={fv('nif')} onChange={e => sv('nif', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">{fr ? 'N° Article (AI)' : 'رقم المقالة'}</label>
                  <input className="form-control" placeholder="ex: 12345678" value={fv('n_article')} onChange={e => sv('n_article', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">NIS — {fr ? "N° d'Identification Statistique" : 'رقم التعريف الإحصائي'}</label>
                  <input className="form-control" placeholder="ex: 123456789012345" value={fv('nis')} onChange={e => sv('nis', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">{fr ? 'Adresse complète' : 'العنوان الكامل'}</label>
              <textarea className="form-control" rows={2} value={form.adresse} onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))} placeholder={fr ? 'Rue, cité, zone commerciale...' : 'الشارع، الحي، المنطقة التجارية...'} />
            </div>

            {/* Notes */}
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">{fr ? 'Notes' : 'ملاحظات'}</label>
              <textarea className="form-control" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setModal(false)}>{fr ? 'Annuler' : 'إلغاء'}</button>
              <button className="btn btn-primary" onClick={save}>{fr ? 'Enregistrer' : 'حفظ'}</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
