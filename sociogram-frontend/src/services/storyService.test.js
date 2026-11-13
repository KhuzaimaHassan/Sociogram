import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { getStories, viewStory, deleteStory } from './storyService';
import { tokenStore } from './apiClient';

const response = (body, status = 200) => ({ ok: status < 400, status,
  headers: { get: () => 'application/json' }, json: async () => body });
beforeEach(() => {
  localStorage.clear();
  tokenStore.set({ accessToken: 'qa-access', refreshToken: 'qa-refresh' });
  vi.stubGlobal('fetch', vi.fn());
});
afterEach(() => vi.unstubAllGlobals());

it('loads grouped stories directly from the authenticated API JSON', async () => {
  const groups = [{ user: { id: 'qa-a', username: 'qa.author' }, stories: [{ id: 'qa-story' }] }];
  fetch.mockResolvedValue(response(groups));
  expect(await getStories()).toEqual(groups);
  expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:4301/api/stories', expect.objectContaining({
    method: 'GET', headers: { Authorization: 'Bearer qa-access' },
  }));
});
it('marks a story seen and returns the actual JSON confirmation', async () => {
  fetch.mockResolvedValue(response({ ok: true }));
  expect(await viewStory('qa-story')).toEqual({ ok: true });
  expect(fetch.mock.calls[0][0]).toBe('http://127.0.0.1:4301/api/stories/qa-story/view');
  expect(fetch.mock.calls[0][1].method).toBe('POST');
});
it('deletes through the authenticated story route', async () => {
  fetch.mockResolvedValue(response({ ok: true }));
  expect(await deleteStory('qa-story')).toEqual({ ok: true });
  expect(fetch.mock.calls[0][0]).toBe('http://127.0.0.1:4301/api/stories/qa-story');
  expect(fetch.mock.calls[0][1].method).toBe('DELETE');
});
it('surfaces failures rather than substituting an empty collection', async () => {
  fetch.mockResolvedValue(response({ error: 'Temporarily unavailable' }, 503));
  await expect(getStories()).rejects.toThrow('Temporarily unavailable');
});
it('rejects a malformed success payload before it reaches the story bar', async () => {
  fetch.mockResolvedValue(response({ data: [] }));
  await expect(getStories()).rejects.toThrow('invalid response');
});
it('retains the shared client token-refresh behavior', async () => {
  fetch.mockResolvedValueOnce(response({ code: 'TOKEN_EXPIRED' }, 401))
    .mockResolvedValueOnce(response({ accessToken: 'qa-new', refreshToken: 'qa-next' }))
    .mockResolvedValueOnce(response([]));
  expect(await getStories()).toEqual([]);
  expect(fetch.mock.calls[1][0]).toBe('http://127.0.0.1:4301/api/auth/refresh');
  expect(fetch.mock.calls[2][1].headers.Authorization).toBe('Bearer qa-new');
});
