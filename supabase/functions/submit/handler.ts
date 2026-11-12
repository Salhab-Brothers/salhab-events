// The request handling of the submit function, with its environment passed in so it can be unit tested.
import { allowedOrigins, corsHeaders, hostnameAllowed, requestRow, reviewRow, type Row } from './validate.ts';

export interface Deps {
  env: (name: string) => string | undefined;
  fetch: typeof fetch;
  /** Stores a row; resolves to the database error, or null on success. */
  insert: (table: 'booking_requests' | 'reviews', row: Row) => Promise<{ code?: string; message: string } | null>;
  now?: () => Date;
}

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const MAX_TOKEN = 2048;

export const createHandler = (deps: Deps) => async (req: Request): Promise<Response> => {
  const origin = req.headers.get('origin');
  const allowed = allowedOrigins(deps.env('ALLOWED_ORIGINS'));
  const cors = corsHeaders(origin, allowed);
  const reply = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
  // Browsers always send Origin on a cross-site POST. Requests without one (scripts, tests) are let through,
  // because the captcha is what protects the function, not CORS.
  const badOrigin = origin !== null && !allowed.has(origin);

  if (req.method === 'OPTIONS') return badOrigin ? reply({ error: 'origin' }, 403) : new Response('ok', { headers: cors });
  if (req.method === 'GET') return reply({ ok: true }); // health check
  if (req.method !== 'POST') return reply({ error: 'method' }, 405);
  if (badOrigin) return reply({ error: 'origin' }, 403);

  let input: { kind?: unknown; row?: unknown; token?: unknown };
  try {
    input = await req.json();
  } catch {
    return reply({ error: 'bad json' }, 400);
  }
  if (input === null || typeof input !== 'object') return reply({ error: 'bad json' }, 400);

  const token = typeof input.token === 'string' ? input.token : '';
  if (!token || token.length > MAX_TOKEN) return reply({ error: 'captcha' }, 403);

  let verdict: { success?: boolean; hostname?: string };
  try {
    const body = new URLSearchParams({ secret: deps.env('TURNSTILE_SECRET') ?? '', response: token });
    const ip = req.headers.get('cf-connecting-ip');
    if (ip) body.set('remoteip', ip);
    verdict = await (await deps.fetch(VERIFY_URL, { method: 'POST', body })).json();
  } catch (err) {
    console.error('submit: captcha check unavailable', err);
    return reply({ error: 'captcha unavailable' }, 503);
  }
  if (verdict.success !== true || !hostnameAllowed(verdict.hostname, deps.env('TURNSTILE_EXPECTED_HOSTNAMES'))) {
    return reply({ error: 'captcha' }, 403);
  }

  const data = input.row !== null && typeof input.row === 'object' ? (input.row as Row) : {};
  const isRequest = input.kind === 'request';
  const row = isRequest ? requestRow(data, deps.now?.()) : input.kind === 'review' ? reviewRow(data) : null;
  if (!row) return reply({ error: 'invalid' }, 400);

  const error = await deps.insert(isRequest ? 'booking_requests' : 'reviews', row);
  if (error) {
    console.error('submit: insert failed', error.code, error.message);
    return reply({ error: 'save' }, 500);
  }
  return reply({ ok: true });
};
