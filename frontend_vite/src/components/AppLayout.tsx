import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState, useMemo } from 'react';
import { useLang } from '@/contexts/LangContext';
import { Link } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';
import api from '@/lib/api';
import type { UserRole } from '@/lib/types';
import {
  Package, Users, ShoppingBag, ShoppingCart, ClipboardList,
  Truck, Clock, Home, User, MapPin
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

  // GPS Tracking Loop
  useEffect(() => {
    if (!user || (user.role !== 'prevendeur' && user.role !== 'livreur')) return;

    let watchId: number;
    if ('geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(
        async (position) => {
          try {
            await api.post('/auth/users/update_location/', {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          } catch (e) {
            console.error('Error sending GPS location', e);
          }
        },
        (error) => console.warn('GPS Error:', error),
        { enableHighAccuracy: true, maximumAge: 60000, timeout: 10000 }
      );
    }
    return () => {
      if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
    };
  }, [user]);

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
      items.push({ href: '/prevendeur/tournee',       icon: MapPin,        label: t('nav.tournee') });
      return items;
    }
    if (user.role === 'livreur') {
      return [
        { href: '/livreur/livraisons', icon: Home, label: t('nav.home') },
        { href: '/livreur/historique', icon: Clock, label: t('nav.history') },
        { href: '#', icon: User, label: t('nav.account') },
      ];
    }
    return [];
  }, [user.role, user.specialite, isMobileRole, t]);

  return (
    <div className="app-layout">
      {/* Desktop sidebar — hidden on mobile for prevendeur/livreur via CSS */}
      <div className={`sidebar-container ${isMobileRole ? 'mobile-hide-sidebar' : (!sidebarCollapsed ? 'mobile-open' : 'mobile-closed')}`}>
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(c => !c)} />
      </div>
      {/* Backdrop for mobile sidebar */}
      {!isMobileRole && !sidebarCollapsed && (
        <div 
          className="mobile-sidebar-backdrop" 
          onClick={() => setSidebarCollapsed(true)} 
        />
      )}
      <div
        className={`main-content ${isMobileRole ? 'mobile-main' : ''}`}
        style={{ marginLeft: isMobileRole ? undefined : (sidebarCollapsed ? 72 : 260), transition: 'margin-left 0.3s ease' }}
      >
        <Topbar isMobileRole={isMobileRole} onMenuClick={() => setSidebarCollapsed(c => !c)} />
        <main className={`page-content ${isMobileRole ? 'mobile-page-content' : ''}`}>
          {children}
        </main>
        {/* Footer */}
        {!isMobileRole && (
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
        )}
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
                onClick={(e) => {
                  if (item.href === '#') {
                    e.preventDefault();
                    // Open topbar mobile menu or trigger logout logic for now
                    alert("Menu compte");
                  }
                }}
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
