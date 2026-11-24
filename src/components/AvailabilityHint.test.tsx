import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { addDays, format, getDay } from 'date-fns';
import AvailabilityHint from './AvailabilityHint';
import { makeBooking } from '@/test/factories';

const today = new Date(2026, 5, 15);
const iso = (d: Date) => format(d, 'yyyy-MM-dd');
const show = (bookings: ReturnType<typeof makeBooking>[], date: string, slot: 'lunch' | 'afternoon' | 'wedding' | 'full' = 'lunch') =>
  render(<AvailabilityHint bookings={bookings} date={date} slot={slot} today={today} onPick={vi.fn()} />);

describe('AvailabilityHint', () => {
  it('shows nothing when no Friday or Saturday is free for a whole year', () => {
    const booked = Array.from({ length: 370 }, (_, i) => addDays(today, i))
      .filter(d => [5, 6].includes(getDay(d)))
      .map((d, i) => makeBooking({ id: `w${i}`, date: iso(d), time_slot: 'full' }));
    const { container } = show(booked, '');
    expect(container).toBeEmptyDOMElement();
  });
  it('offers the other times of a partly booked day, and no other days', () => {
    show([makeBooking({ date: '2026-07-04', time_slot: 'lunch' })], '2026-07-04');
    expect(screen.getByText('متاح في نفس اليوم:')).toBeInTheDocument();
    expect(screen.queryByText('أقرب أيام متاحة:')).toBeNull();
  });
  it('offers other days, and no other times, when the whole day is taken', () => {
    show([makeBooking({ date: '2026-07-04', time_slot: 'full' })], '2026-07-04');
    expect(screen.getByText('أقرب أيام متاحة:')).toBeInTheDocument();
    expect(screen.queryByText('متاح في نفس اليوم:')).toBeNull();
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });
});
