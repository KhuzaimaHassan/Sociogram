import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AppProvider, useApp } from './AppContext';
import * as api from '../services/postService';

const auth = vi.hoisted(() => ({ isAuthenticated: true, user: { id: 'qa-a' } }));
vi.mock('./AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../services/postService', () => ({ getFeed: vi.fn(), savePost: vi.fn(), unsavePost: vi.fn() }));

function Probe() {
  const context = useApp();
  return <>
    {context.posts.map(post => <button key={post.id} disabled={context.savingPostIds[post.id]} aria-pressed={!!post.saved} onClick={() => context.toggleSave(post.id)}>{post.id}</button>)}
    <button onClick={() => context.loadFeed()}>Reload feed</button>
    <button onClick={() => { context.toggleSave('qa-post'); context.toggleSave('qa-post'); }}>Rapid save</button>
    {context.toasts.map(toast => <p key={toast.id}>{toast.message}</p>)}
  </>;
}
function mount() { return render(<AppProvider><Probe /></AppProvider>); }
beforeEach(() => {
  vi.clearAllMocks();
  auth.user = { id: 'qa-a' };
  api.getFeed.mockResolvedValue({ posts: [{ id: 'qa-post', saved: false }], nextCursor: null });
  api.savePost.mockResolvedValue({ saved: true });
  api.unsavePost.mockResolvedValue({ saved: false });
});
afterEach(cleanup);

it('hydrates a saved flag from the server', async () => {
  api.getFeed.mockResolvedValue({ posts: [{ id: 'qa-post', saved: true }], nextCursor: null });
  mount();
  expect((await screen.findByRole('button', { name: 'qa-post' })).getAttribute('aria-pressed')).toBe('true');
});

it('persists a save through the API and retains the server state after feed reload', async () => {
  mount();
  fireEvent.click(await screen.findByRole('button', { name: 'qa-post' }));
  await waitFor(() => expect(api.savePost).toHaveBeenCalledWith('qa-post'));
  await waitFor(() => expect(screen.getByRole('button', { name: 'qa-post' }).disabled).toBe(false));
  api.getFeed.mockResolvedValue({ posts: [{ id: 'qa-post', saved: true }], nextCursor: null });
  fireEvent.click(screen.getByRole('button', { name: 'Reload feed' }));
  await waitFor(() => expect(api.getFeed).toHaveBeenCalledTimes(2));
  expect(screen.getByRole('button', { name: 'qa-post' }).getAttribute('aria-pressed')).toBe('true');
});

it('persists unsaving an already saved post', async () => {
  api.getFeed.mockResolvedValue({ posts: [{ id: 'qa-post', saved: true }], nextCursor: null });
  mount();
  fireEvent.click(await screen.findByRole('button', { name: 'qa-post' }));
  await waitFor(() => expect(api.unsavePost).toHaveBeenCalledWith('qa-post'));
  await waitFor(() => expect(screen.getByRole('button', { name: 'qa-post' }).getAttribute('aria-pressed')).toBe('false'));
});

it('rolls back optimistic state and displays a useful error when saving fails', async () => {
  api.savePost.mockRejectedValue(new Error('Offline'));
  mount();
  fireEvent.click(await screen.findByRole('button', { name: 'qa-post' }));
  await screen.findByText('Could not update saved posts. Please try again.');
  expect(screen.getByRole('button', { name: 'qa-post' }).getAttribute('aria-pressed')).toBe('false');
  expect(screen.getByRole('button', { name: 'qa-post' }).disabled).toBe(false);
});

it('serializes rapid writes to the same post', async () => {
  let finish;
  api.savePost.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  mount();
  await screen.findByRole('button', { name: 'qa-post' });
  fireEvent.click(screen.getByRole('button', { name: 'Rapid save' }));
  expect(api.savePost).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'qa-post' }).disabled).toBe(true);
  await act(async () => { finish({ saved: true }); });
  expect(screen.getByRole('button', { name: 'qa-post' }).disabled).toBe(false);
});

it('ignores an old account\'s save response after an account change', async () => {
  let finish;
  api.savePost.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const view = mount();
  fireEvent.click(await screen.findByRole('button', { name: 'qa-post' }));
  auth.user = { id: 'qa-b' };
  view.rerender(<AppProvider><Probe /></AppProvider>);
  await waitFor(() => expect(api.getFeed).toHaveBeenCalledTimes(2));
  await act(async () => { finish({ saved: true }); });
  expect(screen.getByRole('button', { name: 'qa-post' }).getAttribute('aria-pressed')).toBe('false');
});

it('does not expose an old account\'s delayed feed to a new account', async () => {
  let finish;
  api.getFeed.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const view = mount();
  auth.user = { id: 'qa-b' };
  api.getFeed.mockResolvedValue({ posts: [{ id: 'qa-b-post', saved: false }], nextCursor: null });
  view.rerender(<AppProvider><Probe /></AppProvider>);
  await screen.findByRole('button', { name: 'qa-b-post' });
  await act(async () => { finish({ posts: [{ id: 'private-qa-a-post', saved: true }], nextCursor: null }); });
  expect(screen.queryByRole('button', { name: 'private-qa-a-post' })).toBeNull();
});
