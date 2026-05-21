import { useState, useEffect, useMemo } from "react";
import AppLayout from "@/components/AppLayout";
import { useLang } from "@/contexts/LangContext";
import api from "@/lib/api";
import API_URL from "@/lib/config";
import toast from "react-hot-toast";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Send,
  Package,
  AlertTriangle,
  Camera,
  CheckCircle2,
} from "lucide-react";
import type { Product, Client } from "@/lib/types";

const MEDIA_BASE = API_URL.replace("/api", "");

interface CartItem {
  product: Product;
  qty: number;
}

interface Props {
  type: "detail" | "gros";
}

export function CommandeForm({ type }: Props) {
  const { lang } = useLang();
  const fr = lang === "fr";
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [clientId, setClientId] = useState("");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [addedId, setAddedId] = useState<number | null>(null);
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState("");

  useEffect(() => {
    setLoadingProducts(true);
    api
      .get("/products/", { params: { actif: true, page_size: 200 } })
      .then((r) => {
        setProducts(r.data.results || r.data);
        setLoadingProducts(false);
      })
      .catch(() => setLoadingProducts(false));
    const fetchAllClients = async () => {
      try {
        let all: any[] = [];
        let url: string | null = `/clients/?page_size=500`;
        while (url) {
          const r = await api.get(url);
          all = [...all, ...(r.data.results || r.data)];
          url = r.data.next || null;
        }
        setClients(all);
      } catch (e) {
        console.error(e);
      }
    };
    fetchAllClients();
  }, [type]);

  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          p.nom.toLowerCase().includes(search.toLowerCase()) ||
          p.code?.toLowerCase().includes(search.toLowerCase()),
      ),
    [products, search],
  );

  const addToCart = (p: Product) => {
    setAddedId(p.id);
    setTimeout(() => setAddedId(null), 700);
    setCart((c) => {
      const ex = c.find((i) => i.product.id === p.id);
      if (ex)
        return c.map((i) =>
          i.product.id === p.id ? { ...i, qty: i.qty + 1 } : i,
        );
      return [...c, { product: p, qty: 1 }];
    });
  };

  const updateQty = (id: number, qty: number) => {
    if (qty <= 0) {
      removeFromCart(id);
      return;
    }
    setCart((c) => c.map((i) => (i.product.id === id ? { ...i, qty } : i)));
  };

  const removeFromCart = (id: number) =>
    setCart((c) => c.filter((i) => i.product.id !== id));

  const price = (p: Product) =>
    type === "gros" ? Number(p.prix_gros) : Number(p.prix_detail);

  const total = cart.reduce((s, i) => s + i.qty * price(i.product), 0);

  const submit = async () => {
    if (!clientId) {
      toast.error(lang === "fr" ? "Sélectionner un client" : "اختر عميلاً");
      return;
    }
    if (cart.length === 0) {
      toast.error(lang === "fr" ? "Panier vide" : "السلة فارغة");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post("/commandes/", {
        client: Number(clientId),
        type_commande: type,
        notes,
        lignes: cart.map((i) => ({
          produit: i.product.id,
          quantite: i.qty,
          prix_unitaire: price(i.product),
          sous_total: i.qty * price(i.product),
        })),
      });
      const ref = res.data.reference;

      // Upload photo if present
      if (photo) {
        const formData = new FormData();
        formData.append("photo", photo);
        try {
          await api.patch(`/commandes/${res.data.id}/`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        } catch (photoErr) {
          console.error("Photo upload failed:", photoErr);
          toast.error(
            lang === "fr"
              ? "Commande créée mais upload photo échoué"
              : "تم إنشاء الطلب ولكن فشل رفع الصورة",
          );
        }
      }

      toast.success(
        lang === "fr"
          ? `Commande ${ref} envoyée à l'admin!`
          : `تم إرسال الطلب ${ref} للمدير!`,
        { duration: 5000 },
      );
      setSubmitted(ref);
      setCart([]);
      setClientId("");
      setNotes("");
      setPhoto(null);
    } catch (e: any) {
      const err = e?.response?.data;
      toast.error(
        typeof err === "string"
          ? err
          : JSON.stringify(err) || "Erreur lors de l'envoi",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const clientSelected = clients.find((c) => String(c.id) === clientId);

  return (
    <AppLayout allowedRoles={["prevendeur"]}>
      <div className="page-header">
        <div>
          <h1>
            {type === "gros"
              ? lang === "fr"
                ? "🏭 Commande Palette (Gros)"
                : "🏭 طلب باليت (جملة)"
              : lang === "fr"
                ? "📦 Commande Carton (Détail)"
                : "📦 طلب كرتون (تجزئة)"}
          </h1>
          <p
            style={{
              color: "var(--text-muted)",
              fontSize: "13px",
              marginTop: "4px",
            }}
          >
            {lang === "fr"
              ? `${type === "gros" ? "🏭 Prix Palette" : "📦 Prix Carton"} · Clients ${type} · ${clients.length} disponibles`
              : `${type === "gros" ? "🏭 سعر الباليت" : "📦 سعر الكرتون"} · عملاء ${type === "gros" ? "الجملة" : "التجزئة"} · ${clients.length} متاح`}
          </p>
        </div>
      </div>

      {/* Success banner */}
      {submitted && (
        <div className="alert alert-success" style={{ marginBottom: "20px" }}>
          <Send size={14} />
          {lang === "fr"
            ? `Commande ${submitted} envoyée avec succès!`
            : `تم إرسال الطلب ${submitted} بنجاح!`}
          <button
            style={{
              marginLeft: "auto",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "inherit",
            }}
            onClick={() => setSubmitted(null)}
          >
            ✕
          </button>
        </div>
      )}

      <div className="commande-layout">
        {/* LEFT: Product catalog */}
        <div>
          {/* Client selector */}
          <div
            className="card"
            style={{ marginBottom: "16px", padding: "16px" }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: "13px",
                  color: "var(--text-secondary)",
                  minWidth: "80px",
                }}
              >
                👤 {lang === "fr" ? "Client:" : "العميل:"}
              </div>
              <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
                <div
                  className="form-control"
                  onClick={() => setClientSearchOpen(!clientSearchOpen)}
                  style={{
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "var(--bg-elevated)",
                  }}
                >
                  <span
                    style={{
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      fontWeight: clientId ? 700 : 400,
                      color: clientId
                        ? "var(--text-primary)"
                        : "var(--text-muted)",
                    }}
                  >
                    {clientId
                      ? clients.find((c) => String(c.id) === clientId)?.nom
                      : lang === "fr"
                        ? "— Sélectionner un client —"
                        : "— اختر العميل —"}
                  </span>
                  <span
                    style={{ fontSize: "10px", color: "var(--text-muted)" }}
                  >
                    ▼
                  </span>
                </div>
                {clientSearchOpen && (
                  <>
                    <div
                      style={{ position: "fixed", inset: 0, zIndex: 99 }}
                      onClick={() => setClientSearchOpen(false)}
                    />
                    <div
                      style={{
                        position: "absolute",
                        top: "calc(100% + 4px)",
                        left: 0,
                        right: 0,
                        zIndex: 100,
                        background: "var(--bg-card)",
                        border: "1px solid var(--border)",
                        borderRadius: "8px",
                        boxShadow: "var(--shadow-md)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          padding: "8px",
                          borderBottom: "1px solid var(--border)",
                          background: "var(--bg-elevated)",
                        }}
                      >
                        <input
                          autoFocus
                          className="form-control"
                          placeholder={
                            lang === "fr"
                              ? "Rechercher un client..."
                              : "بحث عن عميل..."
                          }
                          value={clientSearch}
                          onChange={(e) => setClientSearch(e.target.value)}
                          style={{ width: "100%", fontSize: "13px" }}
                        />
                      </div>
                      <div style={{ maxHeight: "250px", overflowY: "auto" }}>
                        {clients
                          .filter(
                            (c) =>
                              c.nom
                                .toLowerCase()
                                .includes(clientSearch.toLowerCase()) ||
                              (c.phone && c.phone.includes(clientSearch)),
                          )
                          .map((c) => (
                            <div
                              key={c.id}
                              onClick={() => {
                                setClientId(String(c.id));
                                setClientSearchOpen(false);
                                setClientSearch("");
                              }}
                              style={{
                                padding: "10px 12px",
                                borderBottom: "1px solid var(--border)",
                                cursor: "pointer",
                                background:
                                  clientId === String(c.id)
                                    ? "rgba(99,102,241,0.08)"
                                    : "transparent",
                              }}
                              onMouseEnter={(e) => {
                                if (clientId !== String(c.id))
                                  e.currentTarget.style.background =
                                    "var(--bg-elevated)";
                              }}
                              onMouseLeave={(e) => {
                                if (clientId !== String(c.id))
                                  e.currentTarget.style.background =
                                    "transparent";
                              }}
                            >
                              <div
                                style={{
                                  fontWeight: 600,
                                  fontSize: "13px",
                                  color:
                                    clientId === String(c.id)
                                      ? "#6366f1"
                                      : "var(--text-primary)",
                                }}
                              >
                                {c.nom}
                              </div>
                              {(c.phone || c.adresse) && (
                                <div
                                  style={{
                                    fontSize: "11px",
                                    color: "var(--text-muted)",
                                    marginTop: "3px",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {c.phone} {c.phone && c.adresse && "·"}{" "}
                                  {c.adresse}
                                </div>
                              )}
                            </div>
                          ))}
                        {clients.filter(
                          (c) =>
                            c.nom
                              .toLowerCase()
                              .includes(clientSearch.toLowerCase()) ||
                            (c.phone && c.phone.includes(clientSearch)),
                        ).length === 0 && (
                          <div
                            style={{
                              padding: "16px",
                              textAlign: "center",
                              fontSize: "13px",
                              color: "var(--text-muted)",
                            }}
                          >
                            {lang === "fr"
                              ? "Aucun client trouvé"
                              : "لم يتم العثور على عملاء"}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
              {clientSelected && (
                <div
                  style={{
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    display: "flex",
                    gap: "8px",
                  }}
                >
                  {clientSelected.phone && (
                    <span>📞 {clientSelected.phone}</span>
                  )}
                  {clientSelected.adresse && (
                    <span>📍 {clientSelected.adresse.substring(0, 30)}</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Search bar */}
          <div className="search-input-wrap" style={{ marginBottom: "16px" }}>
            <Search />
            <input
              className="form-control"
              placeholder={
                lang === "fr"
                  ? "Rechercher produit (nom, code)..."
                  : "بحث عن منتج (اسم، رمز)..."
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Product grid */}
          {loadingProducts ? (
            <div style={{ textAlign: "center", padding: "40px" }}>
              <div className="spinner" />
            </div>
          ) : (
            <div
              className="product-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: "12px",
              }}
            >
              {filtered.map((p) => {
                const inCart = cart.find((i) => i.product.id === p.id);
                const pPrice = price(p);
                const isJustAdded = addedId === p.id;
                return (
                  <div
                    key={p.id}
                    style={{
                      background: inCart
                        ? type === "gros"
                          ? "rgba(99,102,241,0.04)"
                          : "rgba(6,182,212,0.04)"
                        : "var(--bg-card)",
                      border: inCart
                        ? `2px solid ${type === "gros" ? "rgba(99,102,241,0.5)" : "rgba(6,182,212,0.5)"}`
                        : "1px solid var(--border)",
                      borderRadius: "14px",
                      padding: "14px",
                      transition: "all 0.2s ease",
                      boxShadow: inCart
                        ? `0 4px 16px ${type === "gros" ? "rgba(99,102,241,0.12)" : "rgba(6,182,212,0.12)"}`
                        : "var(--shadow-sm)",
                      display: "flex",
                      flexDirection: "column",
                      position: "relative",
                    }}
                  >
                    {/* In-cart badge */}
                    {inCart && (
                      <div
                        style={{
                          position: "absolute",
                          top: "10px",
                          right: "10px",
                          background: type === "gros" ? "#6366f1" : "#06b6d4",
                          color: "white",
                          borderRadius: "20px",
                          fontSize: "11px",
                          fontWeight: 800,
                          padding: "2px 8px",
                          display: "flex",
                          alignItems: "center",
                          gap: "3px",
                        }}
                      >
                        <CheckCircle2 size={10} />×{inCart.qty}
                      </div>
                    )}

                    {/* Product image */}
                    {p.image && (
                      <img
                        src={
                          p.image.startsWith("http")
                            ? p.image
                            : `${MEDIA_BASE}${p.image}`
                        }
                        alt={p.nom}
                        style={{
                          width: "100%",
                          height: "80px",
                          objectFit: "cover",
                          borderRadius: "8px",
                          marginBottom: "8px",
                          border: "1px solid var(--border)",
                        }}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display =
                            "none";
                        }}
                      />
                    )}

                    {/* Product name */}
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: "13px",
                        color: "var(--text-primary)",
                        marginBottom: "4px",
                        lineHeight: 1.3,
                        paddingRight: inCart ? "52px" : "0",
                      }}
                    >
                      {p.nom}
                    </div>

                    {/* Code */}
                    <div
                      style={{
                        fontSize: "11px",
                        color: "var(--text-muted)",
                        marginBottom: "8px",
                      }}
                    >
                      {p.code} · {p.cartons_par_palette} ctn/pal.
                    </div>

                    {/* Price */}
                    <div
                      style={{
                        fontWeight: 900,
                        color: type === "gros" ? "#6366f1" : "#06b6d4",
                        fontSize: "17px",
                        marginBottom: "8px",
                        display: "flex",
                        alignItems: "baseline",
                        gap: "3px",
                      }}
                    >
                      {pPrice.toLocaleString("fr-DZ")}
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 400,
                          color: "var(--text-muted)",
                        }}
                      >
                        DA/{fr ? "carton" : "كرتون"}
                      </span>
                    </div>

                    {/* Stock */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "11px",
                        color: p.stock_faible ? "#ef4444" : "var(--text-muted)",
                        marginBottom: "12px",
                      }}
                    >
                      {p.stock_faible && <AlertTriangle size={10} />}
                      {lang === "fr" ? "Stock:" : "مخزون:"} {p.stock_actuel}
                    </div>

                    {/* Action buttons */}
                    {inCart ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          marginTop: "auto",
                        }}
                      >
                        <button
                          type="button"
                          className="btn btn-danger btn-icon"
                          style={{ width: 30, height: 30, flexShrink: 0 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFromCart(p.id);
                          }}
                          title={fr ? "Supprimer" : "حذف"}
                        >
                          <Trash2 size={12} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-icon"
                          style={{ width: 30, height: 30, flexShrink: 0 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            updateQty(p.id, inCart.qty - 1);
                          }}
                        >
                          <Minus size={12} />
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={inCart.qty}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) =>
                            updateQty(p.id, Number(e.target.value))
                          }
                          style={{
                            flex: 1,
                            textAlign: "center",
                            width: "100%",
                            background: "var(--bg-elevated)",
                            border: "1px solid var(--border)",
                            borderRadius: "8px",
                            color: "var(--text-primary)",
                            fontSize: "14px",
                            fontWeight: 700,
                            padding: "4px",
                          }}
                        />
                        <button
                          type="button"
                          className="btn btn-secondary btn-icon"
                          style={{ width: 30, height: 30, flexShrink: 0 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(p);
                          }}
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => addToCart(p)}
                        style={{
                          marginTop: "auto",
                          width: "100%",
                          padding: "8px",
                          borderRadius: "10px",
                          border: `1.5px solid ${type === "gros" ? "rgba(99,102,241,0.4)" : "rgba(6,182,212,0.4)"}`,
                          background: isJustAdded
                            ? type === "gros"
                              ? "#6366f1"
                              : "#06b6d4"
                            : type === "gros"
                              ? "rgba(99,102,241,0.08)"
                              : "rgba(6,182,212,0.08)",
                          color: isJustAdded
                            ? "white"
                            : type === "gros"
                              ? "#6366f1"
                              : "#06b6d4",
                          fontWeight: 700,
                          fontSize: "12px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "5px",
                          transition: "all 0.2s ease",
                        }}
                      >
                        {isJustAdded ? (
                          <CheckCircle2 size={13} />
                        ) : (
                          <Plus size={13} />
                        )}
                        {isJustAdded
                          ? fr
                            ? "Ajouté !"
                            : "تمت الإضافة!"
                          : fr
                            ? "Ajouter"
                            : "إضافة للسلة"}
                      </button>
                    )}
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div
                  style={{
                    gridColumn: "1/-1",
                    textAlign: "center",
                    padding: "40px",
                    color: "var(--text-muted)",
                  }}
                >
                  <Package
                    size={32}
                    style={{
                      opacity: 0.2,
                      display: "block",
                      margin: "0 auto 8px",
                    }}
                  />
                  <p>
                    {lang === "fr" ? "Aucun produit trouvé" : "لا توجد منتجات"}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: Cart */}
        <div
          className="card cart-panel"
          style={{
            position: "sticky",
            top: "80px",
            padding: "0",
            overflow: "hidden",
          }}
        >
          {/* Cart header */}
          <div
            style={{
              padding: "16px 20px",
              background:
                type === "gros"
                  ? "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08))"
                  : "linear-gradient(135deg, rgba(6,182,212,0.12), rgba(14,165,233,0.08))",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "10px",
                background: type === "gros" ? "#6366f1" : "#06b6d4",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ShoppingCart size={16} color="white" />
            </div>
            <div>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: "15px",
                  color: "var(--text-primary)",
                }}
              >
                {lang === "fr" ? "Panier" : "السلة"}
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                {cart.length} {lang === "fr" ? "produit(s)" : "منتج"}
              </div>
            </div>
            {cart.length > 0 && (
              <button
                onClick={() => setCart([])}
                style={{
                  marginLeft: "auto",
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  borderRadius: "8px",
                  padding: "5px 10px",
                  cursor: "pointer",
                  color: "#ef4444",
                  fontSize: "11px",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <Trash2 size={11} />
                {fr ? "Vider" : "إفراغ"}
              </button>
            )}
          </div>

          <div style={{ padding: "16px 20px" }}>
            {cart.length === 0 ? (
              <div className="empty-state" style={{ padding: "30px 0" }}>
                <ShoppingCart size={36} />
                <p style={{ marginTop: "8px" }}>
                  {lang === "fr" ? "Panier vide" : "السلة فارغة"}
                </p>
                <p style={{ fontSize: "11px", marginTop: "4px" }}>
                  {lang === "fr"
                    ? "Cliquez sur un produit pour l'ajouter"
                    : "انقر على منتج لإضافته"}
                </p>
              </div>
            ) : (
              <>
                {/* Cart items */}
                <div
                  style={{
                    maxHeight: "260px",
                    overflowY: "auto",
                    marginBottom: "14px",
                  }}
                >
                  {cart.map((item) => (
                    <div
                      key={item.product.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "10px 0",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: "13px",
                            fontWeight: 600,
                            color: "var(--text-primary)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.product.nom}
                        </div>
                        <div
                          style={{
                            fontSize: "11px",
                            color: "var(--text-muted)",
                            marginTop: "2px",
                          }}
                        >
                          {price(item.product).toLocaleString("fr-DZ")} DA ×{" "}
                          {item.qty} ={" "}
                          <strong style={{ color: "var(--text-secondary)" }}>
                            {(item.qty * price(item.product)).toLocaleString(
                              "fr-DZ",
                            )}{" "}
                            DA
                          </strong>
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          flexShrink: 0,
                        }}
                      >
                        <button
                          type="button"
                          className="btn btn-secondary btn-icon"
                          style={{ width: 26, height: 26 }}
                          onClick={() =>
                            updateQty(item.product.id, item.qty - 1)
                          }
                        >
                          <Minus size={10} />
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={item.qty}
                          onChange={(e) =>
                            updateQty(item.product.id, Number(e.target.value))
                          }
                          style={{
                            width: "36px",
                            textAlign: "center",
                            background: "var(--bg-elevated)",
                            border: "1px solid var(--border)",
                            borderRadius: "6px",
                            color: "var(--text-primary)",
                            fontSize: "13px",
                            fontWeight: 700,
                            padding: "2px",
                          }}
                        />
                        <button
                          type="button"
                          className="btn btn-secondary btn-icon"
                          style={{ width: 26, height: 26 }}
                          onClick={() =>
                            updateQty(item.product.id, item.qty + 1)
                          }
                        >
                          <Plus size={10} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger btn-icon"
                          style={{ width: 26, height: 26 }}
                          onClick={() => removeFromCart(item.product.id)}
                          title={fr ? "Supprimer" : "حذف"}
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div
                  style={{
                    background: "var(--bg-elevated)",
                    borderRadius: "12px",
                    padding: "14px 16px",
                    marginBottom: "14px",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "12px",
                      color: "var(--text-muted)",
                      fontWeight: 600,
                      marginBottom: "6px",
                    }}
                  >
                    {cart.length} {lang === "fr" ? "article(s)" : "صنف"} ·{" "}
                    {cart.reduce((s, i) => s + i.qty, 0)}{" "}
                    {lang === "fr" ? "unité(s)" : "وحدة"}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontWeight: 900,
                      fontSize: "20px",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        color: "var(--text-secondary)",
                        fontSize: "14px",
                        fontWeight: 700,
                      }}
                    >
                      {lang === "fr" ? "Total" : "المجموع"}
                    </span>
                    <span
                      style={{ color: type === "gros" ? "#6366f1" : "#06b6d4" }}
                    >
                      {total.toLocaleString("fr-DZ")}{" "}
                      <span style={{ fontSize: "13px", fontWeight: 600 }}>
                        DA
                      </span>
                    </span>
                  </div>
                </div>

                {/* Notes */}
                <div className="form-group" style={{ marginBottom: "10px" }}>
                  <label className="form-label">
                    {lang === "fr" ? "Notes / instructions" : "ملاحظات"}
                  </label>
                  <textarea
                    className="form-control"
                    rows={2}
                    placeholder={
                      lang === "fr"
                        ? "Ex: Livraison urgente..."
                        : "ملاحظات للمدير..."
                    }
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                {/* Photo Upload */}
                <div className="form-group">
                  <label
                    className="form-label"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Camera size={14} />{" "}
                    {lang === "fr" ? "Photo (optionnel)" : "صورة (اختياري)"}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="form-control"
                    style={{ fontSize: "13px", padding: "8px" }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setPhoto(e.target.files[0]);
                      }
                    }}
                  />
                  {photo && (
                    <div
                      style={{
                        fontSize: "11px",
                        color: "#10b981",
                        marginTop: "4px",
                        fontWeight: 600,
                      }}
                    >
                      {lang === "fr"
                        ? "✅ Image sélectionnée"
                        : "✅ تم تحديد الصورة"}
                    </div>
                  )}
                </div>

                {/* Submit */}
                <button
                  className="btn btn-primary"
                  style={{
                    width: "100%",
                    padding: "13px",
                    fontSize: "14px",
                    fontWeight: 800,
                  }}
                  onClick={submit}
                  disabled={submitting || !clientId}
                >
                  {submitting ? (
                    <>
                      <div
                        className="spinner"
                        style={{
                          width: 16,
                          height: 16,
                          border: "2px solid rgba(255,255,255,0.3)",
                          borderTopColor: "white",
                        }}
                      />
                      {lang === "fr" ? "Envoi..." : "إرسال..."}
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      {lang === "fr" ? "Envoyer à l'admin" : "إرسال للمدير"}
                    </>
                  )}
                </button>

                {!clientId && (
                  <p
                    style={{
                      fontSize: "11px",
                      color: "#f59e0b",
                      textAlign: "center",
                      marginTop: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "4px",
                    }}
                  >
                    ⚠️{" "}
                    {lang === "fr"
                      ? "Veuillez sélectionner un client"
                      : "يرجى اختيار عميل"}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
