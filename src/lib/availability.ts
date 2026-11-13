import { addDays, format, getDay, parseISO } from 'date-fns';
import { BOOKABLE_SLOTS, slotsClash, type CanonicalSlot } from '@/lib/data';
import type { Booking } from '@/types';

const iso = (d: Date) => format(d, 'yyyy-MM-dd');
const onDay = (bookings: Booking[], date: string) => bookings.filter(b => b.date === date && b.status !== 'cancelled');

/** Slots still open on a day (a booking for the whole day closes all of them). */
export const freeSlots = (bookings: Booking[], date: string) =>
  BOOKABLE_SLOTS.filter(s => !onDay(bookings, date).some(b => slotsClash(b.time_slot, s.value)));

export const isSlotFree = (bookings: Booking[], date: string, slot: CanonicalSlot) =>
  freeSlots(bookings, date).some(s => s.value === slot);

/** Next days (after `from`, within a year) with nothing booked; optionally only Fridays and Saturdays. */
export function nextFreeDays(bookings: Booking[], from: Date | string, count: number, weekendOnly = false): string[] {
  const start = typeof from === 'string' ? parseISO(from) : from;
  const found: string[] = [];
  for (let i = 1; i <= 365 && found.length < count; i++) {
    const day = addDays(start, i);
    if (weekendOnly && ![5, 6].includes(getDay(day))) continue;
    if (onDay(bookings, iso(day)).length === 0) found.push(iso(day));
  }
  return found;
}

/** The first Friday or Saturday from today on with nothing booked (as yyyy-MM-dd), or null. */
export function nextFreeWeekend(bookings: Booking[], today: Date): string | null {
  if ([5, 6].includes(getDay(today)) && onDay(bookings, iso(today)).length === 0) return iso(today);
  return nextFreeDays(bookings, today, 1, true)[0] ?? null;
}
