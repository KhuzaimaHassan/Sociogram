import { api, tokenStore } from './apiClient';

export async function register({ username, email, password, displayName }) {
  const data = await api.post(
    '/api/auth/register',
    { username, email, password, displayName },
    { auth: false }
  );
  tokenStore.set(data);
  return data;
}

export async function login({ email, password }) {
  const data = await api.post('/api/auth/login', { email, password }, { auth: false });
  tokenStore.set(data);
  return data;
}

export async function getMe() {
  return api.get('/api/auth/me');
}

export function logout() {
  tokenStore.clear();
}
