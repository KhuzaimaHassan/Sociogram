import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { api, tokenStore } from './apiClient';

const response = (data, status = 200) => ({ ok: status < 400, status,
  headers: { get: () => 'application/json' }, json: async () => data });
const expired = () => response({ code: 'TOKEN_EXPIRED' }, 401);
const pair = { accessToken: 'qa-access', refreshToken: 'qa-refresh' };
beforeEach(() => { localStorage.clear(); tokenStore.set(pair); vi.stubGlobal('fetch', vi.fn()); });
afterEach(() => vi.unstubAllGlobals());

it.each(['network', '503', 'invalid JSON', 'missing token'])('preserves the session when refresh fails with %s', async failure => {
  fetch.mockResolvedValueOnce(expired());
  if (failure === 'network') fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
  if (failure === '503') fetch.mockResolvedValueOnce(response({}, 503));
  if (failure === 'invalid JSON') fetch.mockResolvedValueOnce({ ok: true, json: async () => { throw new SyntaxError('Bad JSON'); } });
  if (failure === 'missing token') fetch.mockResolvedValueOnce(response({ accessToken: 'incomplete' }));
  await expect(api.get('/api/auth/me')).rejects.toThrow();
  expect(tokenStore.getAccess()).toBe(pair.accessToken);
  expect(tokenStore.getRefresh()).toBe(pair.refreshToken);
  fetch.mockResolvedValueOnce(expired())
    .mockResolvedValueOnce(response({ accessToken: 'qa-new', refreshToken: 'qa-next' }))
    .mockResolvedValueOnce(response({ id: 'qa-user' }));
  expect(await api.get('/api/auth/me')).toEqual({ id: 'qa-user' });
  expect(tokenStore.getAccess()).toBe('qa-new');
});
it('clears tokens when the refresh credential is rejected', async () => {
  fetch.mockResolvedValueOnce(expired()).mockResolvedValueOnce(response({}, 401));
  await expect(api.get('/api/auth/me')).rejects.toMatchObject({ status: 401 });
  expect(tokenStore.getAccess()).toBeNull(); expect(tokenStore.getRefresh()).toBeNull();
});
it('does not clear a successful refresh when the retried resource returns 503', async () => {
  fetch.mockResolvedValueOnce(expired())
    .mockResolvedValueOnce(response({ accessToken: 'qa-new', refreshToken: 'qa-next' }))
    .mockResolvedValueOnce(response({}, 503));
  await expect(api.get('/api/auth/me')).rejects.toMatchObject({ status: 503 });
  expect(tokenStore.getAccess()).toBe('qa-new'); expect(tokenStore.getRefresh()).toBe('qa-next');
});
it('clears credentials if the refreshed access token is also rejected', async () => {
  fetch.mockResolvedValueOnce(expired())
    .mockResolvedValueOnce(response({ accessToken: 'qa-new', refreshToken: 'qa-next' }))
    .mockResolvedValueOnce(response({}, 401));
  await expect(api.get('/api/auth/me')).rejects.toMatchObject({ status: 401 });
  expect(tokenStore.getAccess()).toBeNull();
});
it('shares one refresh across concurrent expired requests', async () => {
  let release;
  let refreshCount = 0;
  fetch.mockImplementation((url, options) => {
    if (url.endsWith('/refresh')) {
      refreshCount += 1;
      return new Promise(resolve => { release = resolve; });
    }
    return Promise.resolve(options.headers.Authorization === 'Bearer qa-new' ? response({ ok: true }) : expired());
  });
  const pending = Promise.all([api.get('/api/auth/me'), api.get('/api/posts')]);
  await vi.waitFor(() => expect(refreshCount).toBe(1));
  release(response({ accessToken: 'qa-new', refreshToken: 'qa-next' }));
  expect(await pending).toEqual([{ ok: true }, { ok: true }]);
  expect(refreshCount).toBe(1);
});
it('does not restore a session after logout during refresh', async () => {
  let release;
  fetch.mockResolvedValueOnce(expired()).mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
  const pending = api.get('/api/auth/me');
  const result = expect(pending).rejects.toMatchObject({ code: 'SESSION_CHANGED' });
  await vi.waitFor(() => expect(release).toBeTypeOf('function'));
  tokenStore.clear();
  release(response({ accessToken: 'qa-new', refreshToken: 'qa-next' }));
  await result;
  expect(tokenStore.getAccess()).toBeNull();
});
it('does not clear a newer account when an old refresh is rejected', async () => {
  let release;
  fetch.mockResolvedValueOnce(expired()).mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
  const pending = api.get('/api/auth/me');
  const result = expect(pending).rejects.toMatchObject({ status: 401 });
  await vi.waitFor(() => expect(release).toBeTypeOf('function'));
  tokenStore.set({ accessToken: 'other-account', refreshToken: 'other-refresh' });
  release(response({}, 401)); await result;
  expect(tokenStore.getAccess()).toBe('other-account');
});
