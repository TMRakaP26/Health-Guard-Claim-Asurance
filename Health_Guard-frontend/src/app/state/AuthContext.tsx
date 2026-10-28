import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import apiClient from '../api/client';
import { addQuickUser } from '../utils/cookies';

interface User {
  id: number;
  name: string;
  username?: string;
  email: string;
  role: 'client' | 'analyst';
  phone?: string;
  address?: string;
  profile_photo?: string | null;
  date_of_birth?: string | null;
  bpjs_number?: string | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role?: string, dateOfBirth?: string, bpjsNumber?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('auth_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        // Invalid saved user data
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const response = await apiClient.post('/login', { email, password });
    const { user: userData, token: newToken } = response.data;
    setUser(userData);
    setToken(newToken);
    localStorage.setItem('auth_token', newToken);
    localStorage.setItem('auth_user', JSON.stringify(userData));
    saveQuickUserCookie(userData, password);
  };

  const register = async (name: string, email: string, password: string, role?: string, dateOfBirth?: string, bpjsNumber?: string) => {
    const payload: Record<string, any> = { name, email, password, role };
    if (dateOfBirth) payload.date_of_birth = dateOfBirth;
    if (bpjsNumber) payload.bpjs_number = bpjsNumber;
    const response = await apiClient.post('/register', payload);
    const { user: userData, token: newToken } = response.data;
    setUser(userData);
    setToken(newToken);
    localStorage.setItem('auth_token', newToken);
    localStorage.setItem('auth_user', JSON.stringify(userData));
    saveQuickUserCookie(userData, password);
  };

  const logout = async () => {
    try {
      await apiClient.post('/logout');
    } catch {
      // Ignore errors on logout
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  };

  const refreshUser = async () => {
    try {
      const response = await apiClient.get('/user');
      const userData = response.data;
      setUser(userData);
      localStorage.setItem('auth_user', JSON.stringify(userData));
    } catch {
      // Ignore errors
    }
  };

  function saveQuickUserCookie(userData: User, password?: string) {
    addQuickUser({
      name: userData.name,
      email: userData.email,
      role: userData.role,
      password: password || '',
    });
  }

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isLoading,
      login,
      register,
      logout,
      refreshUser,
      isAuthenticated: !!token && !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
