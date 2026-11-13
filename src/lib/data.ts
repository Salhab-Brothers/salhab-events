import type { TimeSlot, BookingStatus, RequestStatus } from '@/types';

export const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
  lunch:     'ظهراً',
  afternoon: 'عصراً',
  wedding:   'مساءً',
  full:      'اليوم كاملاً',
  // legacy fallbacks
  morning:   'ظهراً',
  evening:   'مساءً',
};

export const STATUS_LABELS: Record<BookingStatus, string> = {
  confirmed: 'مؤكد',
  pending: 'معلّق',
  cancelled: 'ملغي',
};

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  pending: 'بانتظار المراجعة',
  approved: 'مقبول',
  rejected: 'مرفوض',
};

export type CanonicalSlot = 'lunch' | 'afternoon' | 'wedding' | 'full';

/** Maps legacy slot names to the current ones. */
export const normalizeSlot = (s: TimeSlot): CanonicalSlot =>
  s === 'morning' ? 'lunch' : s === 'evening' ? 'wedding' : s;

/** Slots a booking or request can be made for (legacy names excluded). */
export const BOOKABLE_SLOTS: { value: CanonicalSlot; label: string }[] = [
  { value: 'lunch', label: TIME_SLOT_LABELS.lunch },
  { value: 'afternoon', label: TIME_SLOT_LABELS.afternoon },
  { value: 'wedding', label: TIME_SLOT_LABELS.wedding },
  { value: 'full', label: TIME_SLOT_LABELS.full },
];

/** Two bookings on one day clash when either takes the whole day or both want the same slot. */
export const slotsClash = (a: TimeSlot, b: TimeSlot): boolean => {
  const [x, y] = [normalizeSlot(a), normalizeSlot(b)];
  return x === y || x === 'full' || y === 'full';
};
