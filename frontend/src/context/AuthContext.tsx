import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { authApi } from '../services/api';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => Promise<void>;
  setToken: (token: string) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) { setIsLoading(false); return; }
    try {
      const res = await authApi.getMe();
      setUser(res.data.user);
    } catch {
      localStorage.removeItem('auth_token');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchUser(); }, [fetchUser]);

  const login = () => {
    window.location.href = authApi.getLoginUrl();
  };

  const logout = async () => {
    try {
      const res = await authApi.logout();
      localStorage.removeItem('auth_token');
      setUser(null);
      if (res.data.logoutUrl) {
        window.location.href = res.data.logoutUrl;
      } else {
        window.location.href = '/login';
      }
    } catch {
      localStorage.removeItem('auth_token');
      setUser(null);
      window.location.href = '/login';
    }
  };

  const setToken = useCallback((token: string) => {
    localStorage.setItem('auth_token', token);
    fetchUser();
  }, [fetchUser]);

  return (
    <AuthContext.Provider value={{
      user, isLoading, isAuthenticated: !!user, login, logout, setToken
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
