import { addDays, format, parseISO } from 'date-fns';
import { TIME_SLOT_LABELS } from '@/lib/data';
import type { Booking } from '@/types';

const escape = (s: string) => s.replace(/[\\;,]/g, m => '\\' + m).replace(/\n/g, '\\n');

/** A calendar file for one event. It is an all-day entry; the time of day goes in the title. No names or phone numbers. */
export function eventToIcs(b: Booking): string {
  const day = parseISO(b.date);
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Salhab Events//AR', 'BEGIN:VEVENT',
    `UID:${b.id}@salhab-events`,
    `DTSTAMP:${format(new Date(), "yyyyMMdd'T'HHmmss'Z'")}`,
    `DTSTART;VALUE=DATE:${format(day, 'yyyyMMdd')}`,
    `DTEND;VALUE=DATE:${format(addDays(day, 1), 'yyyyMMdd')}`,
    `SUMMARY:${escape(`${b.event_name} (${TIME_SLOT_LABELS[b.time_slot]})`)}`,
    'LOCATION:قاعة أفراح آل سلهب',
    'END:VEVENT', 'END:VCALENDAR', '',
  ].join('\r\n');
}
