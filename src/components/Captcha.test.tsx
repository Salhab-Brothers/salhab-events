import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';

// The script loader caches its promise at module level, so load a fresh module per test.
const loadCaptcha = async () => (await import('./Captcha')).default;

const turnstile = { render: vi.fn(), remove: vi.fn() };

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  turnstile.render.mockReturnValue('w1');
  window.turnstile = turnstile;
});
afterEach(() => {
  vi.unstubAllEnvs();
  delete window.turnstile;
  document.head.querySelectorAll('script').forEach((s) => s.remove());
});

describe('Captcha', () => {
  it('renders nothing without a site key', async () => {
    const Captcha = await loadCaptcha();
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', '');
    const { container } = render(<Captcha onToken={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the widget, reports tokens, and removes it on unmount', async () => {
    const Captcha = await loadCaptcha();
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'site');
    const onToken = vi.fn();
    const { unmount } = render(<Captcha onToken={onToken} />);
    // The script tag is added once; simulate it finishing.
    await waitFor(() => expect(document.head.querySelector('script')).not.toBeNull());
    document.head.querySelector('script')!.dispatchEvent(new Event('load'));
    await waitFor(() => expect(turnstile.render).toHaveBeenCalled());

    const opts = turnstile.render.mock.calls[0][1];
    expect(opts.sitekey).toBe('site');
    opts.callback('tok');
    expect(onToken).toHaveBeenLastCalledWith('tok');
    opts['expired-callback']();
    expect(onToken).toHaveBeenLastCalledWith(null);
    opts['error-callback']();
    expect(onToken).toHaveBeenLastCalledWith(null);

    unmount();
    expect(turnstile.remove).toHaveBeenCalledWith('w1');
  });

  it.each([[318, 'normal'], [300, 'normal'], [299, 'compact'], [0, 'compact']] as const)(
    'with %ipx of room it asks for the %s widget', async (width, size) => {
      const Captcha = await loadCaptcha();
      vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'site');
      const spy = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(width);
      render(<Captcha onToken={vi.fn()} />);
      await waitFor(() => expect(document.head.querySelector('script')).not.toBeNull());
      document.head.querySelector('script')!.dispatchEvent(new Event('load'));
      await waitFor(() => expect(turnstile.render).toHaveBeenCalled());
      expect(turnstile.render.mock.calls[0][1].size).toBe(size);
      spy.mockRestore();
    });

  it('clears the token when the script fails to load', async () => {
    const Captcha = await loadCaptcha();
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'site');
    const onToken = vi.fn();
    render(<Captcha onToken={onToken} />);
    await waitFor(() => expect(document.head.querySelector('script')).not.toBeNull());
    document.head.querySelector('script')!.dispatchEvent(new Event('error'));
    await waitFor(() => expect(onToken).toHaveBeenCalledWith(null));
    expect(turnstile.render).not.toHaveBeenCalled();
  });
});
