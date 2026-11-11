import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DayCell, { type SlotStatus } from './DayCell';
import DayDetailModal from './DayDetailModal';
import CalendarGrid from './CalendarGrid';
import { getIslamicEvents } from '@/lib/islamicDates';
import { makeBooking } from '@/test/factories';

vi.mock('@/components/EventCardDownload', () => ({
  default: ({ booking }: { booking: { event_name: string } }) => <span>card:{booking.event_name}</span>,
}));

const cellProps = {
  day: new Date(2026, 5, 9),
  dateStr: '2026-06-09',
  status: 'free' as SlotStatus,
  isToday: false,
  isFriSat: false,
  hasBooking: false,
  hasConflict: false,
};

describe('DayCell', () => {
  it.each(['free', 'daytime', 'wedding', 'mixed', 'full'] as SlotStatus[])('renders %s', (status) => {
    render(<DayCell {...cellProps} status={status} />);
    expect(screen.getByRole('button')).toHaveTextContent('9');
  });

  it('highlights weekends only when free', () => {
    const { rerender } = render(<DayCell {...cellProps} isFriSat />);
    expect(screen.getByRole('button').className).toContain('ring-primary/20');
    rerender(<DayCell {...cellProps} isFriSat status="full" />);
    expect(screen.getByRole('button').className).not.toContain('ring-primary/20');
  });

  it('marks today', () => {
    render(<DayCell {...cellProps} isToday />);
    expect(screen.getByRole('button').className).toContain('ring-primary ');
  });

  it('shows the conflict warning and booking dot', () => {
    render(<DayCell {...cellProps} hasConflict hasBooking />);
    expect(screen.getByTitle('تعارض في الحجز')).toBeInTheDocument();
    expect(screen.getByRole('button').querySelector('.rounded-full')).not.toBeNull();
  });

  it('decorates Islamic dates, but not when it is today', () => {
    const { rerender } = render(<DayCell {...cellProps} day={new Date(2026, 4, 26)} dateStr="2026-05-26" />);
    expect(screen.getByRole('button').className).toContain('ring-teal-400');
    expect(screen.getByRole('button')).toHaveTextContent('🕌');
    expect(screen.getByRole('button')).toHaveAttribute('title', 'يوم عرفة');
    rerender(<DayCell {...cellProps} day={new Date(2026, 4, 26)} dateStr="2026-05-26" isToday />);
    expect(screen.getByRole('button').className).not.toContain('ring-teal-400');
  });

  it('calls onClick', async () => {
    const onClick = vi.fn();
    render(<DayCell {...cellProps} onClick={onClick} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('DayDetailModal', () => {
  const base = { day: new Date(2026, 5, 19), dayOfWeek: 5, bookings: [], islamicEvents: [], onClose: vi.fn() };

  beforeEach(() => base.onClose.mockClear());

  it('says the day is free and flags weekends', () => {
    render(<DayDetailModal {...base} />);
    expect(screen.getByText('هذا اليوم متاح للحجز')).toBeInTheDocument();
    expect(screen.getByText('يوم مفضل للمناسبات')).toBeInTheDocument();
  });

  it('does not flag weekdays', () => {
    render(<DayDetailModal {...base} dayOfWeek={2} />);
    expect(screen.queryByText('يوم مفضل للمناسبات')).toBeNull();
    const { container } = render(<DayDetailModal {...base} dayOfWeek={6} />);
    expect(container.textContent).toContain('يوم مفضل للمناسبات');
  });

  it('shows Islamic events with no bookings', () => {
    render(<DayDetailModal {...base} islamicEvents={getIslamicEvents('2026-05-26')} />);
    expect(screen.getByText('يوم عرفة')).toBeInTheDocument();
    expect(screen.getByText('لا توجد حجوزات في هذا اليوم')).toBeInTheDocument();
  });

  it('lists bookings without private fields', () => {
    render(<DayDetailModal {...base} bookings={[
      makeBooking({ id: '1', event_name: 'زفاف س', person_name: 'سامي', time_slot: 'wedding', phone: '0501111111', notes: 'سري' }),
    ]} />);
    expect(screen.getByText('زفاف س')).toBeInTheDocument();
    expect(screen.getByText('سامي')).toBeInTheDocument();
    expect(screen.getByText('card:زفاف س')).toBeInTheDocument();
    expect(screen.queryByText('0501111111')).toBeNull();
    expect(screen.queryByText('سري')).toBeNull();
  });

  it('closes from the backdrop, X and close button, but not from inside the card', async () => {
    const { container } = render(<DayDetailModal {...base} />);
    await userEvent.click(screen.getByText('هذا اليوم متاح للحجز'));
    expect(base.onClose).not.toHaveBeenCalled();
    await userEvent.click(screen.getByText('إغلاق'));
    await userEvent.click(container.querySelector('svg.lucide-x')!.closest('button')!);
    await userEvent.click(container.firstElementChild!);
    expect(base.onClose).toHaveBeenCalledTimes(3);
  });
});

describe('CalendarGrid', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 5, 15));
  });
  afterEach(() => vi.useRealTimers());

  const bookings = [
    makeBooking({ id: '1', date: '2026-06-20', time_slot: 'wedding', event_name: 'زفاف وحيد' }),
    makeBooking({ id: '2', date: '2026-06-22', time_slot: 'lunch' }),
    makeBooking({ id: '3', date: '2026-06-22', time_slot: 'wedding' }),
    makeBooking({ id: '4', date: '2026-06-23', time_slot: 'morning' }),
    makeBooking({ id: '5', date: '2026-06-24', time_slot: 'lunch' }),
    makeBooking({ id: '6', date: '2026-06-24', time_slot: 'afternoon' }),
    makeBooking({ id: '7', date: '2026-06-24', time_slot: 'evening' }),
    makeBooking({ id: '8', date: '2026-06-25', time_slot: 'full' }),
    makeBooking({ id: '9', date: '2026-06-26', time_slot: 'wedding' }),
    makeBooking({ id: '10', date: '2026-06-26', time_slot: 'wedding' }),
    makeBooking({ id: '11', date: '2026-06-27', time_slot: 'full' }),
    makeBooking({ id: '12', date: '2026-06-27', time_slot: 'lunch' }),
    makeBooking({ id: '13', date: '2026-06-29', time_slot: 'lunch' }),
    makeBooking({ id: '14', date: '2026-06-29', time_slot: 'afternoon' }),
    makeBooking({ id: '15', date: '2026-06-30', time_slot: 'full', status: 'cancelled' }),
    makeBooking({ id: '16', date: '2026-06-05', time_slot: 'wedding' }),
    makeBooking({ id: '17', date: '2026-05-01', time_slot: 'wedding' }),
    makeBooking({ id: '18', date: '2026-08-10', time_slot: 'lunch', event_name: 'غداء آب' }),
  ];

  // Day cells repeat across months, so look inside one month's block.
  const day = (monthLabel: RegExp, n: string) =>
    within(screen.getByText(monthLabel).parentElement!).getByText(n);

  it('shows the current month plus future months with events only', () => {
    render(<CalendarGrid bookings={bookings} />);
    expect(screen.getByText(/حزيران، 6 \/ 2026/)).toBeInTheDocument();
    expect(screen.getByText(/آب، 8 \/ 2026/)).toBeInTheDocument();
    expect(screen.queryByText(/تموز، 7/)).toBeNull();
    expect(screen.queryByText(/أيار، 5/)).toBeNull();
  });

  it('flags conflicting days only', () => {
    render(<CalendarGrid bookings={bookings} />);
    // 22: lunch+wedding fine; 24: three distinct slots fine; 26 same slot twice; 27 full+lunch; 29 fine
    expect(screen.getAllByTitle('تعارض في الحجز')).toHaveLength(2);
  });

  it('opens the day detail for a booked day and closes it', async () => {
    render(<CalendarGrid bookings={bookings} />);
    await userEvent.click(day(/حزيران/, '20'));
    expect(screen.getByText('زفاف وحيد')).toBeInTheDocument();
    await userEvent.click(screen.getByText('إغلاق'));
    expect(screen.queryByText('زفاف وحيد')).toBeNull();
  });

  it('opens a free future day and a later month day', async () => {
    render(<CalendarGrid bookings={bookings} />);
    await userEvent.click(day(/حزيران/, '18'));
    expect(screen.getByText('هذا اليوم متاح للحجز')).toBeInTheDocument();
    await userEvent.click(screen.getByText('إغلاق'));
    await userEvent.click(day(/آب، 8/, '10'));
    expect(screen.getByText('غداء آب')).toBeInTheDocument();
  });

  it('does not open past days', async () => {
    render(<CalendarGrid bookings={bookings} />);
    await userEvent.click(day(/حزيران/, '5'));
    expect(screen.queryByText('إغلاق')).toBeNull();
  });

  it('works with no bookings and shows the legend', () => {
    render(<CalendarGrid bookings={[]} />);
    expect(screen.getByText('اليوم كاملاً')).toBeInTheDocument();
    expect(screen.getByText(/يوم عرفة/)).toBeInTheDocument();
  });

  it('shows Islamic event details when clicking such a day', async () => {
    vi.setSystemTime(new Date(2026, 4, 10));
    render(<CalendarGrid bookings={[]} />);
    await userEvent.click(screen.getByText('26'));
    expect(screen.getByText('يوم عرفة')).toBeInTheDocument();
    expect(screen.getByText('لا توجد حجوزات في هذا اليوم')).toBeInTheDocument();
  });
});
