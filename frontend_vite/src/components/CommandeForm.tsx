import { useState, useEffect, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { useLang } from '@/contexts/LangContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Search, Plus, Minus, Trash2, ShoppingCart, Send, Package, AlertTriangle } from 'lucide-react';
import type { Product, Client } from '@/lib/types';

interface CartItem { product: Product; qty: number; }

interface Props { type: 'detail' | 'gros'; }

export function CommandeForm({ type }: Props) {
  const { lang } = useLang();
  const fr = lang === 'fr';
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [clientId, setClientId] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [submitted, setSubmitted] = useState<string | null>(null);

  // Load products and clients matching this type
  useEffect(() => {
    setLoadingProducts(true);
    api.get('/products/', { params: { actif: true, page_size: 200 } })
      .then(r => { setProducts(r.data.results || r.data); setLoadingProducts(false); })
      .catch(() => setLoadingProducts(false));

    api.get('/clients/', { params: { type_client: type, page_size: 200 } })
      .then(r => setClients(r.data.results || r.data))
      .catch(() => {});
  }, [type]);

  const filtered = useMemo(() =>
    products.filter(p =>
      p.nom.toLowerCase().includes(search.toLowerCase()) ||
      p.code?.toLowerCase().includes(search.toLowerCase())
    ), [products, search]);

  const addToCart = (p: Product) => {
    setCart(c => {
      const ex = c.find(i => i.product.id === p.id);
      if (ex) return c.map(i => i.product.id === p.id ? { ...i, qty: i.qty + 1 } : i);
      return [...c, { product: p, qty: 1 }];
    });
  };

  const updateQty = (id: number, qty: number) => {
    if (qty <= 0) { removeFromCart(id); return; }
    setCart(c => c.map(i => i.product.id === id ? { ...i, qty } : i));
  };

  const removeFromCart = (id: number) => setCart(c => c.filter(i => i.product.id !== id));

  const price = (p: Product) => type === 'gros' ? Number(p.prix_gros) : Number(p.prix_detail);

  const total = cart.reduce((s, i) => s + i.qty * price(i.product), 0);

  const submit = async () => {
    if (!clientId) { toast.error(lang === 'fr' ? 'Sélectionner un client' : 'اختر عميلاً'); return; }
    if (cart.length === 0) { toast.error(lang === 'fr' ? 'Panier vide' : 'السلة فارغة'); return; }
    setSubmitting(true);
    try {
      const res = await api.post('/commandes/', {
        client: Number(clientId),
        type_commande: type,
        notes,
        lignes: cart.map(i => ({
          produit: i.product.id,
          quantite: i.qty,
          prix_unitaire: price(i.product),
          sous_total: i.qty * price(i.product),
        }))
      });
      const ref = res.data.reference;
      toast.success(
        lang === 'fr' ? `Commande ${ref} envoyée à l'admin!` : `تم إرسال الطلب ${ref} للمدير!`,
        { duration: 5000 }
      );
      setSubmitted(ref);
      setCart([]);
      setClientId('');
      setNotes('');
    } catch (e: any) {
      const err = e?.response?.data;
      toast.error(typeof err === 'string' ? err : JSON.stringify(err) || 'Erreur lors de l\'envoi');
    } finally { setSubmitting(false); }
  };

  const clientSelected = clients.find(c => String(c.id) === clientId);

  return (
    <AppLayout allowedRoles={['prevendeur']}>
      <div className="page-header">
        <div>
          <h1>
            {type === 'gros'
              ? (lang === 'fr' ? '🏭 Commande Palette (Gros)' : '🏭 طلب باليت (جملة)')
              : (lang === 'fr' ? '📦 Commande Carton (Détail)' : '📦 طلب كرتون (تجزئة)')}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
            {lang === 'fr'
              ? `${type === 'gros' ? '🏭 Prix Palette' : '📦 Prix Carton'} · Clients ${type} · ${clients.length} disponibles`
              : `${type === 'gros' ? '🏭 سعر الباليت' : '📦 سعر الكرتون'} · عملاء ${type === 'gros' ? 'الجملة' : 'التجزئة'} · ${clients.length} متاح`}
          </p>
        </div>
      </div>

      {/* Success banner */}
      {submitted && (
        <div className="alert alert-success" style={{ marginBottom: '20px' }}>
          <Send size={14} />
          {lang === 'fr' ? `Commande ${submitted} envoyée avec succès!` : `تم إرسال الطلب ${submitted} بنجاح!`}
          <button
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
            onClick={() => setSubmitted(null)}
          >✕</button>
        </div>
      )}

      <div className="commande-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '20px', alignItems: 'start' }}>
        {/* LEFT: Product catalog */}
        <div>
          {/* Client selector */}
          <div className="card" style={{ marginBottom: '16px', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-secondary)', minWidth: '80px' }}>
                👤 {lang === 'fr' ? 'Client:' : 'العميل:'}
              </div>
              <select
                className="form-control"
                style={{ flex: 1, minWidth: '200px' }}
                value={clientId}
                onChange={e => setClientId(e.target.value)}
              >
                <option value="">
                  {lang === 'fr' ? '— Sélectionner un client —' : '— اختر العميل —'}
                </option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.nom} — {c.wilaya || c.phone || ''}
                  </option>
                ))}
              </select>
              {clientSelected && (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '8px' }}>
                  {clientSelected.phone && <span>📞 {clientSelected.phone}</span>}
                  {clientSelected.adresse && <span>📍 {clientSelected.adresse.substring(0, 30)}</span>}
                </div>
              )}
            </div>
          </div>

          {/* Search bar */}
          <div className="search-input-wrap" style={{ marginBottom: '16px' }}>
            <Search />
            <input
              className="form-control"
              placeholder={lang === 'fr' ? 'Rechercher produit (nom, code, catégorie)...' : 'بحث عن منتج (اسم، رمز، فئة)...'}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Product grid */}
          {loadingProducts ? (
            <div style={{ textAlign: 'center', padding: '40px' }}><div className="spinner" /></div>
          ) : (
            <div className="product-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '12px' }}>
              {filtered.map(p => {
                const inCart = cart.find(i => i.product.id === p.id);
                const pPrice = price(p);
                return (
                  <div
                    key={p.id}
                    className="card"
                    style={{
                      cursor: 'pointer',
                      padding: '14px',
                      transition: 'all 0.15s ease',
                      border: inCart ? '1px solid rgba(99,102,241,0.6)' : '1px solid var(--border)',
                      background: inCart ? 'rgba(99,102,241,0.05)' : 'var(--bg-card)',
                    }}
                    onClick={() => addToCart(p)}
                  >
                    <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)', marginBottom: '4px', lineHeight: 1.3 }}>
                      {p.nom}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                      {p.code} · {p.cartons_par_palette} ctn/pal.
                    </div>
                    <div style={{ fontWeight: 900, color: type === 'gros' ? '#6366f1' : '#06b6d4', fontSize: '17px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {pPrice.toLocaleString('fr-DZ')} <span style={{ fontSize: '11px', fontWeight: 400 }}>DA</span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '2px' }}>
                        /{fr ? 'carton' : 'كرتون'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px' }}>
                      <span style={{ color: p.stock_faible ? '#ef4444' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        {p.stock_faible && <AlertTriangle size={10} />}
                        {lang === 'fr' ? 'Stock:' : 'مخزون:'} {p.stock_actuel}
                      </span>
                      {inCart && (
                        <span style={{ fontWeight: 700, color: 'var(--brand-primary)', background: 'rgba(99,102,241,0.15)', padding: '2px 7px', borderRadius: '10px', fontSize: '12px' }}>
                          ×{inCart.qty}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <Package size={32} style={{ opacity: 0.2, display: 'block', margin: '0 auto 8px' }} />
                  <p>{lang === 'fr' ? 'Aucun produit trouvé' : 'لا توجد منتجات'}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: Cart */}
        <div className="card cart-panel" style={{ position: 'sticky', top: '80px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--border)' }}>
            <ShoppingCart size={18} color="var(--brand-primary)" />
            <h3 style={{ fontSize: '15px', fontWeight: 800 }}>
              {lang === 'fr' ? 'Panier' : 'السلة'}
            </h3>
            <span className="badge badge-purple" style={{ marginLeft: 'auto' }}>
              {cart.length} {lang === 'fr' ? 'produit(s)' : 'منتج'}
            </span>
          </div>

          {cart.length === 0 ? (
            <div className="empty-state" style={{ padding: '30px 0' }}>
              <ShoppingCart size={36} />
              <p style={{ marginTop: '8px' }}>{lang === 'fr' ? 'Panier vide' : 'السلة فارغة'}</p>
              <p style={{ fontSize: '11px', marginTop: '4px' }}>
                {lang === 'fr' ? 'Cliquez sur un produit pour l\'ajouter' : 'انقر على منتج لإضافته'}
              </p>
            </div>
          ) : (
            <>
              {/* Cart items */}
              <div style={{ maxHeight: '320px', overflowY: 'auto', marginBottom: '12px' }}>
                {cart.map(item => (
                  <div key={item.product.id} className="cart-item">
                    <div style={{ flex: 1, minWidth: 0, marginRight: '8px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.product.nom}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {price(item.product).toLocaleString('fr-DZ')} DA × {item.qty} = {(item.qty * price(item.product)).toLocaleString('fr-DZ')} DA
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                      <button className="btn btn-secondary btn-icon" style={{ width: 24, height: 24 }} onClick={() => updateQty(item.product.id, item.qty - 1)}><Minus size={10} /></button>
                      <input
                        type="number"
                        min={1}
                        value={item.qty}
                        onChange={e => updateQty(item.product.id, Number(e.target.value))}
                        style={{ width: '36px', textAlign: 'center', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '4px', color: 'var(--text-primary)', fontSize: '13px', fontWeight: 700, padding: '2px' }}
                      />
                      <button className="btn btn-secondary btn-icon" style={{ width: 24, height: 24 }} onClick={() => updateQty(item.product.id, item.qty + 1)}><Plus size={10} /></button>
                      <button className="btn btn-danger btn-icon" style={{ width: 24, height: 24 }} onClick={() => removeFromCart(item.product.id)}><Trash2 size={10} /></button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div style={{ background: 'var(--bg-elevated)', borderRadius: '10px', padding: '12px 14px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '18px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{lang === 'fr' ? 'Total:' : 'المجموع:'}</span>
                  <span style={{ color: 'var(--brand-primary)' }}>{total.toLocaleString('fr-DZ')} DA</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {cart.length} {lang === 'fr' ? 'article(s)' : 'صنف'} · {cart.reduce((s, i) => s + i.qty, 0)} {lang === 'fr' ? 'unité(s)' : 'وحدة'}
                </div>
              </div>

              {/* Notes */}
              <div className="form-group">
                <label className="form-label">{lang === 'fr' ? 'Notes / instructions' : 'ملاحظات'}</label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder={lang === 'fr' ? 'Ex: Livraison urgente, créneau préféré...' : 'ملاحظات للمدير...'}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>

              {/* Submit */}
              <button
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px', fontSize: '14px', fontWeight: 800 }}
                onClick={submit}
                disabled={submitting || !clientId}
              >
                {submitting ? (
                  <><div className="spinner" style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white' }} />{lang === 'fr' ? 'Envoi...' : 'إرسال...'}</>
                ) : (
                  <><Send size={16} />{lang === 'fr' ? 'Envoyer à l\'admin' : 'إرسال للمدير'}</>
                )}
              </button>

              {!clientId && (
                <p style={{ fontSize: '11px', color: '#f59e0b', textAlign: 'center', marginTop: '8px' }}>
                  ⚠️ {lang === 'fr' ? 'Veuillez sélectionner un client' : 'يرجى اختيار عميل'}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
