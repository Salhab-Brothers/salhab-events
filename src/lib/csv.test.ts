import { describe, it, expect } from 'vitest';
import { csvCell, bookingsToCsv } from './csv';
import { makeBooking } from '@/test/factories';

describe('csvCell', () => {
  it('quotes plain text', () => {
    expect(csvCell('hello')).toBe('"hello"');
  });

  it('escapes quotes, commas and newlines inside the quotes', () => {
    expect(csvCell('a "b", c\nd')).toBe('"a ""b"", c\nd"');
  });

  it('keeps international phone numbers as they are', () => {
    expect(csvCell('+972 50-123-4567')).toBe('"+972 50-123-4567"');
    expect(csvCell('+972501234567')).toBe('"+972501234567"');
  });

  it.each(['=SUM(A1)', '+1+1', '-1', '@cmd', '+cmd|calc'])('neutralises the formula start in %s', (v) => {
    expect(csvCell(v)).toBe(`"'${v}"`);
  });
});

describe('bookingsToCsv', () => {
  it('starts with a BOM and a header row', () => {
    const csv = bookingsToCsv([]);
    expect(csv.startsWith('﻿"التاريخ"')).toBe(true);
    expect(csv.split('\n')).toHaveLength(1);
  });

  it('lists bookings oldest first without mutating the input', () => {
    const later = makeBooking({ id: '2', date: '2026-09-01', event_name: 'لاحق' });
    const earlier = makeBooking({ id: '1', date: '2026-07-01', event_name: 'أبكر' });
    const input = [later, earlier];
    const lines = bookingsToCsv(input).split('\n');
    expect(lines[1]).toContain('أبكر');
    expect(lines[2]).toContain('لاحق');
    expect(input[0]).toBe(later);
  });

  it('formats slot, diwan flag and missing private fields', () => {
    const [, row] = bookingsToCsv([
      makeBooking({ time_slot: 'full', book_diwan: true, phone: undefined, notes: undefined, status: 'pending' }),
    ]).split('\n');
    expect(row).toContain('"اليوم كاملاً"');
    expect(row).toContain('"نعم"');
    expect(row).toContain('"pending"');
    expect(row.endsWith('"pending","نعم",""')).toBe(true);
  });

  it('marks bookings without a diwan', () => {
    expect(bookingsToCsv([makeBooking({ book_diwan: false })])).toContain('"لا"');
  });
});
