import { parseISO } from 'date-fns';

/**
 * Levantine (Syriac) Arabic month names.
 * Index 0 = January, Index 11 = December.
 */
export const LEVANTINE_MONTHS = [
  'كانون الثاني',
  'شباط',
  'آذار',
  'نيسان',
  'أيار',
  'حزيران',
  'تموز',
  'آب',
  'أيلول',
  'تشرين الأول',
  'تشرين الثاني',
  'كانون الأول',
];

/** Short names (same, kept for compatibility) */
export const LEVANTINE_MONTHS_SHORT = [
  'كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران',
  'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول',
];

const WEEKDAY_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

/**
 * Format a Date object as "أيار، 5 / 2026"
 */
export function formatMonthYear(date: Date | string | number) {
  const d = date instanceof Date ? date : new Date(date);
  const monthName = LEVANTINE_MONTHS[d.getMonth()];
  const monthNum = d.getMonth() + 1;
  const year = d.getFullYear();
  return `${monthName}، ${monthNum} / ${year}`;
}

/**
 * Format a Date object as "الجمعة، 1 أيار، 5 / 2026"
 */
export function formatFullDate(date: Date | string | number) {
  const d = date instanceof Date ? date : new Date(date);
  const dow = WEEKDAY_AR[d.getDay()];
  const day = d.getDate();
  const monthName = LEVANTINE_MONTHS[d.getMonth()];
  const monthNum = d.getMonth() + 1;
  const year = d.getFullYear();
  return `${dow}، ${day} ${monthName}، ${monthNum} / ${year}`;
}

/**
 * Format a date string "yyyy-MM-dd" as "الجمعة، 1 أيار، 5 / 2026"
 */
export function formatFullDateStr(dateStr: string) {
  // parseISO reads a date-only string as a local date, so the UTC offset cannot shift the day
  return formatFullDate(parseISO(dateStr));
}

/**
 * Format a date string "yyyy-MM" or "yyyy-MM-dd" as "أيار، 5 / 2026"
 */
export function formatMonthYearStr(dateStr: string) {
  return formatMonthYear(parseISO(dateStr));
}