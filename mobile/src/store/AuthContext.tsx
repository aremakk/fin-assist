import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api';
import { setUnauthorizedHandler, tokenStorage } from '../api/client';
import type { User } from '../types';
import { getErrorMessage } from '../utils/format';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));

    (async () => {
      try {
        const token = await tokenStorage.getAccess();
        if (!token) {
          setLoading(false);
          return;
        }
        const me = await authApi.me();
        setUser(me);
      } catch {
        await tokenStorage.clear();
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      setUser,
      async login(email, password) {
        try {
          const data = await authApi.login({ email: email.trim(), password });
          await tokenStorage.setTokens(data.accessToken, data.refreshToken);
          setUser(data.user);
        } catch (error) {
          throw new Error(getErrorMessage(error, 'Не удалось войти'));
        }
      },
      async register(email, password, displayName) {
        try {
          const data = await authApi.register({
            email: email.trim(),
            password,
            displayName: displayName.trim(),
          });
          await tokenStorage.setTokens(data.accessToken, data.refreshToken);
          setUser(data.user);
        } catch (error) {
          throw new Error(getErrorMessage(error, 'Не удалось зарегистрироваться'));
        }
      },
      async logout() {
        await tokenStorage.clear();
        setUser(null);
      },
      async refreshProfile() {
        const me = await authApi.me();
        setUser(me);
      },
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
