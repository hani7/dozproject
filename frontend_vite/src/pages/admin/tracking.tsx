import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip } from 'react-leaflet';
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

interface HistoryPoint {
  latitude: number;
  longitude: number;
  timestamp: string;
}

const REFRESH_INTERVAL = 5; // seconds

export default function TrackingPage() {
  const { lang } = useLang();
  const fr = lang === 'fr';
  const [users, setUsers] = useState<UserLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const [refreshing, setRefreshing] = useState(false);

  // History Mode State
  const [mode, setMode] = useState<'live' | 'history'>('live');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [historyPoints, setHistoryPoints] = useState<HistoryPoint[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const intervalRef = useRef<any>(null);
  const countdownRef = useRef<any>(null);

  const fetchLocations = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const res = await api.get('/auth/users/');
      const userData = Array.isArray(res.data) ? res.data : (res.data.results || []);

      const mobileUsers = userData.filter((u: any) =>
        (u.role === 'prevendeur' || u.role === 'livreur')
      );

      const validLiveUsers = mobileUsers.filter((u: any) =>
        u.latitude != null && u.latitude !== "" && !isNaN(Number(u.latitude)) &&
        u.longitude != null && u.longitude !== "" && !isNaN(Number(u.longitude))
      );

      setUsers(mode === 'live' ? validLiveUsers : mobileUsers);
      setLastRefresh(new Date());
      setCountdown(REFRESH_INTERVAL);
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [mode]);

  const fetchHistory = async () => {
    if (!selectedUserId || !selectedDate) return;
    setLoadingHistory(true);
    try {
      const res = await api.get(`/auth/users/${selectedUserId}/history/?date=${selectedDate}`);
      setHistoryPoints(res.data);
    } catch (err) {
      console.error('Failed to fetch history', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Auto-refresh every 5 seconds in live mode
  useEffect(() => {
    fetchLocations(false);

    if (mode === 'live') {
      // Main data refresh every 5s
      intervalRef.current = setInterval(() => fetchLocations(true), REFRESH_INTERVAL * 1000);

      // Countdown tick every second
      countdownRef.current = setInterval(() => {
        setCountdown(prev => (prev <= 1 ? REFRESH_INTERVAL : prev - 1));
      }, 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [mode]);

  useEffect(() => {
    if (mode === 'history') {
      fetchHistory();
    }
  }, [mode, selectedUserId, selectedDate]);

  if (loading) {
    return (
      <AppLayout allowedRoles={['admin']}>
        <div className="p-4"><div className="spinner" /></div>
      </AppLayout>
    );
  }

  // Determine map center
  let center: [number, number] = [36.7525, 3.04197];
  if (mode === 'live' && users.length > 0) {
    const liveU = users.find(u => u.latitude != null);
    if (liveU) center = [Number(liveU.latitude), Number(liveU.longitude)];
  } else if (mode === 'history' && historyPoints.length > 0) {
    center = [Number(historyPoints[0].latitude), Number(historyPoints[0].longitude)];
  }

  return (
    <AppLayout allowedRoles={['admin']}>
      <div className="p-4" style={{ height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column' }}>

      <div className="flex-between" style={{ marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 800 }}>
            {fr ? 'Suivi GPS' : 'التتبع المباشر'}
          </h1>
          {/* LIVE indicator */}
          {mode === 'live' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '20px', padding: '3px 10px' }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%', background: '#ef4444',
                boxShadow: '0 0 0 0 rgba(239,68,68,0.4)',
                animation: 'livePulse 1.5s infinite',
                display: 'inline-block'
              }} />
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#ef4444', letterSpacing: '1px' }}>LIVE</span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: 'var(--bg-elevated)', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <button
              onClick={() => setMode('live')}
              style={{
                padding: '6px 16px', border: 'none', fontSize: '13px', fontWeight: 600,
                background: mode === 'live' ? '#6366f1' : 'transparent',
                color: mode === 'live' ? 'white' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              {fr ? 'Temps Réel' : 'مباشر'}
            </button>
            <button
              onClick={() => setMode('history')}
              style={{
                padding: '6px 16px', border: 'none', fontSize: '13px', fontWeight: 600,
                background: mode === 'history' ? '#6366f1' : 'transparent',
                color: mode === 'history' ? 'white' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              {fr ? 'Historique' : 'سجل'}
            </button>
          </div>

          {mode === 'history' && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                className="form-control"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                style={{ padding: '6px 12px', fontSize: '13px', height: 'auto' }}
              >
                <option value="">{fr ? '-- Choisir Utilisateur --' : '-- اختر المستخدم --'}</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.role})</option>
                ))}
              </select>
              <input
                type="date"
                className="form-control"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ padding: '6px 12px', fontSize: '13px', height: 'auto' }}
              />
            </div>
          )}

          {mode === 'live' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* Countdown ring */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '8px', padding: '5px 10px' }}>
                <svg width="18" height="18" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--border)" strokeWidth="3.8" />
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#6366f1" strokeWidth="3.8"
                    strokeDasharray={`${(countdown / REFRESH_INTERVAL) * 100} 100`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 0.9s linear' }}
                  />
                </svg>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', minWidth: 14 }}>
                  {countdown}s
                </span>
              </div>

              <button
                onClick={() => fetchLocations(false)}
                disabled={refreshing}
                className="btn btn-primary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {refreshing
                  ? <><span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} /></>
                  : '↻'
                }
                {fr ? 'Actualiser' : 'تحديث'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Last refresh info bar */}
      {mode === 'live' && lastRefresh && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
          <span>🔄 {fr ? 'Dernière mise à jour :' : 'آخر تحديث :'} <strong>{lastRefresh.toLocaleTimeString()}</strong></span>
          <span>·</span>
          <span>{users.length} {fr ? 'agent(s) en ligne' : 'عون(ات) متصل'}</span>
          <span>·</span>
          <span style={{ color: '#10b981', fontWeight: 600 }}>
            {fr ? `Rafraîchissement auto toutes les ${REFRESH_INTERVAL}s` : `تحديث تلقائي كل ${REFRESH_INTERVAL} ث`}
          </span>
        </div>
      )}

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
          {mode === 'live' && users.filter(u => u.latitude != null).map(user => (
            <Marker
              key={user.id}
              position={[Number(user.latitude), Number(user.longitude)]}
              icon={user.role === 'livreur' ? livreurIcon : prevendeurIcon}
            >
              <Tooltip permanent direction="bottom" offset={[0, 5]} opacity={0.9} className="marker-name-tooltip">
                <span style={{ fontWeight: 'bold', color: user.role === 'livreur' ? '#dc2626' : '#2563eb' }}>
                  {user.first_name}
                </span>
              </Tooltip>
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

          {mode === 'history' && historyPoints.length > 0 && (
            <>
              <Polyline
                positions={historyPoints.map(p => [Number(p.latitude), Number(p.longitude)])}
                color="#6366f1"
                weight={5}
                opacity={0.7}
              />
              <Marker
                position={[Number(historyPoints[0].latitude), Number(historyPoints[0].longitude)]}
                icon={prevendeurIcon}
              >
                <Tooltip permanent direction="bottom" offset={[0, 5]}>
                  <span style={{ fontWeight: 'bold' }}>Départ</span>
                </Tooltip>
                <Popup>Départ: {new Date(historyPoints[0].timestamp).toLocaleTimeString()}</Popup>
              </Marker>
              <Marker
                position={[Number(historyPoints[historyPoints.length - 1].latitude), Number(historyPoints[historyPoints.length - 1].longitude)]}
                icon={livreurIcon}
              >
                <Tooltip permanent direction="bottom" offset={[0, 5]}>
                  <span style={{ fontWeight: 'bold' }}>Arrivée</span>
                </Tooltip>
                <Popup>Dernière position: {new Date(historyPoints[historyPoints.length - 1].timestamp).toLocaleTimeString()}</Popup>
              </Marker>
            </>
          )}
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

    <style>{`
      @keyframes livePulse {
        0%   { box-shadow: 0 0 0 0 rgba(239,68,68,0.5); }
        70%  { box-shadow: 0 0 0 8px rgba(239,68,68,0); }
        100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
      }
      @keyframes spin { to { transform: rotate(360deg); } }
    `}</style>
    </AppLayout>
  );
}

import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip } from 'react-leaflet';
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

interface HistoryPoint {
  latitude: number;
  longitude: number;
  timestamp: string;
}

export default function TrackingPage() {
  const { lang } = useLang();
  const fr = lang === 'fr';
  const [users, setUsers] = useState<UserLocation[]>([]);
  const [loading, setLoading] = useState(true);
  
  // History Mode State
  const [mode, setMode] = useState<'live' | 'history'>('live');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [historyPoints, setHistoryPoints] = useState<HistoryPoint[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchLocations = async () => {
    try {
      const res = await api.get('/auth/users/');
      const userData = Array.isArray(res.data) ? res.data : (res.data.results || []);
      
      const mobileUsers = userData.filter((u: any) => 
        (u.role === 'prevendeur' || u.role === 'livreur')
      );
      
      const validLiveUsers = mobileUsers.filter((u: any) => 
        u.latitude != null && u.latitude !== "" && !isNaN(Number(u.latitude)) &&
        u.longitude != null && u.longitude !== "" && !isNaN(Number(u.longitude))
      );
      
      setUsers(mode === 'live' ? validLiveUsers : mobileUsers); // Keep all mobileUsers in state for the dropdown
    } catch (err) {
      console.error('Failed to fetch users', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    if (!selectedUserId || !selectedDate) return;
    setLoadingHistory(true);
    try {
      const res = await api.get(`/auth/users/${selectedUserId}/history/?date=${selectedDate}`);
      setHistoryPoints(res.data);
    } catch (err) {
      console.error('Failed to fetch history', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchLocations();
    let interval: any;
    if (mode === 'live') {
      interval = setInterval(fetchLocations, 30000);
    }
    return () => {
      if (interval) clearInterval(interval);
    }
  }, [mode]);

  useEffect(() => {
    if (mode === 'history') {
      fetchHistory();
    }
  }, [mode, selectedUserId, selectedDate]);

  if (loading) {
    return (
      <AppLayout allowedRoles={['admin']}>
        <div className="p-4"><div className="spinner" /></div>
      </AppLayout>
    );
  }

  // Determine map center
  let center: [number, number] = [36.7525, 3.04197];
  if (mode === 'live' && users.length > 0) {
    const liveU = users.find(u => u.latitude != null);
    if (liveU) center = [Number(liveU.latitude), Number(liveU.longitude)];
  } else if (mode === 'history' && historyPoints.length > 0) {
    center = [Number(historyPoints[0].latitude), Number(historyPoints[0].longitude)];
  }

  return (
    <AppLayout allowedRoles={['admin']}>
      <div className="p-4" style={{ height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column' }}>
      
      <div className="flex-between" style={{ marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800 }}>
          {fr ? 'Suivi GPS' : 'التتبع المباشر'}
        </h1>
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: 'var(--bg-elevated)', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <button 
              onClick={() => setMode('live')}
              style={{ 
                padding: '6px 16px', border: 'none', fontSize: '13px', fontWeight: 600,
                background: mode === 'live' ? '#6366f1' : 'transparent',
                color: mode === 'live' ? 'white' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              {fr ? 'Temps Réel' : 'مباشر'}
            </button>
            <button 
              onClick={() => setMode('history')}
              style={{ 
                padding: '6px 16px', border: 'none', fontSize: '13px', fontWeight: 600,
                background: mode === 'history' ? '#6366f1' : 'transparent',
                color: mode === 'history' ? 'white' : 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              {fr ? 'Historique' : 'سجل'}
            </button>
          </div>

          {mode === 'history' && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <select 
                className="form-control" 
                value={selectedUserId} 
                onChange={(e) => setSelectedUserId(e.target.value)}
                style={{ padding: '6px 12px', fontSize: '13px', height: 'auto' }}
              >
                <option value="">{fr ? '-- Choisir Utilisateur --' : '-- اختر المستخدم --'}</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.first_name} {u.last_name} ({u.role})</option>
                ))}
              </select>
              <input 
                type="date" 
                className="form-control" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ padding: '6px 12px', fontSize: '13px', height: 'auto' }}
              />
            </div>
          )}

          {mode === 'live' && (
            <button onClick={fetchLocations} className="btn btn-primary btn-sm">
              {fr ? 'Actualiser' : 'تحديث'}
            </button>
          )}
        </div>
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
          {mode === 'live' && users.filter(u => u.latitude != null).map(user => (
            <Marker 
              key={user.id} 
              position={[Number(user.latitude), Number(user.longitude)]}
              icon={user.role === 'livreur' ? livreurIcon : prevendeurIcon}
            >
              <Tooltip permanent direction="bottom" offset={[0, 5]} opacity={0.9} className="marker-name-tooltip">
                <span style={{ fontWeight: 'bold', color: user.role === 'livreur' ? '#dc2626' : '#2563eb' }}>
                  {user.first_name}
                </span>
              </Tooltip>
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

          {mode === 'history' && historyPoints.length > 0 && (
            <>
              <Polyline 
                positions={historyPoints.map(p => [Number(p.latitude), Number(p.longitude)])} 
                color="#6366f1" 
                weight={5} 
                opacity={0.7} 
              />
              <Marker 
                position={[Number(historyPoints[0].latitude), Number(historyPoints[0].longitude)]}
                icon={prevendeurIcon}
              >
                <Tooltip permanent direction="bottom" offset={[0, 5]}>
                  <span style={{ fontWeight: 'bold' }}>Départ</span>
                </Tooltip>
                <Popup>Départ: {new Date(historyPoints[0].timestamp).toLocaleTimeString()}</Popup>
              </Marker>
              <Marker 
                position={[Number(historyPoints[historyPoints.length - 1].latitude), Number(historyPoints[historyPoints.length - 1].longitude)]}
                icon={livreurIcon}
              >
                <Tooltip permanent direction="bottom" offset={[0, 5]}>
                  <span style={{ fontWeight: 'bold' }}>Arrivée</span>
                </Tooltip>
                <Popup>Dernière position: {new Date(historyPoints[historyPoints.length - 1].timestamp).toLocaleTimeString()}</Popup>
              </Marker>
            </>
          )}
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
