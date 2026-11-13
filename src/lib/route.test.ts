import { describe, it, expect } from 'vitest';
import { pageFromHash, pageHash, requestDateFromHash } from './route';

describe('page routes', () => {
  it.each(['calendar', 'events', 'request', 'reviews', 'stats', 'admin'] as const)('round-trips %s', (page) => {
    expect(pageFromHash(pageHash(page))).toBe(page);
  });

  it('accepts a hash without the slash', () => expect(pageFromHash('#reviews')).toBe('reviews'));

  it.each(['', '#', '#/', '#/nope', '#/admin/extra'])('falls back to the calendar for %j', (hash) => {
    expect(pageFromHash(hash)).toBe('calendar');
  });
});

describe('request date in the hash', () => {
  it('keeps the page and reads the date', () => {
    expect(pageFromHash('#/request?date=2026-12-04')).toBe('request');
    expect(requestDateFromHash('#/request?date=2026-12-04')).toBe('2026-12-04');
  });
  it.each(['#/request', '#/request?date=soon', '#/request?x=1'])('has no date in %j', (h) => expect(requestDateFromHash(h)).toBeNull());
});
