import { describe, it, expect } from 'vitest';
import { makeBooking } from '@/test/factories';
import { eventTypeOf, eventTypeCounts, busiestMonth, weekendAvailability, shortMonth } from './stats';

describe('eventTypeOf', () => {
  it.each([
    ['زفاف أحمد', 'زفاف'], ['خطوبة سعد', 'خطوبة'], ['خطبة سعد', 'خطوبة'], ['طلبة لينا', 'طلبة'], ['طلب يد', 'طلبة'],
    ['غداء العائلة', 'غداء'], ['تجمع', 'أخرى'],
  ])('%s is %s', (name, type) => expect(eventTypeOf(name)).toBe(type));
});

describe('eventTypeCounts', () => {
  it('counts by kind, most common first, ignoring cancelled and empty kinds', () => {
    const out = eventTypeCounts([
      makeBooking({ id: '1', event_name: 'غداء أ' }),
      makeBooking({ id: '2', event_name: 'زفاف ب' }),
      makeBooking({ id: '3', event_name: 'زفاف ج' }),
      makeBooking({ id: '4', event_name: 'زفاف د', status: 'cancelled' }),
    ]);
    expect(out).toEqual([{ type: 'زفاف', count: 2 }, { type: 'غداء', count: 1 }]);
  });
  it('is empty without bookings', () => expect(eventTypeCounts([])).toEqual([]));
});

describe('busiestMonth', () => {
  it('finds the month with the most events', () => {
    expect(busiestMonth([
      makeBooking({ id: '1', date: '2026-07-04' }), makeBooking({ id: '2', date: '2026-07-20' }),
      makeBooking({ id: '3', date: '2026-08-01' }),
    ])).toEqual({ month: 'تموز 2026', count: 2 });
  });
  it('is null without bookings', () => expect(busiestMonth([])).toBeNull());
});

describe('weekendAvailability', () => {
  // 15 June 2026 is a Monday. Fridays and Saturdays left in June: 19, 20, 26, 27.
  const today = new Date(2026, 5, 15);
  it('counts remaining Fridays and Saturdays as booked or free, month by month', () => {
    const out = weekendAvailability([
      makeBooking({ id: '1', date: '2026-06-19' }),
      makeBooking({ id: '2', date: '2026-06-20' }),
      makeBooking({ id: '3', date: '2026-06-26', status: 'cancelled' }),
      makeBooking({ id: '4', date: '2026-06-10' }),   // already past: not counted anywhere
    ], today, 2);
    expect(out[0]).toEqual({ month: 'حزيران', booked: 2, free: 2 });
    expect(out[1].month).toBe('تموز');
    expect(out[1].booked).toBe(0);
    expect(out[1].free).toBe(9);   // July 2026 has 5 Fridays and 4 Saturdays
  });
  it('covers six months by default', () => expect(weekendAvailability([], today)).toHaveLength(6));
});

describe('shortMonth', () => {
  it('shortens the months whose names have a second word, leaves the rest', () => {
    expect(shortMonth('تشرين الثاني')).toBe('تشرين 2');
    expect(shortMonth('كانون الأول')).toBe('كانون 1');
    expect(shortMonth('آذار')).toBe('آذار');
  });
});
