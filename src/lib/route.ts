import type { PageId } from '@/types';

const PAGE_IDS: readonly PageId[] = ['calendar', 'events', 'request', 'reviews', 'stats', 'admin'];

/** '#/reviews' gives 'reviews'; anything unknown (or empty) falls back to the calendar. */
export const pageFromHash = (hash: string): PageId =>
  PAGE_IDS.find((id) => id === hash.replace(/^#\/?/, '')) ?? 'calendar';

export const pageHash = (page: PageId): string => `#/${page}`;
