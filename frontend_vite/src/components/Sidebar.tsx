
import { Link } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLang } from '@/contexts/LangContext';
import {
  LayoutDashboard, Tag, Package, Warehouse, ShoppingCart,
  TrendingUp, BarChart3, Radio, Users, CreditCard,
  UserCircle, Truck, ClipboardList, ShoppingBag,
  LogOut, ChevronRight, Building2, KeyRound,
  ChevronLeft, FileText, PieChart
} from 'lucide-react';

const adminNav = [
  { label: 'nav.dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'nav.products', href: '/admin/produits', icon: Package },
  { label: 'nav.stock', href: '/admin/stock', icon: Warehouse },
  { label: 'nav.fournisseurs', href: '/admin/fournisseurs', icon: Building2 },
  { label: 'nav.bon_commande', href: '/admin/bon-commande', icon: FileText },
  { label: 'nav.purchases', href: '/admin/achats', icon: ShoppingCart },
  { label: 'nav.clients', href: '/admin/clients', icon: Users },
  { label: 'nav.sales_detail', href: '/admin/vente-detail', icon: TrendingUp },
  { label: 'nav.sales_gros', href: '/admin/vente-gros', icon: BarChart3 },
  { label: 'nav.orders', href: '/admin/commandes', icon: Radio },
  { label: 'nav.historique', href: '/admin/historique-commandes', icon: ClipboardList },
  { label: 'nav.statistiques', href: '/admin/statistiques', icon: PieChart },
  { label: 'nav.hr', href: '/admin/rh', icon: UserCircle },
  { label: 'nav.payments', href: '/admin/paiements', icon: CreditCard },
  { label: 'nav.comptes', href: '/admin/comptes', icon: KeyRound },
];

// Prévendeur nav is dynamic based on specialite
function getPrevendeurNav(specialite: string) {
  const items: any[] = [
    { label: 'nav.stock_view', href: '/prevendeur/stock', icon: Package },
    { label: 'nav.my_clients', href: '/prevendeur/clients', icon: Users },
  ];
  if (specialite === 'detail' || specialite === 'les_deux') {
    items.push({ label: 'nav.order_detail', href: '/prevendeur/commande-detail', icon: ShoppingBag });
  }
  if (specialite === 'gros' || specialite === 'les_deux') {
    items.push({ label: 'nav.order_gros', href: '/prevendeur/commande-gros', icon: ShoppingCart });
  }
  items.push({ label: 'nav.my_orders', href: '/prevendeur/mes-commandes', icon: ClipboardList });
  return items;
}

const livreurNav = [
  { label: 'nav.deliveries', href: '/livreur/livraisons', icon: Truck },
  { label: 'nav.history', href: '/livreur/historique', icon: ClipboardList },
];

const SPECIALITE_LABELS: Record<string, Record<string, string>> = {
  detail: { fr: 'Détail · Carton', ar: 'تجزئة · كرتون' },
  gros: { fr: 'Gros · Palette', ar: 'جملة · مستودع' },
  les_deux: { fr: 'Détail & Gros', ar: 'تجزئة وجملة' },
};

const SPECIALITE_COLORS: Record<string, string> = {
  detail: '#06b6d4',
  gros: '#8b5cf6',
  les_deux: '#10b981',
};

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user, logout } = useAuth();
  const { t, lang, setLang, isRTL } = useLang();
  const { pathname } = useLocation();

  const specialite = user?.specialite || 'les_deux';

  const nav = user?.role === 'admin' ? adminNav
    : user?.role === 'prevendeur' ? getPrevendeurNav(specialite)
    : livreurNav;

  const roleLabels: Record<string, Record<string, string>> = {
    admin: { fr: 'Administrateur', ar: 'مدير النظام' },
    prevendeur: { fr: 'Prévendeur', ar: 'مسبق البيع' },
    livreur: { fr: 'Livreur', ar: 'موزع' },
  };
  const roleLabel = roleLabels[user?.role || 'admin']?.[lang] || user?.role || '';

  const sidebarWidth = collapsed ? 72 : 260;

  return (
    <aside
      className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}
      style={{
        width: sidebarWidth,
        background: collapsed ? '#009f43' : '#006045',
        borderRight: isRTL ? 'none' : '1px solid rgba(255,255,255,0.1)',
        borderLeft: isRTL ? '1px solid rgba(255,255,255,0.1)' : 'none',
      }}
    >
      {/* Logo + Toggle */}
      <div className="sidebar-logo" style={{ borderBottom: '1px solid rgba(255,255,255,0.12)', padding: collapsed ? '20px 0' : '24px 20px 20px', textAlign: collapsed ? 'center' : undefined }}>
        {collapsed ? (
          <div style={{ fontSize: '22px', fontWeight: 900, color: '#fff', letterSpacing: '-1px' }}>FC</div>
        ) : (
          <>
            <h1 style={{
              background: 'linear-gradient(135deg, #ffffff, #a5f3c8)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontSize: '22px',
              letterSpacing: '-0.5px',
            }}>ForCli</h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>Distribution & Commerce</p>
          </>
        )}
      </div>

      {/* Toggle button */}
      <button
        onClick={onToggle}
        style={{
          position: 'absolute',
          top: 28,
          [isRTL ? 'left' : 'right']: -14,
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: collapsed ? '#009f43' : '#006045',
          border: '2px solid rgba(255,255,255,0.2)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 110,
          transition: 'all 0.3s ease',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}
        title={collapsed ? 'Ouvrir' : 'Fermer'}
      >
        {collapsed
          ? (isRTL ? <ChevronLeft size={14} /> : <ChevronRight size={14} />)
          : (isRTL ? <ChevronRight size={14} /> : <ChevronLeft size={14} />)
        }
      </button>

      <nav className="sidebar-nav" style={{ padding: collapsed ? '12px 8px' : '12px 12px' }}>
        {nav.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              to={href}
              className={`nav-item ${isActive ? 'active' : ''}`}
              style={{
                justifyContent: collapsed ? 'center' : undefined,
                padding: collapsed ? '10px' : undefined,
              }}
              title={collapsed ? t(label) : undefined}
            >
              <Icon className="icon" size={collapsed ? 22 : 18} />
              {!collapsed && <span style={{ flex: 1 }}>{t(label)}</span>}
              {!collapsed && isActive && <ChevronRight size={12} style={{ opacity: 0.5 }} />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div style={{ padding: collapsed ? '8px' : '12px', borderTop: '1px solid rgba(255,255,255,0.12)' }}>
        {/* Language toggle */}
        {!collapsed ? (
          <button
            className="lang-btn"
            style={{
              width: '100%',
              justifyContent: 'center',
              marginBottom: '8px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.8)',
            }}
            onClick={() => setLang(lang === 'fr' ? 'ar' : 'fr')}
          >
            {lang === 'fr' ? '🇩🇿 العربية' : '🇫🇷 Français'}
          </button>
        ) : (
          <button
            onClick={() => setLang(lang === 'fr' ? 'ar' : 'fr')}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '8px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.8)',
              cursor: 'pointer',
              fontSize: '14px',
              marginBottom: '8px',
            }}
            title={lang === 'fr' ? 'العربية' : 'Français'}
          >
            {lang === 'fr' ? '🇩🇿' : '🇫🇷'}
          </button>
        )}

        {/* User info */}
        <div style={{
          padding: collapsed ? '8px 4px' : '10px 12px',
          background: 'rgba(255,255,255,0.06)',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05)',
          transition: 'all 0.3s ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: collapsed ? '0' : '12px', justifyContent: collapsed ? 'center' : undefined, marginBottom: collapsed ? '4px' : '8px' }}>
            <div style={{
              width: 36, height: 36, borderRadius: '10px',
              background: 'linear-gradient(135deg, #a5f3c8, #009f43)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px', fontWeight: 800, color: '#003d29', flexShrink: 0,
              boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
            }}>
              {user?.full_name?.[0] || user?.username?.[0] || 'U'}
            </div>
            {!collapsed && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.full_name || user?.username}
                </div>
                <div style={{ fontSize: '11px', color: '#a5f3c8', fontWeight: 500, letterSpacing: '0.3px' }}>{roleLabel}</div>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={logout}
                style={{ 
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', 
                  borderRadius: '8px', cursor: 'pointer', color: '#fca5a5', padding: '6px',
                  transition: 'all 0.2s'
                }}
                title={t('nav.logout')}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#fca5a5'; }}
              >
                <LogOut size={15} />
              </button>
            )}
          </div>

          {/* Logout button when collapsed */}
          {collapsed && (
            <button
              onClick={logout}
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.6)',
                padding: '6px',
              }}
              title={t('nav.logout')}
            >
              <LogOut size={14} />
            </button>
          )}

          {/* Specialite badge for prevendeur & livreur */}
          {!collapsed && user?.role !== 'admin' && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '5px 8px', borderRadius: '6px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.15)',
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: SPECIALITE_COLORS[specialite],
                flexShrink: 0,
              }} />
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>
                {SPECIALITE_LABELS[specialite]?.[lang] || specialite}
              </span>
              {user?.role === 'livreur' && (
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginLeft: 'auto' }}>
                  {specialite === 'detail' ? '📦' : specialite === 'gros' ? '🏭' : '🚚'}
                </span>
              )}
              {user?.role === 'prevendeur' && (
                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginLeft: 'auto' }}>
                  {specialite === 'detail' ? '🛒' : specialite === 'gros' ? '🏪' : '💼'}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
