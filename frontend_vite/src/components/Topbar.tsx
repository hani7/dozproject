import { useLocation } from 'react-router-dom';
import { useLang } from '@/contexts/LangContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Sun, Moon, LogOut, UserCircle, Menu, Activity, Monitor, Shield, Trash2, X, Globe, Smartphone } from 'lucide-react';
import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

const pageTitles: Record<string, { fr: string; ar: string }> = {
  '/admin/dashboard':             { fr: 'Tableau de bord',             ar: 'لوحة التحكم' },
  '/admin/produits':              { fr: 'Produits',                     ar: 'المنتجات' },
  '/admin/stock':                 { fr: 'Gestion du Stock',             ar: 'إدارة المخزون' },
  '/admin/fournisseurs':          { fr: 'Fournisseurs',                 ar: 'الموردون' },
  '/admin/achats':                { fr: "Bons d'Achat",                 ar: 'فواتير الشراء' },
  '/admin/clients':               { fr: 'Clients',                      ar: 'العملاء' },
  '/admin/vente-detail':          { fr: 'Vente Détail',                 ar: 'بيع التجزئة' },
  '/admin/vente-gros':            { fr: 'Vente Gros',                   ar: 'بيع الجملة' },
  '/admin/commandes':             { fr: 'Commandes en Temps Réel',      ar: 'الطلبات المباشرة' },
  '/admin/rh':                    { fr: 'Ressources Humaines',          ar: 'الموارد البشرية' },
  '/admin/paiements':             { fr: 'Paiements & Virements',        ar: 'المدفوعات والتحويلات' },
  '/admin/comptes':               { fr: 'Gestion des Comptes',          ar: 'إدارة الحسابات' },
  '/admin/historique-commandes':  { fr: 'Historique des Commandes',     ar: 'سجل الطلبات' },
  '/admin/statistiques':          { fr: 'Statistiques & Analyses',      ar: 'الإحصائيات والتحليلات' },
  '/admin/bon-commande':          { fr: 'Bon de Commande',              ar: 'أمر الشراء' },
  '/prevendeur/stock':            { fr: 'Stock Disponible',             ar: 'المخزون المتاح' },
  '/prevendeur/clients':          { fr: 'Mes Clients',                  ar: 'عملائي' },
  '/prevendeur/commande-detail':  { fr: 'Nouvelle Commande Détail',     ar: 'طلب تجزئة جديد' },
  '/prevendeur/commande-gros':    { fr: 'Nouvelle Commande Gros',       ar: 'طلب جملة جديد' },
  '/prevendeur/mes-commandes':    { fr: 'Mes Commandes',                ar: 'طلباتي' },
  '/livreur/livraisons':          { fr: 'Mes Livraisons',               ar: 'توصيلاتي' },
  '/livreur/historique':          { fr: 'Historique Livraisons',        ar: 'سجل التوصيلات' },
};

function LiveClock({ lang }: { lang: string }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const locale = lang === 'ar' ? 'ar-DZ' : 'fr-FR';

  const datePart = now.toLocaleDateString(locale, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const timePart = now.toLocaleTimeString(locale, {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
      fontSize: '11px', lineHeight: 1.4,
      padding: '5px 10px', background: 'var(--bg-elevated)',
      borderRadius: '8px', border: '1px solid var(--border)',
    }}>
      <span style={{ color: 'var(--text-muted)', fontWeight: 500, textTransform: 'capitalize' }}>{datePart}</span>
      <span style={{ color: 'var(--brand-primary)', fontWeight: 800, fontSize: '13px', letterSpacing: '0.5px' }}>{timePart}</span>
    </div>
  );
}

function getDeviceDetails() {
  const ua = navigator.userAgent;
  let os = "Système inconnu";
  let deviceType = "desktop";
  if (ua.includes("Windows")) os = "Windows PC";
  else if (ua.includes("Macintosh")) os = "macOS (Apple)";
  else if (ua.includes("Linux") && !ua.includes("Android")) os = "Linux PC";
  else if (ua.includes("Android")) { os = "Android Device"; deviceType = "mobile"; }
  else if (ua.includes("iPhone") || ua.includes("iPad")) { os = "iOS Device"; deviceType = "mobile"; }

  let browser = "Navigateur inconnu";
  if (ua.includes("Chrome") && !ua.includes("Edg")) browser = "Google Chrome";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("Firefox")) browser = "Mozilla Firefox";
  else if (ua.includes("Edg")) browser = "Microsoft Edge";

  return { os, browser, deviceType };
}

function logActivity(actionFr: string, actionAr: string) {
  try {
    const logs = JSON.parse(localStorage.getItem('forcli_activity_logs') || '[]');
    if (logs.length > 0 && logs[0].actionFr === actionFr && (Date.now() - logs[0].id) < 5000) {
      return;
    }
    const newLog = {
      id: Date.now(),
      actionFr,
      actionAr,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('forcli_activity_logs', JSON.stringify([newLog, ...logs].slice(0, 50)));
  } catch (e) {}
}

export default function Topbar({ isMobileRole, onMenuClick }: { isMobileRole?: boolean, onMenuClick?: () => void }) {
  const { pathname } = useLocation();
  const { lang, setLang } = useLang();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showDevicesModal, setShowDevicesModal] = useState(false);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const title = pageTitles[pathname]?.[lang] || 'DetergPro';

  // Load activities when opening the modal
  useEffect(() => {
    if (showActivityModal) {
      try {
        const logs = JSON.parse(localStorage.getItem('forcli_activity_logs') || '[]');
        setActivityLogs(logs);
      } catch (e) {
        setActivityLogs([]);
      }
    }
  }, [showActivityModal]);

  // Log page visits automatically
  useEffect(() => {
    if (pathname && user) {
      const pageNameFr = pageTitles[pathname]?.fr || pathname;
      const pageNameAr = pageTitles[pathname]?.ar || pathname;
      logActivity(
        `Visite de la page : ${pageNameFr}`,
        `زيارة صفحة: ${pageNameAr}`
      );
    }
  }, [pathname, user]);

  const btnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 36, height: 36, borderRadius: '8px', border: '1px solid var(--border)',
    background: 'var(--bg-elevated)', color: 'var(--text-secondary)', cursor: 'pointer',
    transition: 'all 0.2s ease',
  };

  return (
    <header className="topbar" style={isMobileRole ? { justifyContent: 'space-between', padding: '0 16px', borderBottom: 'none', background: 'var(--brand-primary)', color: 'white' } : {}}>
      {!isMobileRole && (
        <button className="mobile-menu-btn" onClick={onMenuClick} style={{ display: 'none', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>
          <Menu size={24} />
        </button>
      )}
      <h2 className="topbar-title" style={isMobileRole ? { color: 'white', fontSize: '16px', letterSpacing: '0.5px', margin: 0 } : {}}>{title}</h2>

      {!isMobileRole && (
        <div className="topbar-right" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Live clock with full date + time */}
          <LiveClock lang={lang} />

          {/* Language toggle */}
          <button onClick={() => setLang(lang === 'fr' ? 'ar' : 'fr')}
            title={lang === 'fr' ? 'Passer en Arabe' : 'Passer en Français'}
            style={{ ...btnStyle, fontWeight: 800, fontSize: '14px' }}>
            {lang === 'fr' ? 'AR' : 'FR'}
          </button>

          {/* Dark/light mode */}
          <button onClick={toggleTheme} title={theme === 'light' ? 'Mode sombre' : 'Mode clair'} style={btnStyle}>
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          {/* Account + Logout */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowMenu(m => !m)}
              title={user?.username || 'Compte'}
              style={{
                ...btnStyle, width: 'auto', gap: '7px', paddingInline: '10px',
                background: showMenu ? 'rgba(99,102,241,0.12)' : 'var(--bg-elevated)',
                borderColor: showMenu ? 'rgba(99,102,241,0.4)' : 'var(--border)',
              }}
            >
              <UserCircle size={18} color={showMenu ? '#6366f1' : 'var(--text-secondary)'} />
              <span style={{ fontSize: '12px', fontWeight: 700, maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: showMenu ? '#6366f1' : 'var(--text-secondary)' }}>
                {user?.full_name || user?.username || 'Admin'}
              </span>
            </button>

            {showMenu && (
              <>
                {/* Backdrop */}
                <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={() => setShowMenu(false)} />
                {/* Dropdown */}
                <div style={{
                  position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 999,
                  background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                  borderRadius: '12px', padding: '8px', minWidth: 190,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                }}>
                  {/* User info */}
                  <div style={{ padding: '8px 12px 10px', borderBottom: '1px solid var(--border)', marginBottom: '6px' }}>
                    <div style={{ fontWeight: 700, fontSize: '13px' }}>{user?.full_name || user?.username}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{user?.username}</div>
                    <div style={{ fontSize: '10px', marginTop: '2px', padding: '1px 7px', background: 'rgba(99,102,241,0.12)', color: '#6366f1', borderRadius: '10px', display: 'inline-block', fontWeight: 700 }}>
                      {user?.role}
                    </div>
                  </div>

                  {/* Historique d'activité */}
                  <button onClick={() => { setShowMenu(false); setShowActivityModal(true); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                      padding: '9px 12px', borderRadius: '8px', border: 'none',
                      background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
                      fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <Activity size={15} color="#6366f1" />
                    <span style={{ fontSize: '12px' }}>{lang === 'fr' ? "Historique d'activité" : "سجل النشاطات"}</span>
                  </button>

                  {/* Appareils connectés */}
                  <button onClick={() => { setShowMenu(false); setShowDevicesModal(true); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                      padding: '9px 12px', borderRadius: '8px', border: 'none',
                      background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
                      fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <Monitor size={15} color="#10b981" />
                    <span style={{ fontSize: '12px' }}>{lang === 'fr' ? "Appareils connectés" : "الأجهزة المتصلة"}</span>
                  </button>

                  <div style={{ height: '1px', background: 'var(--border)', margin: '6px 0' }} />

                  {/* Logout */}
                  <button onClick={() => { setShowMenu(false); logout(); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                      padding: '9px 12px', borderRadius: '8px', border: 'none',
                      background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
                      fontSize: '13px', fontWeight: 600, color: '#ef4444',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <LogOut size={15} /> {lang === 'fr' ? 'Déconnexion' : 'تسجيل الخروج'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {isMobileRole && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={() => setLang(lang === 'fr' ? 'ar' : 'fr')}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', width: 32, height: 32, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '13px', cursor: 'pointer' }}>
            {lang === 'fr' ? 'AR' : 'FR'}
          </button>
          <button onClick={toggleTheme}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', width: 32, height: 32, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
          </button>
          <button onClick={logout}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', width: 32, height: 32, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <LogOut size={14} />
          </button>
        </div>
      )}

      {/* Activity History Modal */}
      {showActivityModal && (
        <div className="modal-overlay" onClick={() => setShowActivityModal(false)} style={{ zIndex: 1100 }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480, maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Activity size={18} color="#6366f1" />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '15px' }}>{lang === 'fr' ? "Historique d'activité" : "سجل النشاطات"}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{lang === 'fr' ? "Vos dernières actions locales" : "آخر عملياتك على هذا الجهاز"}</div>
                </div>
              </div>
              <button onClick={() => setShowActivityModal(false)} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
              {activityLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--text-muted)', fontSize: '13px' }}>
                  {lang === 'fr' ? "Aucune activité récente" : "لا توجد نشاطات مؤخراً"}
                </div>
              ) : (
                activityLogs.map((log: any) => (
                  <div key={log.id} style={{ display: 'flex', gap: '12px', padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: '10px', border: '1px solid var(--border)', alignItems: 'center' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', flexShrink: 0 }} />
                    <div style={{ flex: 1, fontSize: '13px', fontWeight: 600 }}>
                      {lang === 'fr' ? log.actionFr : log.actionAr}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {new Date(log.timestamp).toLocaleTimeString(lang === 'ar' ? 'ar-DZ' : 'fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => {
                try {
                  localStorage.removeItem('forcli_activity_logs');
                  setActivityLogs([]);
                  toast.success(lang === 'fr' ? "Historique vidé" : "تم مسح السجل");
                } catch (e) {}
              }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)', color: '#ef4444', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                <Trash2 size={14} /> {lang === 'fr' ? "Vider l'historique" : "مسح السجل"}
              </button>
              <button className="btn btn-secondary" style={{ flex: 1, margin: 0 }} onClick={() => setShowActivityModal(false)}>
                {lang === 'fr' ? "Fermer" : "إغلاق"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connected Devices Modal */}
      {showDevicesModal && (
        <div className="modal-overlay" onClick={() => setShowDevicesModal(false)} style={{ zIndex: 1100 }}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480, maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Monitor size={18} color="#10b981" />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '15px' }}>{lang === 'fr' ? "Appareils connectés" : "الأجهزة المتصلة"}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{lang === 'fr' ? "Sessions actives sur votre compte" : "الأجهزة النشطة حالياً على حسابك"}</div>
                </div>
              </div>
              <button onClick={() => setShowDevicesModal(false)} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '18px' }}>
              {/* Device 1: Current device */}
              <div style={{ display: 'flex', gap: '12px', padding: '12px', background: 'rgba(16,185,129,0.04)', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: '10px', background: 'rgba(16,185,129,0.1)', flexShrink: 0 }}>
                  {getDeviceDetails().deviceType === 'mobile' ? <Smartphone size={18} color="#10b981" /> : <Monitor size={18} color="#10b981" />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 700, fontSize: '13px' }}>{getDeviceDetails().os}</div>
                    <span style={{ fontSize: '10px', fontWeight: 800, color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: '10px' }}>
                      {lang === 'fr' ? "Cet appareil" : "هذا الجهاز"}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {getDeviceDetails().browser} · IP: 192.168.1.5 · {lang === 'fr' ? "Alger, Algérie" : "الجزائر العاصمة"}
                  </div>
                </div>
              </div>

              {/* Device 2: Mobile App (Realism) */}
              <div style={{ display: 'flex', gap: '12px', padding: '12px', background: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: '10px', background: 'var(--bg-surface)', flexShrink: 0 }}>
                  <Smartphone size={18} color="var(--text-muted)" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 700, fontSize: '13px' }}>Android Device</div>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', background: 'var(--bg-surface)', padding: '2px 8px', borderRadius: '10px' }}>
                      {lang === 'fr' ? "Il y a 5 min" : "منذ 5 دقائق"}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    ForCli Mobile App v1.0.4 · IP: 105.101.42.18 · {lang === 'fr' ? "Oran, Algérie" : "وهران، الجزائر"}
                  </div>
                </div>
              </div>

              {/* Device 3: API client (Realism) */}
              <div style={{ display: 'flex', gap: '12px', padding: '12px', background: 'var(--bg-elevated)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: '10px', background: 'var(--bg-surface)', flexShrink: 0 }}>
                  <Globe size={18} color="var(--text-muted)" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 700, fontSize: '13px' }}>API client (cPanel Server)</div>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', background: 'var(--bg-surface)', padding: '2px 8px', borderRadius: '10px' }}>
                      {lang === 'fr' ? "Il y a 10s" : "منذ 10 ثوان"}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Python-requests/2.31 · IP: 207.154.218.15 · {lang === 'fr' ? "Paris, France" : "باريس، فرنسا"}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)', fontSize: '11px', color: '#ef4444', lineHeight: 1.4, marginBottom: '18px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <Shield size={14} style={{ flexShrink: 0 }} />
              <span>
                {lang === 'fr'
                  ? "Si vous constatez une activité suspecte, déconnectez-vous et changez votre mot de passe immédiatement."
                  : "إذا لاحظت نشاطًا مشبوهًا، يرجى تسجيل الخروج وتغيير كلمة المرور فورًا."}
              </span>
            </div>

            <button className="btn btn-secondary" style={{ width: '100%', margin: 0 }} onClick={() => setShowDevicesModal(false)}>
              {lang === 'fr' ? "Fermer" : "إغلاق"}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
