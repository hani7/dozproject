import axios from 'axios';
import API_URL from './config';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000, // 15-second timeout — prevent hanging requests
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-refresh token on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = typeof window !== 'undefined'
        ? localStorage.getItem('refresh_token')
        : null;
      if (refresh) {
        try {
          const res = await axios.post(
            `${API_URL}/auth/refresh/`,
            { refresh },
            { timeout: 10_000 },
          );
          localStorage.setItem('access_token', res.data.access);
          original.headers.Authorization = `Bearer ${res.data.access}`;
          return api(original);
        } catch {
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  },
);

export default api;
