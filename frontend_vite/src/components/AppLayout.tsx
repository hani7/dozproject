import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState, useMemo } from 'react';
import { useLang } from '@/contexts/LangContext';
import { Link } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import type { UserRole } from '@/lib/types';
import {
  Package, Users, ShoppingBag, ShoppingCart, ClipboardList,
  Truck, Clock
} from 'lucide-react';

interface Props {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export default function AppLayout({ children, allowedRoles }: Props) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { t } = useLang();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
    if (!loading && user && allowedRoles && !allowedRoles.includes(user.role)) {
      if (user.role === 'admin') navigate('/admin/dashboard');
      else if (user.role === 'prevendeur') navigate('/prevendeur/commande-detail');
      else navigate('/livreur/livraisons');
    }
  }, [user, loading]);

  if (loading || !user) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  const isMobileRole = user.role === 'prevendeur' || user.role === 'livreur';

  // Memoize bottom nav — only recompute when role or specialite changes
  const bottomNav = useMemo(() => {
    if (!isMobileRole) return [];
    if (user.role === 'prevendeur') {
      const sp = user.specialite || 'les_deux';
      const items: { href: string; icon: any; label: string }[] = [
        { href: '/prevendeur/stock',   icon: Package,       label: t('nav.stock_view') },
        { href: '/prevendeur/clients', icon: Users,         label: t('nav.my_clients') },
      ];
      if (sp === 'detail' || sp === 'les_deux')
        items.push({ href: '/prevendeur/commande-detail', icon: ShoppingBag,   label: t('nav.order_detail') });
      if (sp === 'gros'   || sp === 'les_deux')
        items.push({ href: '/prevendeur/commande-gros',   icon: ShoppingCart,  label: t('nav.order_gros') });
      items.push({ href: '/prevendeur/mes-commandes', icon: ClipboardList, label: t('nav.my_orders') });
      return items;
    }
    if (user.role === 'livreur') {
      return [
        { href: '/livreur/livraisons', icon: Truck, label: t('nav.deliveries') },
        { href: '/livreur/historique', icon: Clock, label: t('nav.history') },
      ];
    }
    return [];
  }, [user.role, user.specialite, isMobileRole, t]);

  return (
    <div className="app-layout">
      {/* Desktop sidebar — hidden on mobile for prevendeur/livreur via CSS */}
      <div className={isMobileRole ? 'mobile-hide-sidebar' : ''}>
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(c => !c)} />
      </div>
      <div
        className={`main-content ${isMobileRole ? 'mobile-main' : ''}`}
        style={{ marginLeft: isMobileRole ? undefined : (sidebarCollapsed ? 72 : 260), transition: 'margin-left 0.3s ease' }}
      >
        <Topbar isMobileRole={isMobileRole} />
        <main className={`page-content ${isMobileRole ? 'mobile-page-content' : ''}`}>
          {children}
        </main>
        {/* Footer */}
        <footer style={{
          padding: '16px 24px',
          textAlign: 'center',
          fontSize: '12px',
          color: 'var(--text-muted)',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-surface)',
          marginTop: 'auto'
        }}>
          © 2025 ForCli · Powered by <a href="https://www.baitul.tech/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand-primary)', textDecoration: 'none', fontWeight: 600 }}>Baitul Tech</a>
        </footer>
      </div>

      {/* Bottom tab navigation for mobile */}
      {isMobileRole && bottomNav.length > 0 && (
        <nav className="mobile-bottom-nav">
          {bottomNav.map(item => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`mobile-nav-item ${active ? 'active' : ''}`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
