import axios from 'axios';
import API_URL from './config';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000, // 15-second timeout — prevent hanging requests
});

// Attach JWT token to every request
// Checks localStorage first (remember me), then sessionStorage (session only)
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token =
      localStorage.getItem('access_token') ??
      sessionStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh token on 401
// Skip refresh attempts on the login endpoint itself (wrong credentials)
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const isLoginRequest = original?.url?.includes('/auth/login/');
    if (error.response?.status === 401 && !original._retry && !isLoginRequest) {
      original._retry = true;
      const refresh = typeof window !== 'undefined'
        ? (localStorage.getItem('refresh_token') ?? sessionStorage.getItem('refresh_token'))
        : null;
      if (refresh) {
        try {
          const res = await axios.post(
            `${API_URL}/auth/refresh/`,
            { refresh },
            { timeout: 10_000 },
          );
          // Persist refreshed token in whichever storage has the original
          const store = localStorage.getItem('refresh_token') ? localStorage : sessionStorage;
          store.setItem('access_token', res.data.access);
          original.headers.Authorization = `Bearer ${res.data.access}`;
          return api(original);
        } catch {
          localStorage.clear();
          sessionStorage.clear();
          window.location.href = '/login';
        }
      } else {
        // No refresh token at all — force re-login cleanly
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;
