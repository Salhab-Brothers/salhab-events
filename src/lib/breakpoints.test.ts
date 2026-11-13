import { describe, it, expect } from 'vitest';
import config from '../../tailwind.config';

// Breakpoints in rem follow the reader's text size; in px they would not (a reader at 200% text would
// get the wide desktop layout on a screen where it no longer fits).
describe('breakpoints', () => {
  it('are all in rem', () => {
    const screens = config.theme?.screens as Record<string, string>;
    expect(Object.keys(screens)).toEqual(['sm', 'md', 'lg', 'xl', '2xl']);
    for (const value of Object.values(screens)) expect(value).toMatch(/^\d+rem$/);
  });
});
