import { describe, it, expect } from 'vitest';
import {
  DEFAULT_ORIGINS, allowedOrigins, corsHeaders, hostnameAllowed, isIsoDate, isValidPhone,
  pickServiceKey, requestRow, reviewRow, str,
} from './validate.ts';

const NOW = new Date('2026-11-12T10:00:00.000Z');
const goodRequest = {
  first_name: 'خالد', second_name: 'أحمد', third_name: '', last_name: 'سلهب',
  phone: '+972 54-527-4483', date: '2027-03-04', time_slot: 'lunch', event_name: 'عرس', book_diwan: true,
};

describe('str', () => {
  it('trims and truncates strings', () => {
    expect(str('  hello  ', 10)).toBe('hello');
    expect(str('abcdef', 3)).toBe('abc');
  });
  it('turns anything that is not a string into an empty string', () => {
    for (const v of [undefined, null, 5, true, {}, ['a']]) expect(str(v, 10)).toBe('');
  });
});

describe('isIsoDate', () => {
  it('accepts real dates, including leap day', () => {
    expect(isIsoDate('2027-03-04')).toBe(true);
    expect(isIsoDate('2028-02-29')).toBe(true);
  });
  it('rejects wrong shapes and impossible dates', () => {
    for (const s of ['', '2027-3-4', '27-03-04', '2027/03/04', '2027-02-30', '2027-13-01', '2027-00-10', '2027-03-04x', '2027-02-29']) {
      expect(isIsoDate(s)).toBe(false);
    }
  });
});

describe('isValidPhone', () => {
  it('accepts common local and international formats', () => {
    for (const p of ['0545274483', '+972 54-527-4483', '(02) 123 4567', '+9725452744830', '1234567']) {
      expect(isValidPhone(p)).toBe(true);
    }
  });
  it('rejects too few or too many digits', () => {
    expect(isValidPhone('123456')).toBe(false);
    expect(isValidPhone('1234567890123456')).toBe(false);
    expect(isValidPhone('')).toBe(false);
  });
  it('rejects letters and other symbols', () => {
    for (const p of ['054527448a', '054.527.4483', '054527#4483', '0545274483;', 'abcdefgh', '054/527/4483']) {
      expect(isValidPhone(p)).toBe(false);
    }
  });
  it('rejects anything longer than the 30 characters the database allows', () => {
    expect(isValidPhone('1'.repeat(15) + ' '.repeat(16))).toBe(false);
  });
});

describe('requestRow', () => {
  it('builds a pending request with a timestamp and clean fields', () => {
    expect(requestRow({ ...goodRequest, first_name: '  خالد ' }, NOW)).toEqual({
      first_name: 'خالد', second_name: 'أحمد', third_name: '', last_name: 'سلهب',
      phone: '+972 54-527-4483', date: '2027-03-04', time_slot: 'lunch', event_name: 'عرس',
      book_diwan: true, status: 'pending', submitted_at: NOW.toISOString(),
    });
  });
  it('uses the current time when none is given', () => {
    expect(typeof requestRow(goodRequest)?.submitted_at).toBe('string');
  });
  it('accepts every bookable slot and refuses others', () => {
    for (const slot of ['lunch', 'afternoon', 'evening', 'wedding', 'full']) {
      expect(requestRow({ ...goodRequest, time_slot: slot })).not.toBeNull();
    }
    expect(requestRow({ ...goodRequest, time_slot: 'midnight' })).toBeNull();
    expect(requestRow({ ...goodRequest, time_slot: '' })).toBeNull();
  });
  it('only treats a literal true as booking the diwan', () => {
    expect(requestRow({ ...goodRequest, book_diwan: 'true' })?.book_diwan).toBe(false);
    expect(requestRow({ ...goodRequest, book_diwan: 1 })?.book_diwan).toBe(false);
    expect(requestRow({ ...goodRequest, book_diwan: undefined })?.book_diwan).toBe(false);
  });
  it('forces the status and ignores fields the visitor should not control', () => {
    const row = requestRow({ ...goodRequest, status: 'approved', id: 'x', approved: true }, NOW);
    expect(row?.status).toBe('pending');
    expect(row).not.toHaveProperty('id');
    expect(row).not.toHaveProperty('approved');
  });
  it('requires a first name, last name, event name, valid phone and real date', () => {
    expect(requestRow({ ...goodRequest, first_name: ' ' })).toBeNull();
    expect(requestRow({ ...goodRequest, last_name: undefined })).toBeNull();
    expect(requestRow({ ...goodRequest, event_name: '' })).toBeNull();
    expect(requestRow({ ...goodRequest, phone: '' })).toBeNull();
    expect(requestRow({ ...goodRequest, phone: 'call me' })).toBeNull();
    expect(requestRow({ ...goodRequest, phone: 12345678 })).toBeNull();
    expect(requestRow({ ...goodRequest, date: '2027-02-30' })).toBeNull();
    expect(requestRow({ ...goodRequest, date: undefined })).toBeNull();
  });
  it('cuts overlong names to the database limits', () => {
    const row = requestRow({ ...goodRequest, first_name: 'a'.repeat(100), event_name: 'b'.repeat(500) });
    expect((row?.first_name as string).length).toBe(60);
    expect((row?.event_name as string).length).toBe(120);
  });
});

describe('reviewRow', () => {
  const good = { reviewer_name: 'سارة', event_name: 'عرس', rating: 5, comment: 'ممتاز', event_date: '2027-01-02' };
  it('builds an unapproved review', () => {
    expect(reviewRow(good)).toEqual({ ...good, approved: false });
  });
  it('always stores the review as unapproved, whatever the visitor sends', () => {
    expect(reviewRow({ ...good, approved: true })?.approved).toBe(false);
  });
  it('accepts ratings 1 to 5 only, as whole numbers', () => {
    for (const r of [1, 2, 3, 4, 5, '4']) expect(reviewRow({ ...good, rating: r })).not.toBeNull();
    for (const r of [0, 6, -1, 4.5, 'x', undefined, null, NaN]) expect(reviewRow({ ...good, rating: r })).toBeNull();
  });
  it('requires a reviewer name', () => {
    expect(reviewRow({ ...good, reviewer_name: '  ' })).toBeNull();
    expect(reviewRow({ ...good, reviewer_name: undefined })).toBeNull();
  });
  it('stores no event date when it is missing or not a real date', () => {
    expect(reviewRow({ ...good, event_date: '' })?.event_date).toBeNull();
    expect(reviewRow({ ...good, event_date: '2027-02-30' })?.event_date).toBeNull();
    expect(reviewRow({ ...good, event_date: undefined })?.event_date).toBeNull();
  });
  it('cuts overlong text to the database limits', () => {
    const row = reviewRow({ ...good, comment: 'c'.repeat(5000), reviewer_name: 'n'.repeat(500) });
    expect((row?.comment as string).length).toBe(1000);
    expect((row?.reviewer_name as string).length).toBe(80);
  });
});

describe('allowedOrigins', () => {
  it('always includes the defaults', () => {
    expect([...allowedOrigins()].sort()).toEqual([...DEFAULT_ORIGINS].sort());
    expect(allowedOrigins('').size).toBe(DEFAULT_ORIGINS.length);
  });
  it('adds a comma separated list, trimmed, ignoring blanks', () => {
    const set = allowedOrigins(' https://a.example , ,https://b.example');
    expect(set.has('https://a.example')).toBe(true);
    expect(set.has('https://b.example')).toBe(true);
    expect(set.size).toBe(DEFAULT_ORIGINS.length + 2);
  });
});

describe('corsHeaders', () => {
  const allowed = allowedOrigins();
  it('echoes an allowed origin, never a wildcard', () => {
    const h = corsHeaders('https://salhab-events.vercel.app', allowed);
    expect(h['Access-Control-Allow-Origin']).toBe('https://salhab-events.vercel.app');
    expect(h['Access-Control-Allow-Origin']).not.toBe('*');
    expect(h.Vary).toBe('Origin');
    expect(h['Access-Control-Allow-Headers']).toContain('content-type');
  });
  it('gives no allow-origin header for unknown origins or no origin, but still varies by Origin', () => {
    for (const origin of ['https://evil.example', 'null', '', null]) {
      const h = corsHeaders(origin, allowed);
      expect(h).not.toHaveProperty('Access-Control-Allow-Origin');
      expect(h.Vary).toBe('Origin');
    }
  });
  it('does not match origins that only share a prefix', () => {
    expect(corsHeaders('https://salhab-events.vercel.app.evil.example', allowed)).not.toHaveProperty('Access-Control-Allow-Origin');
  });
});

describe('hostnameAllowed', () => {
  it('accepts anything when no expected hostnames are configured', () => {
    expect(hostnameAllowed('whatever.example')).toBe(true);
    expect(hostnameAllowed(undefined, '')).toBe(true);
    expect(hostnameAllowed(undefined, ' , ')).toBe(true);
  });
  it('accepts only listed hostnames, ignoring case and spaces', () => {
    const expected = 'salhab-events.vercel.app, Other.Example';
    expect(hostnameAllowed('salhab-events.vercel.app', expected)).toBe(true);
    expect(hostnameAllowed('OTHER.example', expected)).toBe(true);
    expect(hostnameAllowed('evil.example', expected)).toBe(false);
    expect(hostnameAllowed('sub.salhab-events.vercel.app', expected)).toBe(false);
  });
  it('refuses a missing or non-string hostname when hostnames are configured', () => {
    expect(hostnameAllowed(undefined, 'a.example')).toBe(false);
    expect(hostnameAllowed(42, 'a.example')).toBe(false);
  });
});

describe('pickServiceKey', () => {
  it('prefers the default key of the new secret keys', () => {
    expect(pickServiceKey('{"default":"sb_secret_new"}', 'legacy-jwt')).toBe('sb_secret_new');
  });
  it('falls back to the legacy key when the new one is missing, empty, malformed or has no default', () => {
    for (const raw of [undefined, '', 'not json', '{}', '{"default":""}', '{"default":5}', '{"other":"x"}']) {
      expect(pickServiceKey(raw, 'legacy-jwt')).toBe('legacy-jwt');
    }
  });
  it('returns an empty key when nothing is configured', () => {
    expect(pickServiceKey(undefined, undefined)).toBe('');
  });
});
