import { createClient, type PostgrestError } from '@supabase/supabase-js';
import type { Booking, BookingRequest, Review, NewRow } from '@/types';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
if (!url || !key) {
  throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are required');
}

export const supabase = createClient(url, key);

const check = <T,>({ data, error }: { data: T; error: PostgrestError | null }): T => {
  if (error) throw error;
  return data;
};

export const PUBLIC_BOOKING_COLUMNS =
  'id,date,event_name,time_slot,person_name,status,book_diwan,created_date';

export interface Entity<T> {
  /** '-created_date' means newest first, 'created_date' oldest first. */
  list: (sort?: string, limit?: number, columns?: string) => Promise<T[]>;
  create: (row: NewRow<T>) => Promise<unknown>;
  update: (id: string, patch: NewRow<T>) => Promise<unknown>;
  delete: (id: string) => Promise<unknown>;
}

const entity = <T>(table: string): Entity<T> => ({
  list: async (sort = '-created_date', limit = 200, columns = '*') =>
    check(await supabase.from(table).select(columns)
      .order(sort.replace(/^-/, ''), { ascending: !sort.startsWith('-') })
      .limit(limit)) as unknown as T[],
  // No generated database types, so rows are cast at the client boundary.
  create: async (row) => check(await supabase.from(table).insert(row as never)),
  update: async (id, patch) => check(await supabase.from(table).update(patch as never).eq('id', id)),
  delete: async (id) => check(await supabase.from(table).delete().eq('id', id)),
});

export const entities = {
  Booking: entity<Booking>('bookings'),
  BookingRequest: entity<BookingRequest>('booking_requests'),
  Review: entity<Review>('reviews'),
};
