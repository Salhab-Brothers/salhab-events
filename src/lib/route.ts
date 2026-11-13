import type { PageId } from '@/types';

const PAGE_IDS: readonly PageId[] = ['calendar', 'events', 'request', 'reviews', 'stats', 'admin'];

/** '#/reviews' gives 'reviews'; anything unknown (or empty) falls back to the calendar. */
export const pageFromHash = (hash: string): PageId =>
  PAGE_IDS.find((id) => id === hash.replace(/^#\/?/, '').split('?')[0]) ?? 'calendar';

export const pageHash = (page: PageId): string => `#/${page}`;

/** '#/request?date=2026-12-04' gives '2026-12-04'; null when there is no valid date. */
export const requestDateFromHash = (hash: string): string | null => {
  const date = new URLSearchParams(hash.split('?')[1] ?? '').get('date');
  return date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
};
