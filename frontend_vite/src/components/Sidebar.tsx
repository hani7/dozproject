
import { Link } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLang } from '@/contexts/LangContext';
import {
  LayoutDashboard, Tag, Package, Warehouse, ShoppingCart,
  TrendingUp, BarChart3, Radio, Users, CreditCard,
  UserCircle, Truck, ClipboardList, ShoppingBag,
  LogOut, ChevronRight, Building2, KeyRound,
  ChevronLeft, FileText, PieChart, MapPin
} from 'lucide-react';

const adminNav = [
  { label: 'nav.dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'nav.products', href: '/admin/produits', icon: Package },
  { label: 'nav.stock', href: '/admin/stock', icon: Warehouse },
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
  { label: 'Suivi GPS', href: '/admin/tracking', icon: MapPin },
  { label: 'nav.fournisseurs', href: '/admin/fournisseurs', icon: Building2 },
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
  items.push({ label: 'nav.tournee',   href: '/prevendeur/tournee',        icon: MapPin });
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
        background: 'linear-gradient(180deg, #7132ca 0%, #4c1d95 100%)',
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
              background: 'linear-gradient(135deg, #ffffff, #d8b4fe)',
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
          background: '#7132ca',
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

    </aside>
  );
}
