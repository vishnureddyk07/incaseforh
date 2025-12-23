import React, { createContext, useContext, useState, useEffect } from 'react';
import type { AuthState, User } from '../types/auth';

interface AuthContextType extends AuthState {
  login: (user: User, token?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    token: null,
  });

  useEffect(() => {
    // Check for stored auth state
    const stored = localStorage.getItem('auth');
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as AuthState;
        if (parsed.user && parsed.token) {
          setAuthState({ user: parsed.user, token: parsed.token, isAuthenticated: true });
        }
      } catch (e) {
        localStorage.removeItem('auth');
      }
    }
  }, []);

  const login = (user: User, token?: string) => {
    const payload = { user, token: token || null, isAuthenticated: true } as AuthState;
    localStorage.setItem('auth', JSON.stringify(payload));
    setAuthState(payload);
  };

  const logout = () => {
    localStorage.removeItem('auth');
    setAuthState({ user: null, isAuthenticated: false, token: null });
  };

  return (
    <AuthContext.Provider value={{ ...authState, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}