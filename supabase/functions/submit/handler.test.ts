import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHandler, type Deps } from './handler.ts';

const SITE = 'https://salhab-events.vercel.app';
const NOW = new Date('2026-11-12T10:00:00.000Z');

const review = { reviewer_name: 'سارة', rating: 5, comment: 'ممتاز' };
const request = {
  first_name: 'خالد', last_name: 'سلهب', phone: '0545274483', date: '2027-03-04', time_slot: 'lunch', event_name: 'عرس',
};

const verdict = (v: object) => new Response(JSON.stringify(v));

let env: Record<string, string>;
let fetchMock: ReturnType<typeof vi.fn>;
let insert: ReturnType<typeof vi.fn>;

const handler = () => createHandler({
  env: (n) => env[n],
  fetch: fetchMock as unknown as Deps['fetch'],
  insert: insert as unknown as Deps['insert'],
  now: () => NOW,
});

const post = (body: unknown, headers: Record<string, string> = {}) =>
  new Request('https://fn.example/submit', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

beforeEach(() => {
  env = { TURNSTILE_SECRET: 'secret' };
  // A fresh Response each call: a body can only be read once.
  fetchMock = vi.fn().mockImplementation(async () => verdict({ success: true, hostname: 'salhab-events.vercel.app' }));
  insert = vi.fn().mockResolvedValue(null);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('methods and CORS', () => {
  it('answers a health check on GET', async () => {
    const res = await handler()(new Request('https://fn.example/submit'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
  it('answers the preflight for an allowed origin with that origin', async () => {
    const res = await handler()(new Request('https://fn.example/submit', { method: 'OPTIONS', headers: { Origin: SITE } }));
    expect(res.status).toBe(200);
    expect(res.headers.get('access-control-allow-origin')).toBe(SITE);
    expect(res.headers.get('vary')).toBe('Origin');
  });
  it('answers a preflight without an Origin header, with no allow-origin', async () => {
    const res = await handler()(new Request('https://fn.example/submit', { method: 'OPTIONS' }));
    expect(res.status).toBe(200);
    expect(res.headers.get('access-control-allow-origin')).toBeNull();
  });
  it('refuses a preflight from an unknown origin', async () => {
    const res = await handler()(new Request('https://fn.example/submit', { method: 'OPTIONS', headers: { Origin: 'https://evil.example' } }));
    expect(res.status).toBe(403);
    expect(res.headers.get('access-control-allow-origin')).toBeNull();
  });
  it('refuses other methods', async () => {
    const res = await handler()(new Request('https://fn.example/submit', { method: 'PUT' }));
    expect(res.status).toBe(405);
  });
  it('refuses a POST from an unknown origin before doing anything else', async () => {
    const res = await handler()(post({ kind: 'review', row: review, token: 't' }, { Origin: 'https://evil.example' }));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'origin' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });
  it('accepts a POST from an allowed origin and echoes it', async () => {
    const res = await handler()(post({ kind: 'review', row: review, token: 't' }, { Origin: SITE }));
    expect(res.status).toBe(200);
    expect(res.headers.get('access-control-allow-origin')).toBe(SITE);
  });
  it('accepts a POST without an Origin header (scripts and tests; the captcha still applies)', async () => {
    const res = await handler()(post({ kind: 'review', row: review, token: 't' }));
    expect(res.status).toBe(200);
  });
  it('accepts origins added through ALLOWED_ORIGINS', async () => {
    env.ALLOWED_ORIGINS = 'https://preview.example';
    const res = await handler()(post({ kind: 'review', row: review, token: 't' }, { Origin: 'https://preview.example' }));
    expect(res.status).toBe(200);
  });
});

describe('request body', () => {
  it('refuses invalid JSON', async () => {
    expect((await handler()(post('{nope'))).status).toBe(400);
  });
  it('refuses a JSON null body', async () => {
    expect((await handler()(post('null'))).status).toBe(400);
  });
  it('refuses a JSON value that is not an object', async () => {
    expect((await handler()(post('"text"'))).status).toBe(400);
    expect((await handler()(post('42'))).status).toBe(400);
  });
});

describe('captcha', () => {
  it('refuses a missing, non-string, empty or oversized token without calling Cloudflare', async () => {
    for (const token of [undefined, null, 5, '', 'x'.repeat(2049)]) {
      const res = await handler()(post({ kind: 'review', row: review, token }));
      expect(res.status).toBe(403);
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('sends the secret, token and client address to Cloudflare', async () => {
    await handler()(post({ kind: 'review', row: review, token: 'tok' }, { 'cf-connecting-ip': '203.0.113.7' }));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    const body = init.body as URLSearchParams;
    expect(body.get('secret')).toBe('secret');
    expect(body.get('response')).toBe('tok');
    expect(body.get('remoteip')).toBe('203.0.113.7');
  });
  it('omits the client address when there is none, and tolerates a missing secret', async () => {
    delete env.TURNSTILE_SECRET;
    await handler()(post({ kind: 'review', row: review, token: 'tok' }));
    const body = fetchMock.mock.calls[0][1].body as URLSearchParams;
    expect(body.has('remoteip')).toBe(false);
    expect(body.get('secret')).toBe('');
  });
  it('refuses when Cloudflare says the token failed', async () => {
    fetchMock.mockImplementation(async () => verdict({ success: false, 'error-codes': ['invalid-input-response'] }));
    const res = await handler()(post({ kind: 'review', row: review, token: 'bad' }));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'captcha' });
    expect(insert).not.toHaveBeenCalled();
  });
  it('treats anything but success true as a failure', async () => {
    for (const v of [{}, { success: 'true' }, { success: 1 }]) {
      fetchMock.mockImplementation(async () => verdict(v));
      expect((await handler()(post({ kind: 'review', row: review, token: 't' }))).status).toBe(403);
    }
  });
  it('fails closed with 503 when Cloudflare cannot be reached', async () => {
    fetchMock.mockRejectedValue(new Error('network'));
    const res = await handler()(post({ kind: 'review', row: review, token: 't' }));
    expect(res.status).toBe(503);
    expect(insert).not.toHaveBeenCalled();
  });
  it('fails closed with 503 when Cloudflare answers with something that is not JSON', async () => {
    fetchMock.mockImplementation(async () => new Response('<html>oops</html>'));
    expect((await handler()(post({ kind: 'review', row: review, token: 't' }))).status).toBe(503);
  });
});

describe('expected hostnames', () => {
  it('is not checked when the setting is absent (local tests use a fake hostname)', async () => {
    fetchMock.mockImplementation(async () => verdict({ success: true, hostname: 'example.com' }));
    expect((await handler()(post({ kind: 'review', row: review, token: 't' }))).status).toBe(200);
  });
  it('accepts a token solved on the expected site', async () => {
    env.TURNSTILE_EXPECTED_HOSTNAMES = 'salhab-events.vercel.app';
    expect((await handler()(post({ kind: 'review', row: review, token: 't' }))).status).toBe(200);
  });
  it('refuses a token solved on another site, or without a hostname', async () => {
    env.TURNSTILE_EXPECTED_HOSTNAMES = 'salhab-events.vercel.app';
    for (const v of [{ success: true, hostname: 'evil.example' }, { success: true }]) {
      fetchMock.mockImplementation(async () => verdict(v));
      const res = await handler()(post({ kind: 'review', row: review, token: 't' }));
      expect(res.status).toBe(403);
    }
    expect(insert).not.toHaveBeenCalled();
  });
});

describe('storing the form', () => {
  it('stores a booking request as pending, with the injected time', async () => {
    const res = await handler()(post({ kind: 'request', row: request, token: 't' }));
    expect(res.status).toBe(200);
    expect(insert).toHaveBeenCalledWith('booking_requests', expect.objectContaining({
      first_name: 'خالد', phone: '0545274483', status: 'pending', submitted_at: NOW.toISOString(),
    }));
  });
  it('stores a review as unapproved', async () => {
    await handler()(post({ kind: 'review', row: { ...review, approved: true }, token: 't' }));
    expect(insert).toHaveBeenCalledWith('reviews', expect.objectContaining({ reviewer_name: 'سارة', approved: false }));
  });
  it('works without an injected clock', async () => {
    const res = await createHandler({ env: (n) => env[n], fetch: fetchMock as unknown as Deps['fetch'], insert: insert as unknown as Deps['insert'] })(
      post({ kind: 'request', row: request, token: 't' }),
    );
    expect(res.status).toBe(200);
  });
  it('refuses an unknown kind, a missing row, a non-object row or an invalid row', async () => {
    for (const body of [
      { kind: 'booking', row: request },
      { row: request },
      { kind: 'request' },
      { kind: 'request', row: 'text' },
      { kind: 'request', row: null },
      { kind: 'request', row: { ...request, phone: 'abc' } },
      { kind: 'review', row: { ...review, rating: 9 } },
    ]) {
      const res = await handler()(post({ ...body, token: 't' }));
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: 'invalid' });
    }
    expect(insert).not.toHaveBeenCalled();
  });
  it('reports a database failure as 500 without leaking details, and logs it', async () => {
    insert.mockResolvedValue({ code: '42501', message: 'permission denied for table reviews' });
    const res = await handler()(post({ kind: 'review', row: review, token: 't' }));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'save' });
    expect(console.error).toHaveBeenCalledWith('submit: insert failed', '42501', 'permission denied for table reviews');
  });
});
