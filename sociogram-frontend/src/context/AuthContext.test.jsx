import { StrictMode } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import AuthGuard from '../components/auth/AuthGuard';
import { tokenStore } from '../services/apiClient';

const response = (data, status = 200) => ({ ok: status < 400, status,
  headers: { get: () => 'application/json' }, json: async () => data });
const me = { id: 'qa-user', username: 'qa.author' };
function Probe() {
  const { logout, user } = useAuth();
  const location = useLocation();
  return <><p>Current route: {location.pathname}</p><p>Verified user: {user?.username || 'none'}</p><button onClick={logout}>Log out</button></>;
}
function mount({ strict = false } = {}) {
  const app = <AuthProvider><MemoryRouter initialEntries={['/saved']}><Probe /><Routes>
    <Route path="/saved" element={<AuthGuard><h1>Private saved posts</h1></AuthGuard>} />
    <Route path="/login" element={<h1>Sign in</h1>} />
  </Routes></MemoryRouter></AuthProvider>;
  return render(strict ? <StrictMode>{app}</StrictMode> : app);
}
beforeEach(() => {
  localStorage.clear(); tokenStore.set({ accessToken: 'qa-access', refreshToken: 'qa-refresh' });
  vi.stubGlobal('fetch', vi.fn());
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it.each(['network', '503'])('keeps the session and original route through a %s startup failure and retry', async failure => {
  if (failure === 'network') fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
  else fetch.mockResolvedValueOnce(response({}, 503));
  mount(); await screen.findByRole('alert');
  expect(tokenStore.getAccess()).toBe('qa-access');
  expect(screen.getByText('Current route: /saved')).toBeTruthy();
  expect(screen.queryByRole('heading', { name: 'Private saved posts' })).toBeNull();
  expect(screen.queryByRole('heading', { name: 'Sign in' })).toBeNull();
  fetch.mockResolvedValueOnce(response(me));
  fireEvent.click(screen.getByRole('button', { name: 'Retry connection' }));
  await screen.findByRole('heading', { name: 'Private saved posts' });
  expect(screen.getByText('Verified user: qa.author')).toBeTruthy();
  expect(fetch.mock.calls[1][1].headers.Authorization).toBe('Bearer qa-access');
});
it('allows repeated retries without dropping credentials or exposing private content', async () => {
  fetch.mockResolvedValue(response({}, 503)); mount();
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: 'Retry connection' }));
  await screen.findByRole('alert');
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(tokenStore.getRefresh()).toBe('qa-refresh');
  expect(screen.queryByRole('heading', { name: 'Private saved posts' })).toBeNull();
});
it('clears a genuinely invalid session and redirects to sign in', async () => {
  fetch.mockResolvedValueOnce(response({}, 401)); mount();
  await screen.findByRole('heading', { name: 'Sign in' });
  expect(tokenStore.getAccess()).toBeNull();
  expect(tokenStore.getRefresh()).toBeNull();
});
it('does not call the API or show an outage when no session was saved', async () => {
  tokenStore.clear(); mount(); await screen.findByRole('heading', { name: 'Sign in' });
  expect(fetch).not.toHaveBeenCalled();
});
it('does not sign back in when a bootstrap finishes after logout', async () => {
  let finish; fetch.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  mount(); await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByRole('button', { name: 'Log out' }));
  await act(async () => { finish(response(me)); });
  await screen.findByRole('heading', { name: 'Sign in' });
  expect(screen.getByText('Verified user: none')).toBeTruthy();
  expect(tokenStore.getAccess()).toBeNull();
});
it('ignores a stale Strict Mode bootstrap failure after successful verification', async () => {
  let finish;
  fetch.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockResolvedValueOnce(response(me));
  mount({ strict: true }); await screen.findByRole('heading', { name: 'Private saved posts' });
  await act(async () => { finish(response({}, 401)); });
  expect(tokenStore.getAccess()).toBe('qa-access');
  expect(screen.queryByRole('alert')).toBeNull();
});
it('retains tokens if refresh is unavailable after access expiry', async () => {
  fetch.mockResolvedValueOnce(response({ code: 'TOKEN_EXPIRED' }, 401)).mockResolvedValueOnce(response({}, 503));
  mount(); await screen.findByRole('alert');
  expect(tokenStore.getRefresh()).toBe('qa-refresh');
  fetch.mockResolvedValueOnce(response({ code: 'TOKEN_EXPIRED' }, 401))
    .mockResolvedValueOnce(response({ accessToken: 'qa-new', refreshToken: 'qa-next' }))
    .mockResolvedValueOnce(response(me));
  fireEvent.click(screen.getByRole('button', { name: 'Retry connection' }));
  await screen.findByRole('heading', { name: 'Private saved posts' });
  expect(tokenStore.getAccess()).toBe('qa-new');
});
