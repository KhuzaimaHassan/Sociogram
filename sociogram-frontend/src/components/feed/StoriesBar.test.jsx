import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import StoriesBar from './StoriesBar';
import { getStories } from '../../services/storyService';
const { auth } = vi.hoisted(() => ({ auth: { user: { id: 'qa-me', username: 'me' } } }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../../services/storyService', () => ({ getStories: vi.fn() }));
vi.mock('./StoryCreator', () => ({ default: () => <div>QA creator</div> }));
vi.mock('./StoryViewer', () => ({ default: ({ group, onClose }) => <div>Viewing {group.user.username}<button onClick={onClose}>Close story</button></div> }));
const group = { user: { id: 'qa-friend', username: 'friend.author' }, stories: [{ id: 'qa-story' }], hasUnread: true };
beforeEach(() => { vi.clearAllMocks(); auth.user = { id: 'qa-me', username: 'me' }; getStories.mockResolvedValue([]); });
afterEach(cleanup);
it('renders returned groups and opens the matching viewer', async () => {
  getStories.mockResolvedValue([group]); render(<StoriesBar />);
  fireEvent.click(await screen.findByRole('button', { name: "View friend.author's story" }));
  expect(screen.getByText('Viewing friend.author')).toBeTruthy();
});
it('shows a retryable error instead of claiming there are no stories', async () => {
  getStories.mockRejectedValueOnce(new Error('Offline')); render(<StoriesBar />);
  await screen.findByRole('alert');
  expect(screen.queryByText(/No stories yet/)).toBeNull();
  getStories.mockResolvedValue([group]);
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  await screen.findByRole('button', { name: "View friend.author's story" });
  expect(screen.queryByRole('alert')).toBeNull();
});
it('shows the empty message only after a successful empty read', async () => {
  render(<StoriesBar />); await screen.findByText(/No stories yet/);
  expect(screen.queryByRole('alert')).toBeNull();
});
it('refreshes seen state when the viewer closes', async () => {
  getStories.mockResolvedValueOnce([group]).mockResolvedValueOnce([{ ...group, hasUnread: false }]);
  render(<StoriesBar />); fireEvent.click(await screen.findByRole('button', { name: "View friend.author's story" }));
  fireEvent.click(screen.getByRole('button', { name: 'Close story' }));
  await screen.findByRole('button', { name: "View friend.author's story" });
  expect(getStories).toHaveBeenCalledTimes(2);
});
it('ignores an earlier account response after changing accounts', async () => {
  let finish; getStories.mockReturnValueOnce(new Promise(resolve => { finish = resolve; }));
  const view = render(<StoriesBar />); auth.user = { id: 'qa-other', username: 'other' };
  view.rerender(<StoriesBar />); await screen.findByText(/No stories yet/);
  await act(async () => { finish([group]); });
  expect(screen.queryByRole('button', { name: "View friend.author's story" })).toBeNull();
});

