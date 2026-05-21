import { useLocation } from 'react-router-dom';
import { useLang } from '@/contexts/LangContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Sun, Moon, LogOut, UserCircle, Menu } from 'lucide-react';
import { useState, useEffect } from 'react';

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

export default function Topbar({ isMobileRole, onMenuClick }: { isMobileRole?: boolean, onMenuClick?: () => void }) {
  const { pathname } = useLocation();
  const { lang, setLang } = useLang();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const title = pageTitles[pathname]?.[lang] || 'DetergPro';

  const btnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 36, height: 36, borderRadius: '8px', border: '1px solid var(--border)',
    background: 'var(--bg-elevated)', color: 'var(--text-secondary)', cursor: 'pointer',
    transition: 'all 0.2s ease',
  };

  return (
    <header className="topbar" style={isMobileRole ? { justifyContent: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', borderBottom: 'none', background: 'var(--brand-primary)', color: 'white' } : {}}>
      {!isMobileRole && (
        <button className="mobile-menu-btn" onClick={onMenuClick} style={{ display: 'none', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}>
          <Menu size={24} />
        </button>
      )}
      <h2 className="topbar-title" style={isMobileRole ? { color: 'white', flex: 1, textAlign: 'center', fontSize: '16px', letterSpacing: '0.5px' } : {}}>{title}</h2>

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
                  borderRadius: '12px', padding: '8px', minWidth: 180,
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
        <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: '8px' }}>
          <button onClick={() => setLang(lang === 'fr' ? 'ar' : 'fr')}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', width: 32, height: 32, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '13px' }}>
            {lang === 'fr' ? 'AR' : 'FR'}
          </button>
          <button onClick={toggleTheme}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', width: 32, height: 32, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
          </button>
          <button onClick={logout}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', width: 32, height: 32, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LogOut size={14} />
          </button>
        </div>
      )}
    </header>
  );
}
