import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import type { AuthUser, UserRole } from '@/lib/types';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => void;
  isRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Check localStorage (remember me) first, then sessionStorage (session only)
function getStorage(): Storage {
  return localStorage.getItem('auth_user') ? localStorage : sessionStorage;
}

function readStoredUser(): AuthUser | null {
  try {
    const stored =
      localStorage.getItem('auth_user') ??
      sessionStorage.getItem('auth_user');
    return stored ? (JSON.parse(stored) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const login = useCallback(async (username: string, password: string, rememberMe = false) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login/', { username, password });
      const userData: AuthUser = {
        ...res.data,
        specialite: res.data.specialite || 'les_deux',
      };
      // Use localStorage for persistent sessions, sessionStorage for tab-only sessions
      const store = rememberMe ? localStorage : sessionStorage;
      store.setItem('access_token', userData.access);
      store.setItem('refresh_token', userData.refresh);
      store.setItem('auth_user', JSON.stringify(userData));
      setUser(userData);

      if (userData.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (userData.role === 'prevendeur') {
        if (userData.specialite === 'gros') {
          navigate('/prevendeur/commande-gros');
        } else if (userData.specialite === 'detail') {
          navigate('/prevendeur/commande-detail');
        } else {
          // les_deux: land on a neutral overview page
          navigate('/prevendeur/mes-commandes');
        }
      } else if (userData.role === 'livreur') {
        navigate('/livreur/livraisons');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const logout = useCallback(() => {
    localStorage.clear();
    sessionStorage.clear();
    setUser(null);
    navigate('/login');
  }, [navigate]);

  const isRole = useCallback(
    (...roles: UserRole[]) => !!user && roles.includes(user.role),
    [user],
  );

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
