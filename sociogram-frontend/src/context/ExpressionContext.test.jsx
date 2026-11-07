import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ExpressionProvider, useExpression } from './ExpressionContext';
import { loadFaceApiModels } from '../utils/faceApiLoader';

vi.mock('../utils/faceApiLoader', () => ({ loadFaceApiModels: vi.fn(), detectFaceExpression: vi.fn() }));

function Probe() {
  const context = useExpression();
  return <>
    <button onClick={context.toggleEnabled}>Toggle detection</button>
    <output data-testid="camera">{String(context.isCameraActive)}</output>
    <output>{context.expressionError}</output>
  </>;
}
function mount() { return render(<ExpressionProvider><Probe /></ExpressionProvider>); }
let getUserMedia;
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  getUserMedia = vi.fn();
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
});
afterEach(cleanup);

it('does not load models or request a camera after manual-only opt-out', () => {
  localStorage.setItem('sociogram_expression_consent', 'false');
  mount();
  expect(loadFaceApiModels).not.toHaveBeenCalled();
  expect(getUserMedia).not.toHaveBeenCalled();
});

it('keeps manual reactions available if model loading fails, without asking for a camera', async () => {
  localStorage.setItem('sociogram_expression_consent', 'true');
  loadFaceApiModels.mockResolvedValue(false);
  mount();
  await screen.findByText('Expression models could not load. You can still use manual reactions.');
  expect(getUserMedia).not.toHaveBeenCalled();
  expect(screen.getByTestId('camera').textContent).toBe('false');
});

it('does not start a camera if detection is disabled while models are loading', async () => {
  let resolve;
  localStorage.setItem('sociogram_expression_consent', 'true');
  loadFaceApiModels.mockReturnValue(new Promise(r => { resolve = r; }));
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Toggle detection' }));
  await act(async () => { resolve(true); });
  expect(getUserMedia).not.toHaveBeenCalled();
});

it('stops a simulated camera stream that resolves after detection is disabled', async () => {
  let resolve;
  const stop = vi.fn();
  localStorage.setItem('sociogram_expression_consent', 'true');
  loadFaceApiModels.mockResolvedValue(true);
  getUserMedia.mockReturnValue(new Promise(r => { resolve = r; }));
  mount();
  await waitFor(() => expect(getUserMedia).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByRole('button', { name: 'Toggle detection' }));
  await act(async () => { resolve({ getTracks: () => [{ stop }] }); });
  expect(stop).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId('camera').textContent).toBe('false');
});

it('starts one simulated camera after loading and stops its tracks on unmount', async () => {
  const stop = vi.fn();
  localStorage.setItem('sociogram_expression_consent', 'true');
  loadFaceApiModels.mockResolvedValue(true);
  getUserMedia.mockResolvedValue({ getTracks: () => [{ stop }] });
  const { unmount } = mount();
  await waitFor(() => expect(screen.getByTestId('camera').textContent).toBe('true'));
  expect(getUserMedia).toHaveBeenCalledTimes(1);
  unmount();
  expect(stop).toHaveBeenCalledTimes(1);
});

it('releases the simulated stream if video playback fails', async () => {
  const stop = vi.fn();
  localStorage.setItem('sociogram_expression_consent', 'true');
  loadFaceApiModels.mockResolvedValue(true);
  getUserMedia.mockResolvedValue({ getTracks: () => [{ stop }] });
  HTMLMediaElement.prototype.play.mockRejectedValueOnce(new Error('Playback blocked'));
  mount();
  await screen.findByText('Camera unavailable. You can still use manual reactions.');
  expect(stop).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId('camera').textContent).toBe('false');
});
