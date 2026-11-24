import { describe, it, expect } from 'vitest';
import { eventToIcs } from './ics';
import { makeBooking } from '@/test/factories';

describe('eventToIcs', () => {
  const ics = eventToIcs(makeBooking({ id: 'x1', date: '2026-12-31', event_name: 'عرس, أحمد; سلهب', time_slot: 'wedding' }));
  it('is a one-event all-day calendar', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('DTSTART;VALUE=DATE:20261231');
    expect(ics).toContain('DTEND;VALUE=DATE:20270101');
    expect(ics).toContain('UID:x1@salhab-events');
  });
  it('escapes commas and semicolons and names the time of day', () => {
    expect(ics).toContain('SUMMARY:عرس\\, أحمد\\; سلهب (مساءً)');
  });
  it('leaves out the host name and phone', () => {
    const text = eventToIcs(makeBooking({ person_name: 'سر', phone: '0509998877' }));
    expect(text).not.toContain('سر');
    expect(text).not.toContain('0509998877');
  });
  it('is a complete, well-formed calendar file', () => {
    const lines = ics.split('\r\n');
    expect(lines.slice(0, 4)).toEqual(['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Salhab Events//AR', 'BEGIN:VEVENT']);
    expect(lines.slice(-4)).toEqual(['LOCATION:قاعة أفراح آل سلهب', 'END:VEVENT', 'END:VCALENDAR', '']);
    expect(lines.find(l => l.startsWith('DTSTAMP:'))).toMatch(/^DTSTAMP:\d{8}T\d{6}Z$/);
  });
  it('escapes backslashes and line breaks in the title', () => {
    const text = eventToIcs(makeBooking({ event_name: 'a\\b\nc', time_slot: 'lunch' }));
    expect(text).toContain('SUMMARY:a\\\\b\\nc (');
  });
});
