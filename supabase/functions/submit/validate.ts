// Pure helpers for the submit function. No Deno APIs here, so vitest can import and test them.

export const DEFAULT_ORIGINS = [
  'https://salhab-events.vercel.app',
  'http://localhost:5174',
  'http://localhost:5173',
];
export const SLOTS = ['lunch', 'afternoon', 'evening', 'wedding', 'full'];

export type Row = Record<string, unknown>;

/** A trimmed string cut to `max` characters; anything that is not a string becomes ''. */
export const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** A real calendar date written YYYY-MM-DD (rejects 2026-02-30 and the like). */
export const isIsoDate = (s: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  // An impossible month or day (2027-13-01) gives an invalid Date; a rolled-over one (2027-02-30) changes the text.
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

/** 7 to 15 digits, written with only digits, spaces, +, - and parentheses (the database allows 30 characters). */
export const isValidPhone = (phone: string): boolean => {
  if (phone.length > 30 || !/^[0-9 +\-()]+$/.test(phone)) return false;
  const digits = phone.replace(/\D/g, '').length;
  return digits >= 7 && digits <= 15;
};

export function requestRow(r: Row, now: Date = new Date()): Row | null {
  const phone = typeof r.phone === 'string' ? r.phone.trim() : '';
  const row = {
    first_name: str(r.first_name, 60), second_name: str(r.second_name, 60), third_name: str(r.third_name, 60),
    last_name: str(r.last_name, 60), phone, date: str(r.date, 10),
    time_slot: str(r.time_slot, 20), event_name: str(r.event_name, 120),
    book_diwan: r.book_diwan === true, status: 'pending', submitted_at: now.toISOString(),
  };
  const ok = row.first_name && row.last_name && row.event_name
    && isValidPhone(row.phone) && isIsoDate(row.date) && SLOTS.includes(row.time_slot);
  return ok ? row : null;
}

export function reviewRow(r: Row): Row | null {
  const rating = Number(r.rating);
  const date = str(r.event_date, 10);
  const row = {
    reviewer_name: str(r.reviewer_name, 80), event_name: str(r.event_name, 120),
    rating, comment: str(r.comment, 1000), event_date: isIsoDate(date) ? date : null,
    approved: false,
  };
  return row.reviewer_name && Number.isInteger(rating) && rating >= 1 && rating <= 5 ? row : null;
}

/** The browser origins allowed to call the function: the defaults plus a comma separated ALLOWED_ORIGINS. */
export const allowedOrigins = (extra?: string): Set<string> =>
  new Set([...DEFAULT_ORIGINS, ...(extra ?? '').split(',').map((o) => o.trim()).filter(Boolean)]);

/** CORS headers; the allowed origin is echoed back (never `*`), and the answer always varies by Origin. */
export function corsHeaders(origin: string | null, allowed: Set<string>): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    Vary: 'Origin',
  };
  if (origin && allowed.has(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

/** Cloudflare reports which site solved the challenge. Checked only when expected hostnames are configured. */
export function hostnameAllowed(hostname: unknown, expected?: string): boolean {
  const list = (expected ?? '').split(',').map((h) => h.trim().toLowerCase()).filter(Boolean);
  if (list.length === 0) return true;
  return typeof hostname === 'string' && list.includes(hostname.toLowerCase());
}

/**
 * The key the function uses to write to the database. Prefers the new `default` secret key from
 * SUPABASE_SECRET_KEYS (a JSON dictionary) and falls back to the legacy SUPABASE_SERVICE_ROLE_KEY.
 */
export function pickServiceKey(secretKeysJson?: string, legacyKey?: string): string {
  if (secretKeysJson) {
    try {
      const key = (JSON.parse(secretKeysJson) as Row).default;
      if (typeof key === 'string' && key) return key;
    } catch {
      // Not valid JSON: fall back to the legacy key.
    }
  }
  return legacyKey ?? '';
}
