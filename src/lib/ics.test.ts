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
});
