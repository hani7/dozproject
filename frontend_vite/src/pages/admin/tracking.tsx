import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import api from '@/lib/api';
import { useLang } from '@/contexts/LangContext';
import AppLayout from '@/components/AppLayout';

// Fix Leaflet's default icon path issues with Vite
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

// Custom icons
const prevendeurIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const livreurIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface UserLocation {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  role: string;
  latitude: number | null;
  longitude: number | null;
  last_location_update: string | null;
}

export default function TrackingPage() {
  const { lang } = useLang();
  const fr = lang === 'fr';
  const [users, setUsers] = useState<UserLocation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLocations = async () => {
    try {
      const res = await api.get('/auth/users/');
      const mobileUsers = res.data.filter((u: any) => 
        (u.role === 'prevendeur' || u.role === 'livreur') && 
        u.latitude !== null && 
        u.longitude !== null
      );
      setUsers(mobileUsers);
    } catch (err) {
      console.error('Failed to fetch user locations', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
    // Refresh every 30 seconds
    const interval = setInterval(fetchLocations, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <AppLayout allowedRoles={['admin']}>
        <div className="p-4"><div className="spinner" /></div>
      </AppLayout>
    );
  }

  // Default center (Algiers) if no users are active, otherwise center on the first user
  const center: [number, number] = users.length > 0 
    ? [Number(users[0].latitude), Number(users[0].longitude)]
    : [36.7525, 3.04197];

  return (
    <AppLayout allowedRoles={['admin']}>
      <div className="p-4" style={{ height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column' }}>
      <div className="flex-between" style={{ marginBottom: '16px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800 }}>
          {fr ? 'Suivi GPS en Temps Réel' : 'التتبع المباشر عبر نظام تحديد المواقع'}
        </h1>
        <button onClick={fetchLocations} className="btn btn-primary btn-sm">
          {fr ? 'Actualiser' : 'تحديث'}
        </button>
      </div>

      <div style={{ 
        flex: 1, 
        position: 'relative', 
        borderRadius: '16px', 
        overflow: 'hidden', 
        border: '6px solid var(--bg-surface)', 
        boxShadow: '0 12px 32px rgba(0,0,0,0.15)', 
        zIndex: 0,
        background: '#e5e7eb'
      }}>
        <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.google.com/intl/en_US/help/terms_maps.html">Google Maps</a>'
            url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
          />
          {users.map(user => (
            <Marker 
              key={user.id} 
              position={[Number(user.latitude), Number(user.longitude)]}
              icon={user.role === 'livreur' ? livreurIcon : prevendeurIcon}
            >
              <Popup>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 800, fontSize: '14px', marginBottom: '4px' }}>
                    {user.first_name} {user.last_name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'capitalize', marginBottom: '8px' }}>
                    {user.role}
                  </div>
                  <div style={{ fontSize: '11px', color: '#666' }}>
                    {fr ? 'Dernière mise à jour :' : 'آخر تحديث:'} <br />
                    {user.last_location_update ? new Date(user.last_location_update).toLocaleString() : 'N/A'}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      
      <div style={{ marginTop: '12px', display: 'flex', gap: '16px', fontSize: '13px', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png" alt="Prevendeur" style={{ height: 20 }} />
          <span>Prévendeur</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png" alt="Livreur" style={{ height: 20 }} />
          <span>Livreur</span>
        </div>
      </div>
    </div>
    </AppLayout>
  );
}
