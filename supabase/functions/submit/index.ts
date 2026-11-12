// Verifies a Cloudflare Turnstile token, then stores a public form (booking
// request or review). Deploy with: supabase functions deploy submit --no-verify-jwt
// Secrets: supabase secrets set TURNSTILE_SECRET=<secret key>
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const SLOTS = ['lunch', 'afternoon', 'evening', 'wedding', 'full'];

function requestRow(r: Record<string, unknown>) {
  const row = {
    first_name: str(r.first_name, 60), second_name: str(r.second_name, 60), third_name: str(r.third_name, 60),
    last_name: str(r.last_name, 60), phone: str(r.phone, 30), date: str(r.date, 10),
    time_slot: str(r.time_slot, 20), event_name: str(r.event_name, 120),
    book_diwan: r.book_diwan === true, status: 'pending', submitted_at: new Date().toISOString(),
  };
  const ok = row.first_name && row.last_name && row.phone && row.event_name
    && /^\d{4}-\d{2}-\d{2}$/.test(row.date) && SLOTS.includes(row.time_slot);
  return ok ? row : null;
}

function reviewRow(r: Record<string, unknown>) {
  const rating = Number(r.rating);
  const date = str(r.event_date, 10);
  const row = {
    reviewer_name: str(r.reviewer_name, 80), event_name: str(r.event_name, 120),
    rating, comment: str(r.comment, 1000), event_date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
    approved: false,
  };
  return row.reviewer_name && Number.isInteger(rating) && rating >= 1 && rating <= 5 ? row : null;
}

async function humanVerified(token: string, ip: string | null) {
  const body = new URLSearchParams({ secret: Deno.env.get('TURNSTILE_SECRET') ?? '', response: token });
  if (ip) body.set('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  return Boolean((await res.json()).success);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method === 'GET') return reply({ ok: true }); // health check
  if (req.method !== 'POST') return reply({ error: 'method' }, 405);

  let input: { kind?: string; row?: Record<string, unknown>; token?: string };
  try { input = await req.json(); } catch { return reply({ error: 'bad json' }, 400); }

  if (!input.token || !(await humanVerified(input.token, req.headers.get('cf-connecting-ip')))) {
    return reply({ error: 'captcha' }, 403);
  }
  const row = input.kind === 'request' ? requestRow(input.row ?? {})
    : input.kind === 'review' ? reviewRow(input.row ?? {}) : null;
  if (!row) return reply({ error: 'invalid' }, 400);

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { error } = await db.from(input.kind === 'request' ? 'booking_requests' : 'reviews').insert(row);
  return error ? reply({ error: 'save' }, 500) : reply({ ok: true });
});
