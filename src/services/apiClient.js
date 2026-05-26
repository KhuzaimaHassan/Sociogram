/**
 * apiClient — single entry point for talking to the Sociogram backend.
 *
 * Responsibilities:
 *   - read base URL from VITE_API_URL (fallback to http://localhost:3001)
 *   - attach JWT access token to every authenticated request
 *   - on 401 with TOKEN_EXPIRED, transparently refresh and retry once
 *   - normalize errors into ApiError instances
 */

const BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:3001';

const ACCESS_KEY = 'sociogram_access_token';
const REFRESH_KEY = 'sociogram_refresh_token';

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export const tokenStore = {
  getAccess() {
    return localStorage.getItem(ACCESS_KEY);
  },
  getRefresh() {
    return localStorage.getItem(REFRESH_KEY);
  },
  set({ accessToken, refreshToken }) {
    if (accessToken) localStorage.setItem(ACCESS_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

/** Build a media URL for files served from the backend /uploads dir. */
export function mediaUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

/** Single in-flight refresh promise so concurrent 401s only refresh once. */
let refreshInFlight = null;

async function refreshAccessToken() {
  if (refreshInFlight) return refreshInFlight;

  const refreshToken = tokenStore.getRefresh();
  if (!refreshToken) throw new ApiError('No refresh token', 401, 'NO_REFRESH');

  refreshInFlight = fetch(`${BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
    .then(async (res) => {
      if (!res.ok) {
        tokenStore.clear();
        throw new ApiError('Session expired', 401, 'REFRESH_FAILED');
      }
      const data = await res.json();
      tokenStore.set(data);
      return data.accessToken;
    })
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
}

async function rawRequest(path, { method = 'GET', body, headers = {}, auth = true, isForm = false } = {}) {
  const finalHeaders = { ...headers };

  if (!isForm && body && !(body instanceof FormData)) {
    finalHeaders['Content-Type'] = 'application/json';
  }

  if (auth) {
    const token = tokenStore.getAccess();
    if (token) finalHeaders['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: finalHeaders,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json().catch(() => null);
  }

  if (!res.ok) {
    const code = data?.code || null;
    const message = data?.error || data?.message || `Request failed (${res.status})`;
    throw new ApiError(message, res.status, code);
  }

  return data;
}

export async function request(path, options = {}) {
  try {
    return await rawRequest(path, options);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401 && err.code === 'TOKEN_EXPIRED' && options.auth !== false) {
      try {
        await refreshAccessToken();
        return await rawRequest(path, options);
      } catch (refreshErr) {
        tokenStore.clear();
        throw refreshErr;
      }
    }
    throw err;
  }
}

export const api = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
  delete: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
  postForm: (path, formData, opts) =>
    request(path, { ...opts, method: 'POST', body: formData, isForm: true }),
};

export const API_BASE_URL = BASE_URL;
