import { addMonths, eachDayOfInterval, endOfMonth, format, getDay, isBefore, parseISO, startOfMonth } from 'date-fns';
import { LEVANTINE_MONTHS } from '@/lib/levantineMonths';
import type { Booking } from '@/types';

export const EVENT_TYPES = ['زفاف', 'خطوبة', 'طلبة', 'غداء', 'أخرى'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

/** Guesses the kind of event from the name the family typed. */
export const eventTypeOf = (name: string): EventType => {
  if (name.includes('زفاف')) return 'زفاف';
  if (name.includes('خطوبة') || name.includes('خطبة')) return 'خطوبة';
  if (name.includes('طلبة') || name.includes('طلب')) return 'طلبة';
  if (name.includes('غداء')) return 'غداء';
  return 'أخرى';
};

/** Month name short enough for a chart axis: "تشرين الثاني" becomes "تشرين 2". */
export const shortMonth = (name: string) => name.replace(/ الأول$/, ' 1').replace(/ الثاني$/, ' 2');

const active = (bookings: Booking[]) => bookings.filter(b => b.status !== 'cancelled');

/** How many events of each kind, most common first (kinds with none are left out). */
export function eventTypeCounts(bookings: Booking[]) {
  const counts = new Map<EventType, number>();
  for (const b of active(bookings)) counts.set(eventTypeOf(b.event_name), (counts.get(eventTypeOf(b.event_name)) ?? 0) + 1);
  return EVENT_TYPES.filter(t => counts.has(t)).map(type => ({ type, count: counts.get(type)! })).sort((a, b) => b.count - a.count);
}

/** The month with the most events, e.g. { month: 'آذار 2027', count: 5 }; null when there are none. */
export function busiestMonth(bookings: Booking[]) {
  const counts = new Map<string, number>();
  for (const b of active(bookings)) {
    const d = parseISO(b.date);
    const label = `${LEVANTINE_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return best ? { month: best[0], count: best[1] } : null;
}

/**
 * Fridays and Saturdays (the favourite days) that are booked or still free, for this month and the
 * next ones. Days already gone are not counted.
 */
export function weekendAvailability(bookings: Booking[], today: Date, months = 6) {
  const booked = new Set(active(bookings).map(b => b.date));
  const firstOfThisMonth = startOfMonth(today);
  return Array.from({ length: months }, (_, i) => {
    const first = addMonths(firstOfThisMonth, i);
    const weekend = eachDayOfInterval({ start: first, end: endOfMonth(first) })
      .filter(d => [5, 6].includes(getDay(d)) && !isBefore(d, today));
    const bookedCount = weekend.filter(d => booked.has(format(d, 'yyyy-MM-dd'))).length;
    return { month: LEVANTINE_MONTHS[first.getMonth()], booked: bookedCount, free: weekend.length - bookedCount };
  });
}
