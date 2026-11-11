import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are required');
}

export const supabase = createClient(url, key);

const check = ({ data, error }) => {
  if (error) throw error;
  return data;
};

// '-created_date' means newest first, 'created_date' oldest first.
export const PUBLIC_BOOKING_COLUMNS =
  'id,date,event_name,time_slot,person_name,status,book_diwan,created_date';

const entity = (table) => ({
  list: async (sort = '-created_date', limit = 200, columns = '*') =>
    check(await supabase.from(table).select(columns)
      .order(sort.replace(/^-/, ''), { ascending: !sort.startsWith('-') })
      .limit(limit)),
  create: async (row) => check(await supabase.from(table).insert(row)),
  update: async (id, patch) => check(await supabase.from(table).update(patch).eq('id', id)),
  delete: async (id) => check(await supabase.from(table).delete().eq('id', id)),
});

export const entities = {
  Booking: entity('bookings'),
  BookingRequest: entity('booking_requests'),
  Review: entity('reviews'),
};
