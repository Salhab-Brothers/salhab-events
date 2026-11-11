import { describe, it, expect, vi, beforeEach } from 'vitest';
import { makeQuery } from '@/test/queryMock';

const from = vi.fn();
vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => ({ from })) }));

const load = async () => {
  vi.resetModules();
  return import('./api');
};

describe('api', () => {
  beforeEach(() => from.mockReset());

  it('fails fast without configuration', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    await expect(load()).rejects.toThrow('VITE_SUPABASE_URL');
    vi.stubEnv('VITE_SUPABASE_URL', 'http://localhost:54321');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', '');
    await expect(load()).rejects.toThrow('VITE_SUPABASE_PUBLISHABLE_KEY');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'test-key');
  });

  it('lists newest first by default with all columns', async () => {
    const q = makeQuery({ data: [{ id: 1 }], error: null });
    from.mockReturnValue(q);
    const { entities } = await load();
    await expect(entities.Booking.list()).resolves.toEqual([{ id: 1 }]);
    expect(from).toHaveBeenCalledWith('bookings');
    expect(q.select).toHaveBeenCalledWith('*');
    expect(q.order).toHaveBeenCalledWith('created_date', { ascending: false });
    expect(q.limit).toHaveBeenCalledWith(200);
  });

  it('lists oldest first with explicit columns and limit', async () => {
    const q = makeQuery({ data: [], error: null });
    from.mockReturnValue(q);
    const { entities, PUBLIC_BOOKING_COLUMNS } = await load();
    await entities.BookingRequest.list('created_date', 5, PUBLIC_BOOKING_COLUMNS);
    expect(from).toHaveBeenCalledWith('booking_requests');
    expect(q.select).toHaveBeenCalledWith(PUBLIC_BOOKING_COLUMNS);
    expect(q.order).toHaveBeenCalledWith('created_date', { ascending: true });
    expect(q.limit).toHaveBeenCalledWith(5);
    expect(PUBLIC_BOOKING_COLUMNS).not.toMatch(/phone|notes/);
  });

  it('creates, updates and deletes rows', async () => {
    const q = makeQuery({ data: null, error: null });
    from.mockReturnValue(q);
    const { entities } = await load();
    await entities.Review.create({ rating: 5 });
    expect(from).toHaveBeenLastCalledWith('reviews');
    expect(q.insert).toHaveBeenCalledWith({ rating: 5 });
    await entities.Booking.update('b1', { notes: 'x' });
    expect(q.update).toHaveBeenCalledWith({ notes: 'x' });
    expect(q.eq).toHaveBeenLastCalledWith('id', 'b1');
    await entities.Booking.delete('b1');
    expect(q.delete).toHaveBeenCalled();
  });

  it('throws the backend error', async () => {
    const error = new Error('boom');
    from.mockReturnValue(makeQuery({ data: null, error }));
    const { entities } = await load();
    await expect(entities.Booking.list()).rejects.toBe(error);
    await expect(entities.Booking.create({})).rejects.toBe(error);
  });
});
