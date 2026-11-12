import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { registerServiceWorker } from './registerSw';

const register = vi.fn();

const setServiceWorker = (value: unknown) =>
  Object.defineProperty(navigator, 'serviceWorker', { value, configurable: true });

const fireLoad = () => window.dispatchEvent(new Event('load'));

beforeEach(() => {
  vi.clearAllMocks();
  register.mockResolvedValue(undefined);
});
afterEach(() => {
  vi.unstubAllEnvs();
  // jsdom has no service worker support, so remove what a test added.
  Reflect.deleteProperty(navigator, 'serviceWorker');
});

describe('registerServiceWorker', () => {
  it('does nothing outside a production build', () => {
    setServiceWorker({ register });
    registerServiceWorker();
    fireLoad();
    expect(register).not.toHaveBeenCalled();
  });

  it('does nothing when the browser has no service worker support', () => {
    vi.stubEnv('PROD', true);
    const add = vi.spyOn(window, 'addEventListener');
    registerServiceWorker();
    expect(add).not.toHaveBeenCalledWith('load', expect.any(Function));
  });

  it('registers /sw.js once the page has loaded', () => {
    vi.stubEnv('PROD', true);
    setServiceWorker({ register });
    registerServiceWorker();
    expect(register).not.toHaveBeenCalled();
    fireLoad();
    expect(register).toHaveBeenCalledWith('/sw.js');
  });

  it('logs a failed registration without throwing', async () => {
    vi.stubEnv('PROD', true);
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    register.mockRejectedValue(new Error('blocked'));
    setServiceWorker({ register });
    registerServiceWorker();
    fireLoad();
    await vi.waitFor(() => expect(error).toHaveBeenCalledWith('Service worker registration failed', expect.any(Error)));
  });
});
