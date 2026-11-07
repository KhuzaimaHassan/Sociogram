import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import CreatePost from './CreatePost';

const { addPostToFeed, showToast } = vi.hoisted(() => ({
  addPostToFeed: vi.fn(), showToast: vi.fn(),
}));
vi.mock('../context/AppContext', () => ({ useApp: () => ({ addPostToFeed, showToast }) }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { username: 'qa.user' } }) }));

function Location() {
  return <output data-testid="route">{useLocation().pathname}</output>;
}
function mount() {
  return render(<MemoryRouter initialEntries={['/create']}><CreatePost /><Location /></MemoryRouter>);
}
function response(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
const created = { id: 'qa-post', caption: 'Synthetic test', _count: { likes: 0, comments: 0 } };

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('sociogram_access_token', 'local-test-token');
  vi.clearAllMocks();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(201, created)));
  URL.createObjectURL = vi.fn(() => 'blob:local-test');
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('post creation through the real service and API wrapper', () => {
  it('keeps both submit controls disabled for an empty post', () => {
    mount();
    expect(screen.getByRole('button', { name: 'Share', exact: true }).disabled).toBe(true);
    expect(screen.getByRole('button', { name: '✨ Share Post' }).disabled).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('submits trimmed text and location as authenticated FormData, then updates the feed', async () => {
    mount();
    fireEvent.change(screen.getByPlaceholderText("What's on your mind, qa.user?"), { target: { value: ' Synthetic test ' } });
    fireEvent.change(screen.getByPlaceholderText('Add location'), { target: { value: ' Local QA ' } });
    fireEvent.click(screen.getByRole('button', { name: '✨ Share Post' }));
    await waitFor(() => expect(addPostToFeed).toHaveBeenCalledWith(expect.objectContaining({ id: 'qa-post', liked: false })));
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe('http://127.0.0.1:4301/api/posts');
    expect(options.method).toBe('POST');
    expect(options.headers.Authorization).toBe('Bearer local-test-token');
    expect(options.headers['Content-Type']).toBeUndefined();
    expect(options.body.get('caption')).toBe('Synthetic test');
    expect(options.body.get('location')).toBe('Local QA');
    expect(options.body.has('media')).toBe(false);
    await waitFor(() => expect(screen.getByTestId('route').textContent).toBe('/'));
    expect(showToast).toHaveBeenCalled();
  });

  it.each([
    ['image/png', 'sample.png', false],
    ['video/mp4', 'sample.mp4', true],
  ])('preserves the %s file and Reel flag without forcing a multipart boundary', async (type, name, isReel) => {
    const { container } = mount();
    const file = new File(['synthetic media bytes'], name, { type });
    fireEvent.change(container.querySelector('input[type=file]'), { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: 'Share', exact: true }));
    await waitFor(() => expect(addPostToFeed).toHaveBeenCalled());
    const options = fetch.mock.calls[0][1];
    expect(options.headers['Content-Type']).toBeUndefined();
    expect(options.body.get('media').name).toBe(name);
    expect(options.body.get('media').type).toBe(type);
    expect(options.body.get('isReel')).toBe(isReel ? 'true' : null);
    await waitFor(() => expect(screen.getByTestId('route').textContent).toBe(isReel ? '/reels' : '/'));
  });

  it('retains a failed draft, shows the API error and allows a successful retry', async () => {
    fetch.mockResolvedValueOnce(response(503, { error: 'Temporarily unavailable' }));
    mount();
    fireEvent.change(screen.getByPlaceholderText("What's on your mind, qa.user?"), { target: { value: 'Synthetic test' } });
    fireEvent.click(screen.getByRole('button', { name: '✨ Share Post' }));
    await screen.findByText('Temporarily unavailable');
    expect(addPostToFeed).not.toHaveBeenCalled();
    expect(screen.getByTestId('route').textContent).toBe('/create');
    expect(screen.getByPlaceholderText("What's on your mind, qa.user?").value).toBe('Synthetic test');
    fireEvent.click(screen.getByRole('button', { name: '✨ Share Post' }));
    await waitFor(() => expect(addPostToFeed).toHaveBeenCalledTimes(1));
  });

  it('prevents another submission while the request is pending', async () => {
    let resolve;
    fetch.mockReturnValueOnce(new Promise(r => { resolve = r; }));
    mount();
    fireEvent.change(screen.getByPlaceholderText("What's on your mind, qa.user?"), { target: { value: 'Synthetic test' } });
    fireEvent.click(screen.getByRole('button', { name: '✨ Share Post' }));
    expect(screen.getAllByRole('button', { name: 'Sharing…' }).every(button => button.disabled)).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
    resolve(response(201, created));
    await waitFor(() => expect(addPostToFeed).toHaveBeenCalledTimes(1));
  });
});
