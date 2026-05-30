// Sociogram Mobile — API service
// Connects to the live Render backend

const BASE_URL = 'https://sociogram-api-rt4f.onrender.com';

const ACCESS_KEY  = 'sg_access_token';
const REFRESH_KEY = 'sg_refresh_token';

import AsyncStorage from '@react-native-async-storage/async-storage';

export const tokenStore = {
  async getAccess()  { return AsyncStorage.getItem(ACCESS_KEY);  },
  async getRefresh() { return AsyncStorage.getItem(REFRESH_KEY); },
  async set({ accessToken, refreshToken }) {
    if (accessToken)  await AsyncStorage.setItem(ACCESS_KEY,  accessToken);
    if (refreshToken) await AsyncStorage.setItem(REFRESH_KEY, refreshToken);
  },
  async clear() {
    await AsyncStorage.removeItem(ACCESS_KEY);
    await AsyncStorage.removeItem(REFRESH_KEY);
  },
};

/** Build a full media URL from a relative path or Cloudinary URL */
export function mediaUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

let refreshInFlight = null;

async function refreshAccessToken() {
  if (refreshInFlight) return refreshInFlight;
  const refreshToken = await tokenStore.getRefresh();
  if (!refreshToken) throw new Error('No refresh token');

  refreshInFlight = fetch(`${BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
    .then(async (res) => {
      if (!res.ok) { await tokenStore.clear(); throw new Error('Session expired'); }
      const data = await res.json();
      await tokenStore.set(data);
      return data.accessToken;
    })
    .finally(() => { refreshInFlight = null; });

  return refreshInFlight;
}

async function rawRequest(path, { method = 'GET', body, auth = true, isForm = false } = {}) {
  const headers = {};
  if (!isForm && body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (auth) {
    const token = await tokenStore.getAccess();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.error || data?.message || `Request failed (${res.status})`);
  }
  return data;
}

export async function request(path, options = {}) {
  try {
    return await rawRequest(path, options);
  } catch (err) {
    if (err.message?.includes('Token expired') && options.auth !== false) {
      await refreshAccessToken();
      return rawRequest(path, options);
    }
    throw err;
  }
}

export const api = {
  get:    (path, opts) => request(path, { ...opts, method: 'GET' }),
  post:   (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  put:    (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  patch:  (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
  delete: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
};
