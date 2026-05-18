import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import type { AuthUser, UserRole } from '@/lib/types';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

function readStoredUser(): AuthUser | null {
  try {
    const stored = localStorage.getItem('auth_user');
    return stored ? (JSON.parse(stored) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const login = useCallback(async (username: string, password: string) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login/', { username, password });
      const userData: AuthUser = {
        ...res.data,
        specialite: res.data.specialite || 'les_deux',
      };
      localStorage.setItem('access_token', userData.access);
      localStorage.setItem('refresh_token', userData.refresh);
      localStorage.setItem('auth_user', JSON.stringify(userData));
      setUser(userData);

      if (userData.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (userData.role === 'prevendeur') {
        navigate(
          userData.specialite === 'gros'
            ? '/prevendeur/commande-gros'
            : '/prevendeur/commande-detail'
        );
      } else if (userData.role === 'livreur') {
        navigate('/livreur/livraisons');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const logout = useCallback(() => {
    localStorage.clear();
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
