import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SavedPosts from './SavedPosts';
import * as api from '../services/postService';

const { updatePost, auth } = vi.hoisted(() => ({ updatePost: vi.fn(), auth: { user: { id: 'qa-a' } } }));
vi.mock('../context/AppContext', () => ({ useApp: () => ({ updatePost }) }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../services/postService', () => ({ getSavedPosts: vi.fn(), unsavePost: vi.fn() }));
const post = { id: 'qa-post', caption: 'Saved QA post', user: { username: 'qa.author', avatar: '😎' } };
function mount() { return render(<MemoryRouter><SavedPosts /></MemoryRouter>); }
beforeEach(() => {
  vi.clearAllMocks();
  auth.user = { id: 'qa-a' };
  api.getSavedPosts.mockResolvedValue({ posts: [], nextCursor: null });
  api.unsavePost.mockResolvedValue({ saved: false });
});
afterEach(cleanup);

it('provides a private collection and a useful empty state', async () => {
  mount();
  await screen.findByRole('heading', { name: 'No saved posts yet' });
  expect(screen.getByText('Only you can see this collection.')).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Browse your feed' }).getAttribute('href')).toBe('/');
});

it('removes a saved post and updates its existing feed state', async () => {
  api.getSavedPosts.mockResolvedValue({ posts: [post], nextCursor: null });
  mount();
  fireEvent.click(await screen.findByRole('button', { name: 'Remove saved post: Saved QA post' }));
  await screen.findByRole('heading', { name: 'No saved posts yet' });
  expect(api.unsavePost).toHaveBeenCalledWith('qa-post');
  expect(updatePost).toHaveBeenCalledWith('qa-post', { saved: false });
});

it('keeps the saved item if removal fails and permits retrying it', async () => {
  api.getSavedPosts.mockResolvedValue({ posts: [post], nextCursor: null });
  api.unsavePost.mockRejectedValueOnce(new Error('Offline'));
  mount();
  fireEvent.click(await screen.findByRole('button', { name: 'Remove saved post: Saved QA post' }));
  await screen.findByRole('alert');
  expect(screen.getByText('Saved QA post')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Remove saved post: Saved QA post' }));
  await screen.findByRole('heading', { name: 'No saved posts yet' });
});

it('retries an initial loading failure', async () => {
  api.getSavedPosts.mockRejectedValueOnce(new Error('Offline'));
  mount();
  await screen.findByRole('alert');
  api.getSavedPosts.mockResolvedValue({ posts: [post], nextCursor: null });
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  await screen.findByText('Saved QA post');
  expect(api.getSavedPosts).toHaveBeenCalledTimes(2);
});

it('loads another page without duplicating a post that moved between pages', async () => {
  api.getSavedPosts.mockResolvedValueOnce({ posts: [post], nextCursor: 'qa-cursor' })
    .mockResolvedValueOnce({ posts: [post, { ...post, id: 'qa-two', caption: 'Second saved post' }], nextCursor: null });
  mount();
  fireEvent.click(await screen.findByRole('button', { name: 'Load more' }));
  await screen.findByText('Second saved post');
  expect(api.getSavedPosts).toHaveBeenLastCalledWith({ cursor: 'qa-cursor' });
  expect(screen.getAllByText('Saved QA post')).toHaveLength(1);
  expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull();
});

it('does not expose a prior account\'s delayed collection after switching users', async () => {
  let finish;
  api.getSavedPosts.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const view = mount();
  auth.user = { id: 'qa-b' };
  view.rerender(<MemoryRouter><SavedPosts /></MemoryRouter>);
  await screen.findByRole('heading', { name: 'No saved posts yet' });
  await act(async () => { finish({ posts: [post], nextCursor: null }); });
  await waitFor(() => expect(screen.queryByText('Saved QA post')).toBeNull());
});
