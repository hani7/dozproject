import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { useLang } from '@/contexts/LangContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react';
import type { Fournisseur } from '@/lib/types';

const EMPTY = {
  nom: '', phone: '', email: '', adresse: '',
  contact_nom: '', rc: '', nif: '', n_article: '', nis: '', notes: '',
};

export default function FournisseursPage() {
  const { lang } = useLang();
  const fr = lang === 'fr';
  const [items, setItems] = useState<Fournisseur[]>([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Fournisseur | null>(null);
  const [form, setForm] = useState(EMPTY);

  const load = () => api.get('/fournisseurs/', { params: { search: search || undefined } }).then(r => setItems(r.data.results || r.data));
  useEffect(() => { load(); }, [search]);

  // Close on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setModal(false); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const openEdit = (f: Fournisseur) => {
    setEditing(f);
    setForm({
      nom: f.nom || '', phone: f.phone || '', email: f.email || '',
      adresse: f.adresse || '',
      contact_nom: f.contact_nom || '',
      rc: (f as any).rc || '', nif: (f as any).nif || '',
      n_article: (f as any).n_article || '', nis: (f as any).nis || '',
      notes: f.notes || '',
    });
    setModal(true);
  };

  const save = async () => {
    try {
      if (editing) await api.patch(`/fournisseurs/${editing.id}/`, form);
      else await api.post('/fournisseurs/', form);
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

  const f = (key: string) => (form as any)[key] || '';
  const set = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }));

  return (
    <AppLayout allowedRoles={['admin']}>
      <div className="page-header">
        <div>
          <h1>{fr ? 'Fournisseurs' : 'الموردون'}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{items.length} {fr ? 'fournisseurs' : 'مورد'}</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setForm(EMPTY); setModal(true); }}>
          <Plus size={15} /> {fr ? 'Ajouter' : 'إضافة'}
        </button>
      </div>

      <div className="search-bar">
        <div className="search-input-wrap" style={{ maxWidth: 360 }}>
          <Search />
          <input className="form-control" placeholder={fr ? 'Rechercher fournisseur...' : 'بحث عن مورد...'} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>{fr ? 'Fournisseur' : 'المورد'}</th>
              <th>RC / NIF</th>
              <th>{fr ? 'Contact' : 'جهة الاتصال'}</th>
              <th>{fr ? 'Téléphone' : 'الهاتف'}</th>
              <th>{fr ? 'Solde' : 'الرصيد'}</th>
              <th>{fr ? 'Actions' : 'الإجراءات'}</th>
            </tr>
          </thead>
          <tbody>
            {items.map(f => (
              <tr key={f.id}>
                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {f.nom}
                  {f.adresse && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{f.adresse}</div>}
                </td>
                <td style={{ fontSize: '12px' }}>
                  {(f as any).rc && <div><span style={{ color: 'var(--text-muted)' }}>RC:</span> {(f as any).rc}</div>}
                  {(f as any).nif && <div><span style={{ color: 'var(--text-muted)' }}>NIF:</span> {(f as any).nif}</div>}
                  {(f as any).n_article && <div><span style={{ color: 'var(--text-muted)' }}>Art:</span> {(f as any).n_article}</div>}
                  {!(f as any).rc && !(f as any).nif && '-'}
                </td>
                <td style={{ fontSize: '13px' }}>{f.phone || '-'}</td>
                <td style={{ fontWeight: 600, color: f.solde < 0 ? '#ef4444' : 'var(--text-muted)' }}>{f.solde?.toLocaleString()} DA</td>
                <td>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button className="btn btn-secondary btn-icon" onClick={() => openEdit(f)}><Pencil size={12} /></button>
                    <button className="btn btn-danger btn-icon" onClick={async () => { await api.delete(`/fournisseurs/${f.id}/`); load(); }}><Trash2 size={12} /></button>
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

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div className="modal-title" style={{ margin: 0 }}>
                {editing ? (fr ? 'Modifier fournisseur' : 'تعديل المورد') : (fr ? 'Nouveau fournisseur' : 'مورد جديد')}
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
                <label className="form-label">{fr ? 'Nom du fournisseur' : 'اسم المورد'} *</label>
                <input className="form-control" value={f('nom')} onChange={e => set('nom', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">{fr ? 'Contact (Responsable)' : 'المسؤول'}</label>
                <input className="form-control" value={f('contact_nom')} onChange={e => set('contact_nom', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">{fr ? 'Téléphone' : 'الهاتف'}</label>
                <input className="form-control" type="tel" value={f('phone')} onChange={e => set('phone', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-control" type="email" value={f('email')} onChange={e => set('email', e.target.value)} />
              </div>
            </div>

            {/* Legal / Fiscal identifiers */}
            <div style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
              <div style={{ fontWeight: 700, fontSize: '13px', color: '#6366f1', marginBottom: '12px' }}>
                🏛 {fr ? 'Identifiants fiscaux / légaux' : 'المعرفات القانونية والجبائية'}
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">RC — {fr ? 'Registre de Commerce' : 'السجل التجاري'}</label>
                  <input className="form-control" placeholder="ex: 12-345678-B-00" value={f('rc')} onChange={e => set('rc', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">NIF — {fr ? 'Numéro d\'Identification Fiscale' : 'رقم التعريف الجبائي'}</label>
                  <input className="form-control" placeholder="ex: 000123456789000" value={f('nif')} onChange={e => set('nif', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">{fr ? 'N° Article (AI)' : 'رقم المقالة'}</label>
                  <input className="form-control" placeholder="ex: 12345678" value={f('n_article')} onChange={e => set('n_article', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">NIS — {fr ? "N° d'Identification Statistique" : 'رقم التعريف الإحصائي'}</label>
                  <input className="form-control" placeholder="ex: 123456789012345" value={f('nis')} onChange={e => set('nis', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label className="form-label">{fr ? 'Adresse complète' : 'العنوان الكامل'}</label>
              <textarea className="form-control" rows={2} value={f('adresse')} onChange={e => set('adresse', e.target.value)} placeholder={fr ? 'Rue, cité, zone industrielle...' : 'الشارع، الحي، المنطقة الصناعية...'} />
            </div>

            {/* Notes */}
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label className="form-label">{fr ? 'Notes' : 'ملاحظات'}</label>
              <textarea className="form-control" rows={2} value={f('notes')} onChange={e => set('notes', e.target.value)} />
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
