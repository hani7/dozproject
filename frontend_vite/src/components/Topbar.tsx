import { useLocation } from 'react-router-dom';
import { useLang } from '@/contexts/LangContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';

const pageTitles: Record<string, { fr: string; ar: string }> = {
  '/admin/dashboard': { fr: 'Tableau de bord', ar: 'لوحة التحكم' },
  '/admin/produits': { fr: 'Produits', ar: 'المنتجات' },
  '/admin/stock': { fr: 'Gestion du Stock', ar: 'إدارة المخزون' },
  '/admin/fournisseurs': { fr: 'Fournisseurs', ar: 'الموردون' },
  '/admin/achats': { fr: 'Bons d\'Achat', ar: 'فواتير الشراء' },
  '/admin/clients': { fr: 'Clients', ar: 'العملاء' },
  '/admin/vente-detail': { fr: 'Vente Détail', ar: 'بيع التجزئة' },
  '/admin/vente-gros': { fr: 'Vente Gros', ar: 'بيع الجملة' },
  '/admin/commandes': { fr: 'Commandes en Temps Réel', ar: 'الطلبات المباشرة' },
  '/admin/rh': { fr: 'Ressources Humaines', ar: 'الموارد البشرية' },
  '/admin/paiements': { fr: 'Paiements & Virements', ar: 'المدفوعات والتحويلات' },
  '/admin/comptes': { fr: 'Gestion des Comptes', ar: 'إدارة الحسابات' },
  '/admin/historique-commandes': { fr: 'Historique des Commandes', ar: 'سجل الطلبات' },
  '/prevendeur/stock': { fr: 'Stock Disponible', ar: 'المخزون المتاح' },
  '/prevendeur/clients': { fr: 'Mes Clients', ar: 'عملائي' },
  '/prevendeur/commande-detail': { fr: 'Nouvelle Commande Détail', ar: 'طلب تجزئة جديد' },
  '/prevendeur/commande-gros': { fr: 'Nouvelle Commande Gros', ar: 'طلب جملة جديد' },
  '/prevendeur/mes-commandes': { fr: 'Mes Commandes', ar: 'طلباتي' },
  '/livreur/livraisons': { fr: 'Mes Livraisons', ar: 'توصيلاتي' },
  '/livreur/historique': { fr: 'Historique Livraisons', ar: 'سجل التوصيلات' },
};

export default function Topbar({ isMobileRole }: { isMobileRole?: boolean }) {
  const { pathname } = useLocation();
  const { lang, setLang } = useLang();
  const { theme, toggleTheme } = useTheme();
  const title = pageTitles[pathname]?.[lang] || 'DetergPro';

  return (
    <header className="topbar" style={isMobileRole ? { justifyContent: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', borderBottom: 'none', background: 'var(--brand-primary)', color: 'white' } : {}}>
      <h2 className="topbar-title" style={isMobileRole ? { color: 'white', flex: 1, textAlign: 'center', fontSize: '16px', letterSpacing: '0.5px' } : {}}>{title}</h2>
      
      {!isMobileRole && (
        <div className="topbar-right" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '4px 10px', background: 'var(--bg-elevated)', borderRadius: '6px', border: '1px solid var(--border)' }}>
            {new Date().toLocaleDateString(lang === 'ar' ? 'ar-DZ' : 'fr-DZ', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          <button
            onClick={() => setLang(lang === 'fr' ? 'ar' : 'fr')}
            title={lang === 'fr' ? 'Passer en Arabe' : 'Passer en Français'}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 36, height: 36, borderRadius: '8px', border: '1px solid var(--border)',
              background: 'var(--bg-elevated)', color: 'var(--text-secondary)', cursor: 'pointer',
              transition: 'all 0.2s ease', fontWeight: 800, fontSize: '14px'
            }}
          >
            {lang === 'fr' ? 'AR' : 'FR'}
          </button>
          <button
            onClick={toggleTheme}
            title={theme === 'light' ? 'Mode sombre' : 'Mode clair'}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 36, height: 36, borderRadius: '8px', border: '1px solid var(--border)',
              background: 'var(--bg-elevated)', color: 'var(--text-secondary)', cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </div>
      )}

      {isMobileRole && (
        <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setLang(lang === 'fr' ? 'ar' : 'fr')}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', width: 32, height: 32, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '13px' }}
          >
            {lang === 'fr' ? 'AR' : 'FR'}
          </button>
          <button
            onClick={toggleTheme}
            style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', width: 32, height: 32, borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
          </button>
        </div>
      )}
    </header>
  );
}
