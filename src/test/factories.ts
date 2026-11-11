import type { Booking, BookingRequest, Review } from '@/types';

export const makeBooking = (over: Partial<Booking> = {}): Booking => ({
  id: 'b1',
  date: '2026-06-20',
  event_name: 'زفاف تجريبي',
  time_slot: 'wedding',
  person_name: 'أحمد سلهب',
  status: 'confirmed',
  book_diwan: false,
  created_date: '2026-01-01T00:00:00Z',
  phone: '0501234567',
  notes: '',
  ...over,
});

export const makeRequest = (over: Partial<BookingRequest> = {}): BookingRequest => ({
  id: 'r1',
  first_name: 'خالد',
  second_name: 'أحمد',
  third_name: '',
  last_name: 'سلهب',
  phone: '0501234567',
  date: '2026-07-01',
  time_slot: 'lunch',
  event_name: 'غداء',
  book_diwan: false,
  status: 'pending',
  submitted_at: '2026-01-01T00:00:00Z',
  created_date: '2026-01-01T00:00:00Z',
  ...over,
});

export const makeReview = (over: Partial<Review> = {}): Review => ({
  id: 'v1',
  reviewer_name: 'سارة',
  event_name: 'زفاف',
  rating: 5,
  comment: 'رائع',
  event_date: null,
  approved: false,
  created_date: '2026-01-01T00:00:00Z',
  ...over,
});
