import { TIME_SLOT_LABELS } from '@/lib/data';
import type { Booking } from '@/types';

const PHONE_LIKE = /^\+[\d\s-]+$/;

/**
 * Quotes a cell for CSV. Cells starting with = + - @ are prefixed with an apostrophe
 * so spreadsheets do not evaluate them as formulas (names come from public requests).
 * International phone numbers such as "+972 50-123-4567" are left alone.
 */
export const csvCell = (value: string): string => {
  const risky = /^[=+\-@]/.test(value) && !PHONE_LIKE.test(value);
  const safe = risky ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
};

const HEADER = ['التاريخ', 'المناسبة', 'الوقت', 'المسؤول', 'الهاتف', 'الحالة', 'الديوان', 'ملاحظات'];

/** All bookings, oldest first, as a UTF-8 CSV (with BOM so Excel reads Arabic correctly). */
export const bookingsToCsv = (bookings: Booking[]): string => {
  const rows = [...bookings]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(b => [
      b.date, b.event_name, TIME_SLOT_LABELS[b.time_slot], b.person_name,
      b.phone ?? '', b.status, b.book_diwan ? 'نعم' : 'لا', b.notes ?? '',
    ]);
  return '﻿' + [HEADER, ...rows].map(r => r.map(csvCell).join(',')).join('\n');
};
