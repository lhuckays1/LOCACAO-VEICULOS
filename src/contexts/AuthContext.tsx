import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Company, Role } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  company: Company | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  hasRole: (allowedRoles: Role[]) => boolean;
  loginAsDemo: (role: Role) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function checkAuth() {
      const token = localStorage.getItem('frota_access_token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const data = await api.auth.me();
        setUser(data.user);
        setCompany(data.company);
      } catch {
        localStorage.removeItem('frota_access_token');
        localStorage.removeItem('frota_refresh_token');
        setUser(null);
        setCompany(null);
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const data = await api.auth.login({ email, password });
    localStorage.setItem('frota_access_token', data.accessToken);
    localStorage.setItem('frota_refresh_token', data.refreshToken);
    setUser(data.user);
    setCompany(data.company);
  };

  const register = async (formData: any) => {
    const data = await api.auth.register(formData);
    localStorage.setItem('frota_access_token', data.accessToken);
    localStorage.setItem('frota_refresh_token', data.refreshToken);
    setUser(data.user);
    setCompany(data.company);
  };

  const logout = () => {
    try {
      api.auth.logout();
    } catch {
      // Ignore
    }
    localStorage.removeItem('frota_access_token');
    localStorage.removeItem('frota_refresh_token');
    setUser(null);
    setCompany(null);
  };

  const hasRole = (allowedRoles: Role[]): boolean => {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  };

  const loginAsDemo = async (role: Role) => {
    const emailMap: Record<Role, string> = {
      SUPER_ADMIN: 'lucassilvaluiz98@gmail.com',
      ADMIN: 'admin@frotacrm.com.br',
      MANAGER: 'gerente@frotacrm.com.br',
      OPERATOR: 'operador@frotacrm.com.br',
      FINANCIAL: 'financeiro@frotacrm.com.br',
    };
    await login(emailMap[role], 'admin123');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        company,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        hasRole,
        loginAsDemo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
