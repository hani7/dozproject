import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { useLang } from '@/contexts/LangContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, KeyRound, ShoppingBag, ShoppingCart, Truck, Package, Search } from 'lucide-react';

interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: 'admin' | 'prevendeur' | 'livreur';
  specialite: 'detail' | 'gros' | 'les_deux';
  matricule?: string;
  is_active: boolean;
}

const ROLE_OPTIONS = [
  { value: 'admin',      label: 'Administrateur',  labelAr: 'مدير النظام',    icon: '🔑', color: '#6366f1' },
  { value: 'prevendeur', label: 'Prévendeur',       labelAr: 'مندوب مبيعات',  icon: '🛒', color: '#06b6d4' },
  { value: 'livreur',    label: 'Livreur',          labelAr: 'موزع',           icon: '🚚', color: '#f59e0b' },
];

const SPECIALITE_OPTIONS = [
  { value: 'detail',   label: 'Détail (Carton)',  labelAr: 'تجزئة (كرتون)',   icon: '📦', color: '#06b6d4' },
  { value: 'gros',     label: 'Gros (Palette)',   labelAr: 'جملة (مستودع)',   icon: '🏭', color: '#8b5cf6' },
  { value: 'les_deux', label: 'Détail & Gros',    labelAr: 'تجزئة وجملة',    icon: '💼', color: '#10b981' },
];

const EMPTY_FORM = {
  username: '', first_name: '', last_name: '', email: '',
  phone: '', role: 'prevendeur' as User['role'],
  specialite: 'detail' as User['specialite'],
  matricule: '', password: '', is_active: true,
};

export default function ComptesPage() {
  const { lang } = useLang();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api.get('/auth/users/', { params: roleFilter ? { role: roleFilter } : {} })
      .then(r => { setUsers(r.data.results || r.data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [roleFilter]);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM });
    setModal(true);
  };

  const openEdit = (u: User) => {
    setEditing(u);
    setForm({
      username: u.username, first_name: u.first_name, last_name: u.last_name,
      email: u.email || '', phone: u.phone || '',
      role: u.role, specialite: u.specialite, matricule: u.matricule || '', password: '', is_active: u.is_active,
    });
    setModal(true);
  };

  const save = async () => {
    if (!form.username) { toast.error('Username requis'); return; }
    if (!editing && !form.password) { toast.error('Mot de passe requis'); return; }
    setSaving(true);
    try {
      const data: any = {
        username: form.username, first_name: form.first_name, last_name: form.last_name,
        email: form.email, phone: form.phone, role: form.role,
        specialite: form.specialite, matricule: form.matricule, is_active: form.is_active,
      };
      if (form.password) data.password = form.password;

      if (editing) {
        await api.patch(`/auth/users/${editing.id}/`, data);
      } else {
        await api.post('/auth/users/', data);
      }
      toast.success(lang === 'fr' ? 'Compte enregistré ✓' : 'تم حفظ الحساب ✓');
      setModal(false);
      load();
    } catch (e: any) {
      const err = e?.response?.data;
      const msg = typeof err === 'object' ? Object.entries(err).map(([k, v]) => `${k}: ${v}`).join(', ') : String(err);
      toast.error(msg || 'Erreur');
    } finally { setSaving(false); }
  };

  const del = async (u: User) => {
    if (!confirm(lang === 'fr' ? `Supprimer ${u.username}?` : `حذف ${u.username}؟`)) return;
    try {
      await api.delete(`/auth/users/${u.id}/`);
      toast.success(lang === 'fr' ? 'Compte supprimé' : 'تم الحذف');
      load();
    } catch { toast.error('Erreur'); }
  };

  const toggleActive = async (u: User) => {
    try {
      await api.patch(`/auth/users/${u.id}/`, { is_active: !u.is_active });
      toast.success(u.is_active
        ? (lang === 'fr' ? 'Compte désactivé' : 'تم تعطيل الحساب')
        : (lang === 'fr' ? 'Compte activé' : 'تم تفعيل الحساب'));
      load();
    } catch { toast.error('Erreur'); }
  };

  const getRoleOpt = (role: string) => ROLE_OPTIONS.find(r => r.value === role);
  const getSpecOpt = (s: string) => SPECIALITE_OPTIONS.find(o => o.value === s);

  const filteredUsers = users.filter(u => {
    const q = search.toLowerCase();
    return !q || u.username.toLowerCase().includes(q) || u.first_name.toLowerCase().includes(q) || u.last_name.toLowerCase().includes(q);
  });

  const grouped = {
    admin: filteredUsers.filter(u => u.role === 'admin'),
    prevendeur: filteredUsers.filter(u => u.role === 'prevendeur'),
    livreur: filteredUsers.filter(u => u.role === 'livreur'),
  };

  return (
    <AppLayout allowedRoles={['admin']}>
      <div className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <KeyRound size={20} color="#6366f1" />
            {lang === 'fr' ? 'Gestion des Comptes' : 'إدارة الحسابات'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
            {users.length} {lang === 'fr' ? 'utilisateurs' : 'مستخدم'} · {grouped.prevendeur.length} {lang === 'fr' ? 'prévendeurs' : 'مندوب'} · {grouped.livreur.length} {lang === 'fr' ? 'livreurs' : 'موزع'}
          </p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <Plus size={15} /> {lang === 'fr' ? 'Nouveau compte' : 'حساب جديد'}
        </button>
      </div>

      {/* Role filter */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {[
          { value: '', label: lang === 'fr' ? 'Tous' : 'الكل', icon: '👥' },
          ...ROLE_OPTIONS.map(r => ({ value: r.value, label: lang === 'fr' ? r.label : r.labelAr, icon: r.icon })),
        ].map(f => (
          <button
            key={f.value}
            className={`btn ${roleFilter === f.value ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '13px' }}
            onClick={() => setRoleFilter(f.value)}
          >
            {f.icon} {f.label}
          </button>
        ))}
      </div>

      <div className="search-bar" style={{ marginBottom: '24px' }}>
        <div className="search-input-wrap" style={{ maxWidth: 360 }}>
          <Search />
          <input className="form-control" placeholder={lang === 'fr' ? 'Rechercher utilisateur...' : 'بحث عن مستخدم...'} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px' }}><div className="spinner" /></div>
      ) : (
        <>
          {/* Section per role group */}
          {(['admin', 'prevendeur', 'livreur'] as const)
            .filter(r => !roleFilter || roleFilter === r)
            .map(role => {
              const group = grouped[role];
              if (group.length === 0 && roleFilter) return null;
              const roleOpt = getRoleOpt(role)!;
              return (
                <div key={role} style={{ marginBottom: '28px' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    marginBottom: '14px', paddingBottom: '8px',
                    borderBottom: `2px solid ${roleOpt.color}44`,
                  }}>
                    <span style={{ fontSize: '18px' }}>{roleOpt.icon}</span>
                    <h3 style={{ fontSize: '14px', fontWeight: 800, color: roleOpt.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {lang === 'fr' ? roleOpt.label : roleOpt.labelAr}
                    </h3>
                    <span className="badge" style={{ marginLeft: 'auto', background: roleOpt.color + '22', color: roleOpt.color, border: `1px solid ${roleOpt.color}44` }}>
                      {group.length}
                    </span>
                  </div>

                  <div className="grid-3">
                    {group.map(u => {
                      const specOpt = getSpecOpt(u.specialite)!;
                      return (
                        <div
                          key={u.id}
                          className="card"
                          style={{
                            opacity: u.is_active ? 1 : 0.55,
                            border: u.is_active ? '1px solid var(--border)' : '1px solid rgba(239,68,68,0.3)',
                          }}
                        >
                          {/* Avatar + name */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                            <div style={{
                              width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                              background: `linear-gradient(135deg, ${roleOpt.color}, ${specOpt.color})`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontWeight: 900, color: 'white', fontSize: '16px',
                            }}>
                              {(u.first_name?.[0] || u.username[0]).toUpperCase()}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {u.first_name} {u.last_name}
                              </div>
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                @{u.username}
                              </div>
                            </div>
                          </div>

                          {/* Specialite badge */}
                          {u.role !== 'admin' && (
                            <div style={{
                              display: 'flex', alignItems: 'center', gap: '6px',
                              padding: '6px 10px', borderRadius: '8px', marginBottom: '10px',
                              background: specOpt.color + '15',
                              border: `1px solid ${specOpt.color}30`,
                            }}>
                              <span style={{ fontSize: '14px' }}>{specOpt.icon}</span>
                              <span style={{ fontSize: '12px', fontWeight: 700, color: specOpt.color }}>
                                {lang === 'fr' ? specOpt.label : specOpt.labelAr}
                              </span>
                              {u.role === 'livreur' && (
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                                  {u.specialite === 'detail'
                                    ? (lang === 'fr' ? '📦 Livraison carton' : '📦 توصيل كرتون')
                                    : u.specialite === 'gros'
                                      ? (lang === 'fr' ? '🏭 Livraison palette' : '🏭 توصيل مستودع')
                                      : (lang === 'fr' ? '🚚 Tous types' : '🚚 جميع الأنواع')}
                                </span>
                              )}
                              {u.role === 'prevendeur' && (
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                                  {u.specialite === 'detail'
                                    ? (lang === 'fr' ? '🛒 Commandes détail' : '🛒 طلبات تجزئة')
                                    : u.specialite === 'gros'
                                      ? (lang === 'fr' ? '🏪 Commandes gros' : '🏪 طلبات جملة')
                                      : (lang === 'fr' ? '💼 Tous types' : '💼 جميع الأنواع')}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Info */}
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '3px', marginBottom: '12px' }}>
                            {u.phone && <span>📞 {u.phone}</span>}
                            {u.email && <span>✉️ {u.email}</span>}
                            {u.matricule && <span>🆔 {u.matricule}</span>}
                          </div>

                          {/* Status */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                            <span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '11px' }}>
                              {u.is_active ? (lang === 'fr' ? 'Actif' : 'نشط') : (lang === 'fr' ? 'Inactif' : 'غير نشط')}
                            </span>
                          </div>

                          {/* Actions */}
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ flex: 1 }}
                              onClick={() => openEdit(u)}
                            >
                              <Pencil size={12} /> {lang === 'fr' ? 'Modifier' : 'تعديل'}
                            </button>
                            <button
                              className={`btn btn-sm ${u.is_active ? 'btn-warning' : 'btn-success'}`}
                              onClick={() => toggleActive(u)}
                              title={u.is_active ? (lang === 'fr' ? 'Désactiver' : 'تعطيل') : (lang === 'fr' ? 'Activer' : 'تفعيل')}
                            >
                              {u.is_active ? '🔒' : '🔓'}
                            </button>
                            {u.username !== 'admin' && (
                              <button
                                className="btn btn-danger btn-icon btn-sm"
                                onClick={() => del(u)}
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Empty state for this group */}
                    {group.length === 0 && (
                      <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '13px' }}>
                        {lang === 'fr' ? `Aucun ${roleOpt.label.toLowerCase()} enregistré` : `لا يوجد ${roleOpt.labelAr}`}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        </>
      )}

      {/* ─── Modal ─────────────────────────────────────────── */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              {editing
                ? (lang === 'fr' ? `Modifier: @${editing.username}` : `تعديل: @${editing.username}`)
                : (lang === 'fr' ? 'Nouveau compte utilisateur' : 'حساب مستخدم جديد')}
            </div>

            <div className="grid-2">
              {/* Prénom */}
              <div className="form-group">
                <label className="form-label">{lang === 'fr' ? 'Prénom' : 'الاسم الأول'}</label>
                <input className="form-control" value={form.first_name}
                  onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} />
              </div>
              {/* Nom */}
              <div className="form-group">
                <label className="form-label">{lang === 'fr' ? 'Nom' : 'اللقب'}</label>
                <input className="form-control" value={form.last_name}
                  onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} />
              </div>
              {/* Username */}
              <div className="form-group">
                <label className="form-label">{lang === 'fr' ? "Nom d'utilisateur *" : 'اسم المستخدم *'}</label>
                <input className="form-control" value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  disabled={!!editing} />
              </div>
              {/* Téléphone */}
              <div className="form-group">
                <label className="form-label">{lang === 'fr' ? 'Téléphone' : 'الهاتف'}</label>
                <input className="form-control" value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              {/* Matricule */}
              {(form.role === 'livreur' || form.role === 'prevendeur') && (
                <div className="form-group">
                  <label className="form-label">{lang === 'fr' ? 'Matricule' : 'رقم التسجيل'}</label>
                  <input className="form-control" value={form.matricule}
                    onChange={e => setForm(f => ({ ...f, matricule: e.target.value }))} />
                </div>
              )}
              {/* Mot de passe */}
              <div className="form-group">
                <label className="form-label">
                  {editing
                    ? (lang === 'fr' ? 'Nouveau mot de passe (laisser vide = inchangé)' : 'كلمة مرور جديدة (اتركه فارغًا للإبقاء)')
                    : (lang === 'fr' ? 'Mot de passe *' : 'كلمة المرور *')}
                </label>
                <input className="form-control" type="password" value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              </div>
              {/* Email */}
              <div className="form-group">
                <label className="form-label">{lang === 'fr' ? 'Email' : 'البريد الإلكتروني'}</label>
                <input className="form-control" type="email" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
            </div>

            {/* Role selector */}
            <div className="form-group" style={{ marginTop: '8px' }}>
              <label className="form-label">{lang === 'fr' ? 'Rôle *' : 'الدور *'}</label>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {ROLE_OPTIONS.map(r => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, role: r.value as any }))}
                    style={{
                      flex: '1', minWidth: '120px', padding: '12px 14px',
                      borderRadius: '10px', border: `2px solid ${form.role === r.value ? r.color : 'var(--border)'}`,
                      background: form.role === r.value ? r.color + '18' : 'var(--bg-elevated)',
                      color: form.role === r.value ? r.color : 'var(--text-secondary)',
                      cursor: 'pointer', fontWeight: form.role === r.value ? 800 : 500,
                      transition: 'all 0.15s ease', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                    }}
                  >
                    <span style={{ fontSize: '20px' }}>{r.icon}</span>
                    <span style={{ fontSize: '12px' }}>{lang === 'fr' ? r.label : r.labelAr}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Specialite selector — only for prevendeur and livreur */}
            {form.role !== 'admin' && (
              <div className="form-group" style={{ marginTop: '12px' }}>
                <label className="form-label">
                  {lang === 'fr'
                    ? (form.role === 'prevendeur' ? 'Type de commandes autorisées *' : 'Type de livraisons *')
                    : (form.role === 'prevendeur' ? 'نوع الطلبات المسموح بها *' : 'نوع التوصيلات *')}
                </label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {SPECIALITE_OPTIONS.map(s => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, specialite: s.value as any }))}
                      style={{
                        flex: '1', minWidth: '130px', padding: '14px',
                        borderRadius: '10px', border: `2px solid ${form.specialite === s.value ? s.color : 'var(--border)'}`,
                        background: form.specialite === s.value ? s.color + '18' : 'var(--bg-elevated)',
                        color: form.specialite === s.value ? s.color : 'var(--text-secondary)',
                        cursor: 'pointer', fontWeight: form.specialite === s.value ? 800 : 500,
                        transition: 'all 0.15s ease', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                      }}
                    >
                      <span style={{ fontSize: '24px' }}>{s.icon}</span>
                      <span style={{ fontSize: '13px', fontWeight: 700 }}>{lang === 'fr' ? s.label : s.labelAr}</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.3 }}>
                        {form.role === 'livreur'
                          ? (s.value === 'detail'
                            ? (lang === 'fr' ? 'Livre par carton' : 'يوصل بالكرتون')
                            : s.value === 'gros'
                              ? (lang === 'fr' ? 'Livre par palette' : 'يوصل بالمستودع')
                              : (lang === 'fr' ? 'Tous types' : 'جميع الأنواع'))
                          : (s.value === 'detail'
                            ? (lang === 'fr' ? 'Commandes détail seulement' : 'طلبات التجزئة فقط')
                            : s.value === 'gros'
                              ? (lang === 'fr' ? 'Commandes gros seulement' : 'طلبات الجملة فقط')
                              : (lang === 'fr' ? 'Détail + Gros' : 'تجزئة + جملة'))}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Active status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '16px', padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: '8px' }}>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', flex: 1 }}>
                {lang === 'fr' ? 'Compte actif' : 'الحساب نشط'}
              </label>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                style={{
                  width: 48, height: 26, borderRadius: '13px', border: 'none', cursor: 'pointer',
                  background: form.is_active ? '#10b981' : '#374151',
                  position: 'relative', transition: 'background 0.2s',
                }}
              >
                <span style={{
                  position: 'absolute', top: 3, left: form.is_active ? 24 : 4,
                  width: 20, height: 20, borderRadius: '50%', background: 'white',
                  transition: 'left 0.2s', display: 'block',
                }} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button className="btn btn-secondary" onClick={() => setModal(false)}>
                {lang === 'fr' ? 'Annuler' : 'إلغاء'}
              </button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? <div className="spinner" style={{ width: 14, height: 14 }} /> : null}
                {lang === 'fr' ? 'Enregistrer' : 'حفظ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
