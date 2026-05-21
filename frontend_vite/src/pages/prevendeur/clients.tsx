import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import AppLayout from '@/components/AppLayout';
import { useLang } from '@/contexts/LangContext';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Plus, MapPin, Search, Phone, Building2, CheckCircle, Navigation, Edit2, Trash2 } from 'lucide-react';

const EMPTY = {
  nom: '', type_client: 'detail', phone: '', adresse: '',
  email: '', notes: '', latitude: '', longitude: '',
};

export default function PrevendeurClientsPage() {
  const { lang } = useLang();
  const { user } = useAuth();
  const isGros = user?.specialite === 'gros';
  const clientType = isGros ? 'gros' : 'detail';
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ ...EMPTY, type_client: clientType });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [mapMode, setMapMode] = useState(false);
  const [locating, setLocating] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);
  const fr = lang === 'fr';

  const loadClients = async () => {
    try {
      let allClients: any[] = [];
      let nextUrl: string | null = `/clients/?page_size=200&type_client=${clientType}`;
      while (nextUrl) {
        const r = await api.get(nextUrl);
        const data = r.data.results || r.data;
        allClients = [...allClients, ...data];
        if (r.data.next) {
          nextUrl = r.data.next;
        } else {
          nextUrl = null;
        }
      }
      setClients(allClients);
      setLoading(false);
    } catch (e) {
      setLoading(false);
    }
  };

  useEffect(() => { 
    loadClients(); 
    setTimeout(() => {
      toast(fr ? "🔔 N'oubliez pas d'activer votre GPS (Localisation)" : "🔔 يرجى تفعيل الـ GPS (الموقع)", { duration: 5000 });
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(() => {}, () => {}, { timeout: 2000, maximumAge: 0 });
      }
    }, 1500);
  }, []);

  // Init Leaflet map when modal opens in map mode
  useEffect(() => {
    if (!modal || !mapMode) return;

    // Wait for Leaflet to be ready (it's loaded via index.html)
    let attempts = 0;
    const tryInit = () => {
      const L = (window as any).L;
      if (!L) {
        if (attempts++ < 20) setTimeout(tryInit, 200);
        return;
      }
      if (!mapRef.current || mapInstanceRef.current) return;

      const lat = form.latitude ? Number(form.latitude) : 36.7372;
      const lng = form.longitude ? Number(form.longitude) : 3.0865;

      const map = L.map(mapRef.current).setView([lat, lng], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '\u00a9 OpenStreetMap',
      }).addTo(map);

      const icon = L.divIcon({
        className: '',
        html: '<div style="background:#006045;width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>',
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });

      if (form.latitude && form.longitude) {
        markerRef.current = L.marker([Number(form.latitude), Number(form.longitude)], { icon, draggable: true }).addTo(map);
        markerRef.current.on('dragend', (e: any) => {
          const pos = e.target.getLatLng();
          setForm(f => ({ ...f, latitude: pos.lat.toFixed(6), longitude: pos.lng.toFixed(6) }));
        });
      }

      map.on('click', (e: any) => {
        const { lat, lng } = e.latlng;
        setForm(f => ({ ...f, latitude: lat.toFixed(6), longitude: lng.toFixed(6) }));
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          markerRef.current = L.marker([lat, lng], { icon, draggable: true }).addTo(map);
          markerRef.current.on('dragend', (e2: any) => {
            const pos = e2.target.getLatLng();
            setForm(f => ({ ...f, latitude: pos.lat.toFixed(6), longitude: pos.lng.toFixed(6) }));
          });
        }
      });

      mapInstanceRef.current = map;
      // Force Leaflet to recalculate tile positions after container is visible
      setTimeout(() => map.invalidateSize(), 300);
    };
    const timeout = setTimeout(tryInit, 300);
    return () => clearTimeout(timeout);
  }, [modal, mapMode]);

  // Cleanup map on modal close
  useEffect(() => {
    if (!modal) {
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    }
  }, [modal]);

  const geolocate = () => {
    if (!navigator.geolocation) { toast.error(fr ? 'Géolocalisation non disponible' : 'تحديد الموقع غير متاح'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        setForm(f => ({ ...f, latitude: lat, longitude: lng }));
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([Number(lat), Number(lng)], 16);
          const L = (window as any).L;
          if (markerRef.current) {
            markerRef.current.setLatLng([Number(lat), Number(lng)]);
          } else {
            const icon = L.divIcon({ className: '', html: '<div style="background:#006045;width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>', iconSize: [28, 28], iconAnchor: [14, 28] });
            markerRef.current = L.marker([Number(lat), Number(lng)], { icon, draggable: true }).addTo(mapInstanceRef.current);
          }
        }
        setLocating(false);
        toast.success(fr ? 'Position détectée ✓' : 'تم تحديد الموقع ✓');
      },
      (err) => { 
        setLocating(false); 
        toast.error(fr ? `GPS: ${err.message}` : `GPS: ${err.message}`); 
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const save = async () => {
    if (!form.nom.trim()) { toast.error(fr ? 'Nom requis' : 'الاسم مطلوب'); return; }
    setSaving(true);
    try {
      const payload: any = { ...form };
      if (!payload.latitude) { delete payload.latitude; delete payload.longitude; }
      else { payload.latitude = Number(payload.latitude); payload.longitude = Number(payload.longitude); }
      
      if ((form as any).id) {
        await api.patch(`/clients/${(form as any).id}/`, payload);
        toast.success(fr ? 'Client modifié ✓' : 'تم تعديل العميل ✓');
      } else {
        await api.post('/clients/', payload);
        toast.success(fr ? 'Client ajouté ✓' : 'تم إضافة العميل ✓');
      }
      setModal(false); setForm({ ...EMPTY, type_client: clientType }); setMapMode(false);
      loadClients();
    } catch (e: any) {
      const errorMsg = e?.response?.data ? JSON.stringify(e.response.data) : (e.message || 'Erreur inconnue');
      toast.error(`Erreur: ${errorMsg}`);
    } finally {
      setSaving(false);
    }
  };

  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    return !q || c.nom?.toLowerCase().includes(q) || c.phone?.includes(q) || c.adresse?.toLowerCase().includes(q);
  });

  const handleDelete = async (id: number) => {
    if (!window.confirm(fr ? 'Voulez-vous vraiment supprimer ce client ?' : 'هل تريد حقًا حذف هذا العميل؟')) return;
    try {
      await api.delete(`/clients/${id}/`);
      toast.success(fr ? 'Client supprimé' : 'تم حذف العميل');
      loadClients();
    } catch (e: any) {
      toast.error(fr ? 'Erreur lors de la suppression' : 'خطأ أثناء الحذف');
    }
  };

  const openEdit = (client: any) => {
    setForm({
      ...EMPTY,
      ...client,
      type_client: client.type_client || clientType,
      latitude: client.latitude || '',
      longitude: client.longitude || ''
    });
    setMapMode(false);
    setModal(true);
  };

  return (
    <AppLayout allowedRoles={['prevendeur']}>
      <div className="page-header">
        <div>
          <h1>{isGros ? '🏭' : '📦'} {fr ? 'Mes Clients' : 'عملائي'}
            <span style={{ fontSize: '13px', fontWeight: 400, marginLeft: 10, color: isGros ? '#8b5cf6' : '#06b6d4' }}>
              ({isGros ? (fr ? 'Grossistes' : 'جملة') : (fr ? 'Détaillants' : 'تجزئة')})
            </span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
            {filtered.length} {fr ? 'clients' : 'عميل'}
          </p>
        </div>
      </div>

      <div className="search-bar" style={{ marginBottom: '18px' }}>
        <div className="search-input-wrap">
          <Search />
          <input className="form-control" placeholder={fr ? 'Nom, téléphone...' : 'الاسم، الهاتف...'} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><div className="spinner" /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map(c => (
            <div key={c.id} className="app-card">
              <div className="app-card-row">
                <div className="app-card-title">
                  {c.nom}
                  <span className={`badge ${c.type_client === 'gros' ? 'badge-purple' : 'badge-info'}`} style={{ fontSize: '10px' }}>
                    {c.type_client === 'gros' ? '🏭 Gros' : '📦 Détail'}
                  </span>
                </div>
                <div style={{ fontWeight: 800, color: Number(c.solde) < 0 ? '#ef4444' : '#10b981' }}>
                  {Number(c.solde).toLocaleString()} DA
                </div>
              </div>
              <div className="app-card-sub" style={{ marginTop: '4px' }}>
                {c.phone && <span style={{ color: '#3b82f6', fontSize: '12px', fontWeight: 600 }}>📞 {c.phone}</span>}
                {c.phone && c.adresse && ' · '}
                {c.adresse || ''}
              </div>
                <div className="app-card-actions" style={{ marginTop: '12px' }}>
                  <button onClick={() => {
                    if (!c.phone) toast.error(fr ? 'Aucun numéro disponible (non saisi)' : 'لا يوجد رقم هاتف (لم يتم إدخاله)');
                    else window.location.href = `tel:${c.phone.replace(/\s+/g, '')}`;
                  }} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer', opacity: c.phone ? 1 : 0.5 }}>
                    <Phone size={14} /> {fr ? 'Appeler' : 'اتصال'}
                  </button>
                  <button onClick={() => {
                    if (c.latitude && c.longitude) window.location.href = `https://www.google.com/maps?q=${c.latitude},${c.longitude}`;
                    else toast.error(fr ? 'Aucune position GPS disponible' : 'لا يوجد موقع GPS');
                  }} style={{ flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: 'rgba(16,185,129,0.1)', color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', cursor: 'pointer', opacity: (c.latitude && c.longitude) ? 1 : 0.5 }}>
                    <Navigation size={14} /> GPS
                  </button>
                <button onClick={() => openEdit(c)} style={{ width: 36, height: 36, padding: '0', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-elevated)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }} title={fr ? 'Modifier' : 'تعديل'}>
                  <Edit2 size={15} />
                </button>
                <button onClick={() => handleDelete(c.id)} style={{ width: 36, height: 36, padding: '0', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }} title={fr ? 'Supprimer' : 'حذف'}>
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="empty-state">
              <Building2 size={40} style={{ opacity: 0.2, margin: '0 auto 10px' }} />
              <p>{fr ? 'Aucun client trouvé' : 'لا يوجد عملاء'}</p>
            </div>
          )}
        </div>
      )}

      {/* Add Client Modal */}
      {modal && createPortal(
        <div className="modal-overlay" onClick={() => setModal(false)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()} style={{ maxHeight: '92vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', background: 'var(--bg-card)', borderRadius: '16px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            
            {/* Header Fixed */}
            <div style={{ padding: '20px 20px 10px 20px', borderBottom: '1px solid var(--border)' }}>
              <div className="modal-title" style={{ margin: 0 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Building2 size={18} /> {(form as any).id ? (fr ? 'Modifier client' : 'تعديل العميل') : (fr ? 'Nouveau client' : 'عميل جديد')}
                </span>
              </div>
            </div>

            {/* Scrollable Body */}
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              <div className="grid-2">
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">⭐ {fr ? 'Nom du magasin / client' : 'اسم المحل / العميل'}</label>
                  <input className="form-control" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder={fr ? 'Ex: Épicerie El Amine' : 'مثال: بقالة الأمين'} style={{ fontSize: '15px', fontWeight: 600 }} />
                </div>
                <div className="form-group">
                  <label className="form-label">{fr ? 'Type client' : 'نوع العميل'}</label>
                  <select className="form-control" value={form.type_client} disabled={true}>
                    <option value="detail">📦 {fr ? 'Détaillant (Carton)' : 'تجزئة (كرتون)'}</option>
                    <option value="gros">🏭 {fr ? 'Grossiste (Palette)' : 'جملة (مستودع)'}</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label"><Phone size={12} /> {fr ? 'Téléphone' : 'الهاتف'}</label>
                  <input className="form-control" type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="0X XX XX XX XX" />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">{fr ? 'Adresse' : 'العنوان'}</label>
                  <input className="form-control" value={form.adresse} onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))} placeholder={fr ? 'Rue, quartier...' : 'الشارع، الحي...'} />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">{fr ? 'Notes' : 'ملاحظات'}</label>
                  <input className="form-control" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder={fr ? 'Info supplémentaire...' : 'معلومات إضافية...'} />
                </div>
              </div>

            {/* Map Section */}
            <div style={{ border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', marginBottom: '20px' }}>
              <div style={{ padding: '12px 16px', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: mapMode ? '1px solid var(--border)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>
                  <MapPin size={15} color="var(--brand-primary)" />
                  {fr ? 'Position du magasin (optionnel)' : 'موقع المحل (اختياري)'}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {form.latitude && form.longitude && (
                    <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
                      ✓ {Number(form.latitude).toFixed(4)}, {Number(form.longitude).toFixed(4)}
                    </span>
                  )}
                  <button type="button" onClick={geolocate} disabled={locating} style={{
                    display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', borderRadius: '7px',
                    border: '1px solid var(--border)', background: 'var(--bg-surface)', cursor: 'pointer',
                    fontSize: '12px', fontWeight: 600, color: 'var(--brand-primary)', fontFamily: 'inherit',
                  }}>
                    <Navigation size={12} /> {locating ? (fr ? 'Localisation...' : 'جاري...') : (fr ? 'Ma position' : 'موقعي')}
                  </button>
                  <button type="button" onClick={() => setMapMode(v => !v)} style={{
                    display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 10px', borderRadius: '7px',
                    border: `1px solid ${mapMode ? 'var(--brand-primary)' : 'var(--border)'}`,
                    background: mapMode ? 'rgba(0,96,69,0.08)' : 'var(--bg-surface)',
                    cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                    color: mapMode ? 'var(--brand-primary)' : 'var(--text-secondary)', fontFamily: 'inherit',
                  }}>
                    <MapPin size={12} /> {mapMode ? (fr ? 'Masquer carte' : 'إخفاء الخريطة') : (fr ? 'Ouvrir carte' : 'فتح الخريطة')}
                  </button>
                </div>
              </div>

              {mapMode && (
                <>
                  <div ref={mapRef} style={{ height: 280, width: '100%' }} />
                  <div style={{ padding: '8px 16px', background: 'var(--bg-elevated)', fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '16px' }}>
                    <span>🖱️ {fr ? 'Cliquer sur la carte pour placer le marqueur' : 'انقر على الخريطة لوضع العلامة'}</span>
                    <span>✋ {fr ? 'Glisser le marqueur pour ajuster' : 'اسحب العلامة للضبط'}</span>
                  </div>
                  <div style={{ padding: '8px 16px', display: 'flex', gap: '10px' }}>
                    <div className="form-group" style={{ flex: 1, margin: 0 }}>
                      <label className="form-label">Latitude</label>
                      <input className="form-control" type="number" step="0.000001" value={form.latitude}
                        onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))}
                        placeholder="36.737200" style={{ fontFamily: 'monospace', fontSize: '12px' }} />
                    </div>
                    <div className="form-group" style={{ flex: 1, margin: 0 }}>
                      <label className="form-label">Longitude</label>
                      <input className="form-control" type="number" step="0.000001" value={form.longitude}
                        onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))}
                        placeholder="3.086500" style={{ fontFamily: 'monospace', fontSize: '12px' }} />
                    </div>
                  </div>
                </>
              )}
            </div>
            </div>

            {/* Footer Fixed */}
            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: '10px', justifyContent: 'flex-end', background: 'var(--bg-elevated)', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px', flexShrink: 0 }}>
              <button className="btn btn-secondary" onClick={() => setModal(false)}>{fr ? 'Annuler' : 'إلغاء'}</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? <><div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} /></> : <><CheckCircle size={14} /> {fr ? 'Enregistrer client' : 'حفظ العميل'}</>}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* FAB */}
      <button className="fab" onClick={() => { setForm({ ...EMPTY, type_client: clientType }); setMapMode(false); setModal(true); }}>
        <Plus size={24} />
      </button>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AppLayout>
  );
}
