import { describe, it, expect } from 'vitest';
import { freeSlots, isSlotFree, nextFreeDays, nextFreeWeekend } from './availability';
import { makeBooking } from '@/test/factories';

const day = '2026-06-20';   // a Saturday
describe('availability', () => {
  it('lists the slots still open on a day', () => {
    const b = [makeBooking({ date: day, time_slot: 'lunch' })];
    expect(freeSlots(b, day).map(s => s.value)).toEqual(['afternoon', 'wedding']);
    expect(freeSlots(b, '2026-06-21')).toHaveLength(4);
  });
  it('closes everything for a whole-day booking, but ignores cancelled ones', () => {
    expect(freeSlots([makeBooking({ date: day, time_slot: 'full' })], day)).toEqual([]);
    expect(isSlotFree([makeBooking({ date: day, time_slot: 'full', status: 'cancelled' })], day, 'lunch')).toBe(true);
    expect(isSlotFree([makeBooking({ date: day, time_slot: 'wedding' })], day, 'wedding')).toBe(false);
  });
  it('finds the next free days after a date, skipping booked ones', () => {
    const b = [makeBooking({ date: '2026-06-21' })];
    expect(nextFreeDays(b, day, 2)).toEqual(['2026-06-22', '2026-06-23']);
  });
  it('can look at Fridays and Saturdays only', () => {
    expect(nextFreeDays([], '2026-06-20', 2, true)).toEqual(['2026-06-26', '2026-06-27']);
  });
  it('gives up after a year', () => {
    const b = Array.from({ length: 400 }, (_, i) => makeBooking({ id: `${i}`, date: new Date(Date.UTC(2026, 5, 20 + i)).toISOString().slice(0, 10) }));
    expect(nextFreeDays(b, day, 1)).toEqual([]);
  });
  it('finds the nearest free Friday or Saturday, today included', () => {
    expect(nextFreeWeekend([], new Date(2026, 5, 20))).toBe(day);
    const b = [makeBooking({ date: day })];
    expect(nextFreeWeekend(b, new Date(2026, 5, 20))).toBe('2026-06-26');
    expect(nextFreeWeekend(b, new Date(2026, 5, 17))).toBe('2026-06-19');
  });
  it('returns null when a year has no free weekend', () => {
    const b = Array.from({ length: 400 }, (_, i) => makeBooking({ id: `${i}`, date: new Date(Date.UTC(2026, 5, 17 + i)).toISOString().slice(0, 10) }));
    expect(nextFreeWeekend(b, new Date(2026, 5, 17))).toBeNull();
  });
});
