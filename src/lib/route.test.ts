import { describe, it, expect } from 'vitest';
import { pageFromHash, pageHash } from './route';

describe('page routes', () => {
  it.each(['calendar', 'events', 'request', 'reviews', 'stats', 'admin'] as const)('round-trips %s', (page) => {
    expect(pageFromHash(pageHash(page))).toBe(page);
  });

  it('accepts a hash without the slash', () => expect(pageFromHash('#reviews')).toBe('reviews'));

  it.each(['', '#', '#/', '#/nope', '#/admin/extra'])('falls back to the calendar for %j', (hash) => {
    expect(pageFromHash(hash)).toBe('calendar');
  });
});
