import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { useLang } from '@/contexts/LangContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Users, Calendar, DollarSign, Pencil, Trash2, Search } from 'lucide-react';
import type { Employe } from '@/lib/types';

const POSTES = [
  { val: 'admin', fr: 'Administrateur', ar: 'مسؤول' },
  { val: 'prevendeur_gros', fr: 'Prévendeur Gros', ar: 'بائع جملة' },
  { val: 'prevendeur_detail', fr: 'Prévendeur Détail', ar: 'بائع تجزئة' },
  { val: 'livreur_gros', fr: 'Livreur Gros', ar: 'موزع جملة' },
  { val: 'livreur_detail', fr: 'Livreur Détail', ar: 'موزع تجزئة' },
  { val: 'magasinier', fr: 'Magasinier', ar: 'أمين مخزن' },
  { val: 'comptable', fr: 'Comptable', ar: 'محاسب' },
  { val: 'autre', fr: 'Autre', ar: 'آخر' }
];

export default function RHPage() {
  const { lang } = useLang();
  const [employes, setEmployes] = useState<Employe[]>([]);
  const [tab, setTab] = useState<'employes' | 'presences' | 'paies'>('employes');
  const [modal, setModal] = useState(false);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Employe | null>(null);
  const [form, setForm] = useState({ nom: '', prenom: '', poste: 'prevendeur_gros', phone: '', salaire_base: '', date_embauche: '', actif: true });

  const load = () => api.get('/hr/employes/').then(r => setEmployes(r.data.results || r.data));
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      const data = { ...form, salaire_base: Number(form.salaire_base) };
      if (editing) await api.patch(`/hr/employes/${editing.id}/`, data);
      else await api.post('/hr/employes/', data);
      toast.success(lang === 'fr' ? 'Enregistré!' : 'تم الحفظ!');
      setModal(false);
      load();
    } catch (e: any) { toast.error(JSON.stringify(e?.response?.data || 'Erreur')); }
  };

  const remove = async (id: number) => {
    if (!confirm(lang === 'fr' ? 'Supprimer cet employé ?' : 'حذف هذا الموظف؟')) return;
    try {
      await api.delete(`/hr/employes/${id}/`);
      toast.success(lang === 'fr' ? 'Supprimé!' : 'تم الحذف!');
      load();
    } catch { }
  };

  return (
    <AppLayout allowedRoles={['admin']}>
      <div className="page-header">
        <div>
          <h1>{lang === 'fr' ? 'Ressources Humaines' : 'الموارد البشرية'}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{employes.length} {lang === 'fr' ? 'employés' : 'موظف'}</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setForm({ nom: '', prenom: '', poste: 'prevendeur_gros', phone: '', salaire_base: '', date_embauche: '', actif: true }); setModal(true); }}>
          <Plus size={15} /> {lang === 'fr' ? 'Ajouter employé' : 'إضافة موظف'}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: 'var(--bg-elevated)', padding: '4px', borderRadius: '10px', width: 'fit-content' }}>
        {[
          { key: 'employes', fr: 'Employés', ar: 'الموظفون' },
          { key: 'presences', fr: 'Présences', ar: 'الحضور' },
          { key: 'paies', fr: 'Paie', ar: 'الرواتب' },
        ].map(t => (
          <button key={t.key} className={`btn ${tab === t.key ? 'btn-primary' : 'btn-secondary'}`} style={{ border: 'none' }} onClick={() => setTab(t.key as any)}>
            {lang === 'fr' ? t.fr : t.ar}
          </button>
        ))}
      </div>

      {tab === 'employes' && (
        <div className="search-bar" style={{ marginBottom: '16px' }}>
          <div className="search-input-wrap" style={{ maxWidth: 360 }}>
            <Search />
            <input className="form-control" placeholder={lang === 'fr' ? 'Rechercher employé...' : 'بحث عن موظف...'} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      )}

      {tab === 'employes' && (
        <div className="grid-3">
          {employes.filter(e => !search || e.nom.toLowerCase().includes(search.toLowerCase()) || e.prenom.toLowerCase().includes(search.toLowerCase())).map(e => (
            <div key={e.id} className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, color: 'white', fontSize: '16px'
                }}>
                  {e.prenom[0]}{e.nom[0]}
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{e.prenom} {e.nom}</div>
                  <span className={`badge ${e.poste.includes('admin') ? 'badge-purple' : e.poste.includes('prevendeur') ? 'badge-info' : e.poste.includes('livreur') ? 'badge-warning' : 'badge-gray'}`}>
                    {POSTES.find(p => p.val === e.poste)?.[lang as 'fr' | 'ar'] || e.poste}
                  </span>
                </div>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {e.phone && <div><Users size={11} style={{ marginRight: 4 }} />{e.phone}</div>}
                <div><Calendar size={11} style={{ marginRight: 4 }} />{lang === 'fr' ? 'Depuis:' : 'منذ:'} {e.date_embauche}</div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)', marginTop: '6px' }}>
                  <DollarSign size={12} /> {e.salaire_base?.toLocaleString()} DA
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => {
                  setEditing(e);
                  setForm({ nom: e.nom, prenom: e.prenom, poste: e.poste, phone: e.phone || '', salaire_base: String(e.salaire_base), date_embauche: e.date_embauche, actif: e.actif });
                  setModal(true);
                }}>
                  <Pencil size={12} /> {lang === 'fr' ? 'Modifier' : 'تعديل'}
                </button>
                <button className="btn btn-danger btn-icon" onClick={() => remove(e.id)}>
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab !== 'employes' && (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          {lang === 'fr' ? 'Module en cours de développement' : 'الوحدة قيد التطوير'}
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">{editing ? (lang === 'fr' ? 'Modifier employé' : 'تعديل الموظف') : (lang === 'fr' ? 'Nouvel employé' : 'موظف جديد')}</div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">{lang === 'fr' ? 'Prénom' : 'الاسم الأول'}</label>
                <input className="form-control" value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">{lang === 'fr' ? 'Nom' : 'اللقب'}</label>
                <input className="form-control" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">{lang === 'fr' ? 'Poste' : 'المنصب'}</label>
                <select className="form-control" value={form.poste} onChange={e => setForm(f => ({ ...f, poste: e.target.value }))}>
                  {POSTES.map(p => <option key={p.val} value={p.val}>{p[lang as 'fr' | 'ar']}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">{lang === 'fr' ? 'Téléphone' : 'الهاتف'}</label>
                <input className="form-control" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">{lang === 'fr' ? 'Salaire (DA)' : 'الراتب (DA)'}</label>
                <input className="form-control" type="number" value={form.salaire_base} onChange={e => setForm(f => ({ ...f, salaire_base: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">{lang === 'fr' ? "Date d'embauche" : 'تاريخ التوظيف'}</label>
                <input className="form-control" type="date" value={form.date_embauche} onChange={e => setForm(f => ({ ...f, date_embauche: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setModal(false)}>{lang === 'fr' ? 'Annuler' : 'إلغاء'}</button>
              <button className="btn btn-primary" onClick={save}>{lang === 'fr' ? 'Enregistrer' : 'حفظ'}</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
