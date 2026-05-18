import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react';

type Lang = 'fr' | 'ar';
interface LangContextType {
  lang: Lang; setLang: (l: Lang) => void; isRTL: boolean; t: (key: string) => string;
}

const translations: Record<Lang, Record<string, string>> = {
  fr: {
    'nav.dashboard':'Tableau de bord','nav.products':'Produits','nav.stock':'Stock',
    'nav.purchases':'Achats','nav.sales_detail':'Vente Détail','nav.sales_gros':'Vente Gros',
    'nav.orders':'Commandes Live','nav.historique':'Historique commandes',
    'nav.hr':'Ressources Humaines','nav.payments':'Paiements','nav.clients':'Clients',
    'nav.fournisseurs':'Fournisseurs','nav.my_orders':'Mes Commandes',
    'nav.order_detail':'Commande Détail','nav.order_gros':'Commande Gros',
    'nav.stock_view':'Stock produits','nav.my_clients':'Mes Clients',
    'nav.deliveries':'Mes Livraisons','nav.history':'Historique',
    'nav.logout':'Déconnexion','nav.comptes':'Gestion Comptes',
    'common.search':'Rechercher...','common.add':'Ajouter','common.edit':'Modifier',
    'common.delete':'Supprimer','common.save':'Enregistrer','common.cancel':'Annuler',
    'common.confirm':'Confirmer','common.total':'Total','common.actions':'Actions',
    'common.status':'Statut','common.date':'Date','common.loading':'Chargement...',
    'common.close':'Fermer','common.submit':'Soumettre','common.yes':'Oui','common.no':'Non',
    'status.en_attente':'En attente','status.confirmee':'Confirmée',
    'status.en_livraison':'En livraison','status.livree':'Livrée',
    'status.annulee':'Annulée','status.brouillon':'Brouillon','status.recu':'Reçu',
    'dash.total_sales':'Ventes ce mois','dash.stock_value':'Valeur du stock',
    'dash.pending_orders':'Commandes en attente','dash.clients':'Clients',
    'dash.low_stock':'Stock faible','dash.revenue_chart':'Évolution des ventes (7 jours)',
    'prod.name':'Nom du produit','prod.code':'Code','prod.unit':'Unité',
    'prod.price_detail':'Prix Détail','prod.price_gros':'Prix Gros',
    'prod.stock':'Stock actuel','prod.min_stock':'Stock minimum',
    'login.title':'Connexion','login.username':"Nom d'utilisateur",
    'login.password':'Mot de passe','login.btn':'Se connecter',
    'login.subtitle':'Gestion Distribution Détergents',
  },
  ar: {
    'nav.dashboard':'لوحة التحكم','nav.products':'المنتجات','nav.stock':'المخزون',
    'nav.purchases':'المشتريات','nav.sales_detail':'بيع تجزئة','nav.sales_gros':'بيع جملة',
    'nav.orders':'الطلبات المباشرة','nav.historique':'سجل الطلبات',
    'nav.hr':'الموارد البشرية','nav.payments':'المدفوعات','nav.clients':'العملاء',
    'nav.fournisseurs':'الموردون','nav.my_orders':'طلباتي',
    'nav.order_detail':'طلب تجزئة','nav.order_gros':'طلب جملة',
    'nav.stock_view':'المخزون المتاح','nav.my_clients':'عملائي',
    'nav.deliveries':'توصيلاتي','nav.history':'السجل',
    'nav.logout':'تسجيل الخروج','nav.comptes':'إدارة الحسابات',
    'common.search':'بحث...','common.add':'إضافة','common.edit':'تعديل',
    'common.delete':'حذف','common.save':'حفظ','common.cancel':'إلغاء',
    'common.confirm':'تأكيد','common.total':'المجموع','common.actions':'الإجراءات',
    'common.status':'الحالة','common.date':'التاريخ','common.loading':'جارٍ التحميل...',
    'common.close':'إغلاق','common.submit':'إرسال','common.yes':'نعم','common.no':'لا',
    'status.en_attente':'في الانتظار','status.confirmee':'مؤكد',
    'status.en_livraison':'قيد التوصيل','status.livree':'تم التوصيل',
    'status.annulee':'ملغى','status.brouillon':'مسودة','status.recu':'مستلم',
    'dash.total_sales':'مبيعات الشهر','dash.stock_value':'قيمة المخزون',
    'dash.pending_orders':'الطلبات المعلقة','dash.clients':'العملاء',
    'dash.low_stock':'مخزون منخفض','dash.revenue_chart':'تطور المبيعات (7 أيام)',
    'prod.name':'اسم المنتج','prod.code':'الرمز','prod.unit':'الوحدة',
    'prod.price_detail':'سعر التجزئة','prod.price_gros':'سعر الجملة',
    'prod.stock':'المخزون الحالي','prod.min_stock':'الحد الأدنى',
    'login.title':'تسجيل الدخول','login.username':'اسم المستخدم',
    'login.password':'كلمة المرور','login.btn':'دخول',
    'login.subtitle':'إدارة توزيع المنظفات',
  },
};

const LangContext = createContext<LangContextType | null>(null);

function readStoredLang(): Lang {
  try { return (localStorage.getItem('lang') as Lang) || 'fr'; } catch { return 'fr'; }
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() =>
    typeof window === 'undefined' ? 'fr' : readStoredLang()
  );

  useEffect(() => {
    document.documentElement.dir  = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem('lang', l);
    document.documentElement.dir  = l === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = l;
  }, []);

  // Stable t() reference per lang — children only re-render when lang changes
  const t = useMemo(() => (key: string) => translations[lang][key] ?? key, [lang]);

  const value = useMemo(() => ({ lang, setLang, isRTL: lang === 'ar', t }), [lang, setLang, t]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used within LangProvider');
  return ctx;
}
