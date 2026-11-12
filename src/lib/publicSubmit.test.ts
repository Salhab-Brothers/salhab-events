import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('@/api/api', () => ({ supabase: { functions: { invoke } } }));

import { captchaSiteKey, sendPublic } from './publicSubmit';

beforeEach(() => invoke.mockReset());
afterEach(() => vi.unstubAllEnvs());

describe('sendPublic', () => {
  it('inserts directly when no captcha is configured', async () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', '');
    const direct = vi.fn().mockResolvedValue(undefined);
    expect(captchaSiteKey()).toBeUndefined();
    await sendPublic('review', { a: 1 }, null, direct);
    expect(direct).toHaveBeenCalledWith({ a: 1 });
    expect(invoke).not.toHaveBeenCalled();
  });

  it('goes through the verifying function when a site key is set', async () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'site');
    invoke.mockResolvedValue({ error: null });
    const direct = vi.fn();
    await sendPublic('request', { a: 1 }, 'tok', direct);
    expect(invoke).toHaveBeenCalledWith('submit', { body: { kind: 'request', row: { a: 1 }, token: 'tok' } });
    expect(direct).not.toHaveBeenCalled();
  });

  it('throws when the function rejects the submission', async () => {
    vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'site');
    invoke.mockResolvedValue({ error: new Error('captcha') });
    await expect(sendPublic('request', {}, 'tok', vi.fn())).rejects.toThrow('captcha');
  });
});
