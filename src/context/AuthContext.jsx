import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as authApi from '../services/authService';
import { tokenStore, ApiError } from '../services/apiClient';

// ─── DEMO MODE ────────────────────────────────────────────
// Set to true to bypass backend and run with mock data only.
// The app is fully functional in demo mode — all UI, reactions,
// likes, and comments work client-side. Set to false once the
// backend is up and running.
const DEMO_MODE = false;

const DEMO_USER = {
  id: 'demo-user-1',
  username: 'demo.user',
  email: 'demo@sociogram.app',
  displayName: 'Demo User',
  avatar: '😎',
  bio: '👋 Exploring Sociogram!',
  _count: { posts: 12, followers: 42, following: 18 },
};
// ──────────────────────────────────────────────────────────

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(DEMO_MODE ? DEMO_USER : null);
  const [isInitializing, setIsInitializing] = useState(!DEMO_MODE);
  const [isAuthenticated, setIsAuthenticated] = useState(DEMO_MODE);

  useEffect(() => {
    if (DEMO_MODE) return; // Skip bootstrap in demo mode

    let cancelled = false;
    async function bootstrap() {
      const token = tokenStore.getAccess();
      if (!token) {
        if (!cancelled) setIsInitializing(false);
        return;
      }
      try {
        const me = await authApi.getMe();
        if (cancelled) return;
        setUser(me);
        setIsAuthenticated(true);
      } catch {
        tokenStore.clear();
      } finally {
        if (!cancelled) setIsInitializing(false);
      }
    }
    bootstrap();
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (credentials) => {
    if (DEMO_MODE) {
      setUser(DEMO_USER);
      setIsAuthenticated(true);
      return DEMO_USER;
    }
    const data = await authApi.login(credentials);
    setUser(data.user);
    setIsAuthenticated(true);
    return data.user;
  }, []);

  const register = useCallback(async (payload) => {
    if (DEMO_MODE) {
      const u = { ...DEMO_USER, username: payload.username, displayName: payload.displayName || payload.username };
      setUser(u);
      setIsAuthenticated(true);
      return u;
    }
    const data = await authApi.register(payload);
    setUser(data.user);
    setIsAuthenticated(true);
    return data.user;
  }, []);

  const refreshMe = useCallback(async () => {
    if (DEMO_MODE) return user;
    try {
      const me = await authApi.getMe();
      setUser(me);
      return me;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        tokenStore.clear();
        setUser(null);
        setIsAuthenticated(false);
      }
      throw err;
    }
  }, [user]);

  const logout = useCallback(() => {
    if (!DEMO_MODE) authApi.logout();
    setUser(DEMO_MODE ? DEMO_USER : null);
    setIsAuthenticated(DEMO_MODE);
  }, []);

  const value = {
    user,
    isAuthenticated,
    isInitializing,
    isDemo: DEMO_MODE,
    login,
    register,
    logout,
    refreshMe,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export default AuthContext;
