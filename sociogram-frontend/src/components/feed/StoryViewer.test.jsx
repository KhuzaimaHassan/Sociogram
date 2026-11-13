import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import StoryViewer from './StoryViewer';
import { deleteStory, viewStory } from '../../services/storyService';
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'qa-me' } }) }));
vi.mock('../../services/apiClient', () => ({ mediaUrl: path => path }));
vi.mock('../../services/storyService', () => ({ deleteStory: vi.fn(), viewStory: vi.fn() }));
const group = { user: { id: 'qa-me', username: 'qa.author' }, stories: [{ id: 'qa-story', mediaUrl: '/qa.png', mediaType: 'image', caption: 'QA caption', createdAt: new Date().toISOString() }] };
function mount(onClose = vi.fn()) { render(<StoryViewer group={group} onClose={onClose} onNext={vi.fn()} onPrev={vi.fn()} />); return onClose; }
beforeEach(() => { vi.clearAllMocks(); viewStory.mockResolvedValue({ ok: true }); deleteStory.mockResolvedValue({ ok: true }); vi.spyOn(window, 'confirm').mockReturnValue(true); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
it('marks the displayed story as viewed', async () => { mount(); await waitFor(() => expect(viewStory).toHaveBeenCalledWith('qa-story')); });
it('closes only after successful deletion', async () => {
  const close = mount(); fireEvent.click(screen.getByRole('button', { name: 'Delete story' }));
  await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
  expect(deleteStory).toHaveBeenCalledWith('qa-story');
});
it('keeps media visible and permits retry after a failed deletion', async () => {
  deleteStory.mockRejectedValueOnce(new Error('Offline')); const close = mount();
  fireEvent.click(screen.getByRole('button', { name: 'Delete story' }));
  await screen.findByRole('alert'); expect(screen.getByAltText('story')).toBeTruthy(); expect(close).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Delete story' }));
  await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
});
it('does not submit another delete while one is pending', async () => {
  deleteStory.mockReturnValue(new Promise(() => {})); mount();
  fireEvent.click(screen.getByRole('button', { name: 'Delete story' }));
  fireEvent.click(screen.getByRole('button', { name: 'Deleting story' }));
  expect(deleteStory).toHaveBeenCalledTimes(1);
});
it('respects a cancelled delete confirmation', async () => {
  window.confirm.mockReturnValue(false); mount();
  fireEvent.click(screen.getByRole('button', { name: 'Delete story' }));
  expect(deleteStory).not.toHaveBeenCalled();
});
it('does not auto-advance past a pending or failed delete', async () => {
  vi.useFakeTimers();
  let fail;
  deleteStory.mockReturnValue(new Promise((_, reject) => { fail = reject; }));
  const close = mount();
  fireEvent.click(screen.getByRole('button', { name: 'Delete story' }));
  await act(async () => { vi.advanceTimersByTime(6000); });
  expect(close).not.toHaveBeenCalled();
  await act(async () => { fail(new Error('Offline')); });
  await act(async () => { vi.advanceTimersByTime(6000); });
  expect(close).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toBeTruthy();
});
it('keeps a video open when it ends during deletion', () => {
  deleteStory.mockReturnValue(new Promise(() => {}));
  const close = vi.fn();
  const videoGroup = { ...group, stories: [{ ...group.stories[0], mediaType: 'video' }] };
  const { container } = render(<StoryViewer group={videoGroup} onClose={close} />);
  fireEvent.click(screen.getByRole('button', { name: 'Delete story' }));
  fireEvent.ended(container.querySelector('video'));
  expect(close).not.toHaveBeenCalled();
});
