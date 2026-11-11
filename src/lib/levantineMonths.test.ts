import { describe, it, expect } from 'vitest';
import {
  LEVANTINE_MONTHS, LEVANTINE_MONTHS_SHORT,
  formatMonthYear, formatFullDate, formatFullDateStr, formatMonthYearStr,
} from './levantineMonths';

describe('levantineMonths', () => {
  it('has twelve months and a matching short list', () => {
    expect(LEVANTINE_MONTHS).toHaveLength(12);
    expect(LEVANTINE_MONTHS_SHORT).toEqual(LEVANTINE_MONTHS);
  });

  it('formats a Date as month and year', () => {
    expect(formatMonthYear(new Date(2026, 4, 5))).toBe('أيار، 5 / 2026');
  });

  it('accepts a non-Date value for month and year', () => {
    expect(formatMonthYear('2026-01-15T12:00:00')).toBe('كانون الثاني، 1 / 2026');
  });

  it('formats a full date with weekday', () => {
    expect(formatFullDate(new Date(2026, 4, 1))).toBe('الجمعة، 1 أيار، 5 / 2026');
  });

  it('accepts a non-Date value for the full date', () => {
    expect(formatFullDate('2026-05-03T12:00:00')).toBe('الأحد، 3 أيار، 5 / 2026');
  });

  it('formats a yyyy-MM-dd string without timezone shift', () => {
    expect(formatFullDateStr('2026-12-31')).toBe('الخميس، 31 كانون الأول، 12 / 2026');
  });

  it('formats yyyy-MM and yyyy-MM-dd strings as month and year', () => {
    expect(formatMonthYearStr('2026-08')).toBe('آب، 8 / 2026');
    expect(formatMonthYearStr('2027-03-09')).toBe('آذار، 3 / 2027');
  });
});
