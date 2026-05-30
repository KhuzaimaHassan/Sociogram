import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, tokenStore } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on launch
  useEffect(() => {
    async function restore() {
      try {
        const token = await tokenStore.getAccess();
        if (token) {
          const me = await api.get('/api/auth/me');
          setUser(me);
        }
      } catch {
        await tokenStore.clear();
      } finally {
        setLoading(false);
      }
    }
    restore();
  }, []);

  async function login({ email, password }) {
    const data = await api.post('/api/auth/login', { email, password }, { auth: false });
    await tokenStore.set(data);
    setUser(data.user);
    return data.user;
  }

  async function register({ username, email, password, displayName }) {
    const data = await api.post('/api/auth/register', { username, email, password, displayName }, { auth: false });
    await tokenStore.set(data);
    setUser(data.user);
    return data.user;
  }

  async function logout() {
    await tokenStore.clear();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
