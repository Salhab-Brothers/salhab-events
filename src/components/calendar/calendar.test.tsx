import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@/test/user';
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

  it('offers to request a free day that is still ahead, but not one that has passed', () => {
    const { unmount } = render(<DayDetailModal {...base} day={new Date(2099, 11, 4)} />);
    expect(screen.getByRole('link', { name: 'اطلب هذا اليوم' })).toHaveAttribute('href', '#/request?date=2099-12-04');
    unmount();
    render(<DayDetailModal {...base} />);
    expect(screen.queryByRole('link', { name: 'اطلب هذا اليوم' })).toBeNull();
  });

  it('saves an event to the calendar as an .ics file', async () => {
    const create = vi.fn(() => 'blob:x');
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<DayDetailModal {...base} bookings={[makeBooking({ date: '2026-06-19' })]} />);
    await userEvent.click(screen.getByRole('button', { name: /تقويمي/ }));
    expect(create).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    click.mockRestore();
  });

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

  it('lists the bookings, not the empty message, on a holiday that has events', () => {
    render(<DayDetailModal {...base} islamicEvents={getIslamicEvents('2026-05-26')} bookings={[makeBooking({ id: 'h1', event_name: 'زفاف عرفة' })]} />);
    expect(screen.getByText('زفاف عرفة')).toBeInTheDocument();
    expect(screen.queryByText('لا توجد حجوزات في هذا اليوم')).toBeNull();
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

  it('is a labelled dialog that closes with Escape and gives focus back to what opened it', () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
    const onClose = vi.fn();
    const { unmount } = render(<DayDetailModal {...base} onClose={onClose} />);
    const dialog = screen.getByRole('dialog', { hidden: true });
    expect(dialog).toHaveAccessibleName(/2026/);
    // Escape asks the dialog to cancel; the page decides to close it (and the default close is prevented).
    const cancel = new Event('cancel', { cancelable: true });
    dialog.dispatchEvent(cancel);
    expect(cancel.defaultPrevented).toBe(true);
    expect(onClose).toHaveBeenCalledTimes(1);
    unmount();
    expect(opener).toHaveFocus();
    opener.remove();
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

describe('CalendarGrid details', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 5, 15));   // Monday 15 June 2026
  });
  afterEach(() => vi.useRealTimers());

  const at = (monthLabel: RegExp, n: string) =>
    within(screen.getByText(monthLabel).parentElement!).getByText(n).closest('button')!;
  const june = (n: string) => at(/حزيران، 6/, n);
  const looks = (el: HTMLElement) => ['emerald-50', 'amber-100', 'violet-100', 'orange-100', 'red-100'].filter(c => el.className.includes(`bg-${c}`));

  const week = [
    makeBooking({ id: '1', date: '2026-06-20', time_slot: 'wedding' }),
    makeBooking({ id: '2', date: '2026-06-22', time_slot: 'lunch' }), makeBooking({ id: '3', date: '2026-06-22', time_slot: 'wedding' }),
    makeBooking({ id: '4', date: '2026-06-23', time_slot: 'morning' }),
    makeBooking({ id: '5', date: '2026-06-24', time_slot: 'lunch' }), makeBooking({ id: '6', date: '2026-06-24', time_slot: 'afternoon' }),
    makeBooking({ id: '7', date: '2026-06-24', time_slot: 'evening' }),
    makeBooking({ id: '8', date: '2026-06-25', time_slot: 'full' }),
    makeBooking({ id: '9', date: '2026-06-29', time_slot: 'lunch' }), makeBooking({ id: '10', date: '2026-06-29', time_slot: 'afternoon' }),
    makeBooking({ id: '11', date: '2026-06-30', time_slot: 'full', status: 'cancelled' }),
  ];

  it('colours each day by what is booked on it', () => {
    render(<CalendarGrid bookings={week} />);
    expect(looks(june('18'))).toEqual(['emerald-50']);     // nothing booked
    expect(looks(june('20'))).toEqual(['violet-100']);     // evening only
    expect(looks(june('22'))).toEqual(['orange-100']);     // lunch and evening
    expect(looks(june('23'))).toEqual(['amber-100']);      // lunch (old name) only
    expect(looks(june('24'))).toEqual(['red-100']);        // all three slots count as full
    expect(looks(june('25'))).toEqual(['red-100']);        // whole day
    expect(looks(june('29'))).toEqual(['amber-100']);      // lunch and afternoon
    expect(looks(june('30'))).toEqual(['emerald-50']);     // cancelled does not count
  });

  it('shows the booking dot and the conflict warning only on days ahead', () => {
    render(<CalendarGrid bookings={[
      ...week,
      makeBooking({ id: 'p1', date: '2026-06-03', time_slot: 'lunch' }), makeBooking({ id: 'p2', date: '2026-06-03', time_slot: 'lunch' }),
    ]} />);
    expect(june('20').querySelector('.rounded-full')).not.toBeNull();
    expect(june('18').querySelector('.rounded-full')).toBeNull();
    expect(june('3').querySelector('.rounded-full')).toBeNull();
    expect(within(june('3')).queryByTitle('تعارض في الحجز')).toBeNull();
    expect(looks(june('3'))).toEqual(['emerald-50']);
  });

  it('lets today be opened, but not yesterday', async () => {
    render(<CalendarGrid bookings={[]} />);
    await userEvent.click(june('14'));
    expect(screen.queryByText('إغلاق')).toBeNull();
    await userEvent.click(june('15'));
    expect(screen.getByText('إغلاق')).toBeInTheDocument();
  });

  it('rings free Fridays and Saturdays only', () => {
    render(<CalendarGrid bookings={[]} />);
    for (const n of ['19', '20', '26']) expect(june(n).className).toContain('ring-primary/20');
    for (const n of ['17', '18', '21', '22']) expect(june(n).className).not.toContain('ring-primary/20');
  });

  it('starts each month in the right column, with the week starting on Saturday', () => {
    render(<CalendarGrid bookings={[]} />);
    const grid = june('1').parentElement!;
    expect([...grid.children].indexOf(june('1'))).toBe(2);   // 1 June 2026 is a Monday: Saturday and Sunday come first
    expect(june('1').parentElement).toBe(june('30').parentElement);
  });

  it('heads the columns Saturday to Friday and highlights the weekend', () => {
    render(<CalendarGrid bookings={[]} />);
    const heads = [...june('1').parentElement!.previousElementSibling!.children] as HTMLElement[];
    expect(heads.map(h => h.querySelector('.sr-only')!.textContent)).toEqual(['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة']);
    expect(heads.map(h => h.className.includes('text-primary'))).toEqual([true, false, false, false, false, false, true]);
  });

  it('lists months in order, from this month on, and skips months that only have cancelled events', () => {
    render(<CalendarGrid bookings={[
      makeBooking({ id: 'a', date: '2026-10-05' }), makeBooking({ id: 'b', date: '2026-08-10' }),
      makeBooking({ id: 'c', date: '2026-09-09', status: 'cancelled' }), makeBooking({ id: 'd', date: '2026-04-09' }),
    ]} />);
    const months = screen.getAllByRole('heading', { level: 3 }).map(h => h.textContent);
    expect(months).toEqual(['حزيران، 6 / 2026', 'آب، 8 / 2026', 'تشرين الأول، 10 / 2026']);
  });

  it('follows the bookings when they change', () => {
    const { rerender } = render(<CalendarGrid bookings={[]} />);
    expect(looks(june('20'))).toEqual(['emerald-50']);
    rerender(<CalendarGrid bookings={[makeBooking({ id: 'n', date: '2026-06-20', time_slot: 'full' }), makeBooking({ id: 'm', date: '2026-11-02' })]} />);
    expect(looks(june('20'))).toEqual(['red-100']);
    expect(screen.getByText(/تشرين الثاني، 11/)).toBeInTheDocument();
  });

  it('flags a day where one slot is double booked even if another slot is booked once', () => {
    render(<CalendarGrid bookings={[
      makeBooking({ id: 'x1', date: '2026-06-24', time_slot: 'lunch' }), makeBooking({ id: 'x2', date: '2026-06-24', time_slot: 'lunch' }),
      makeBooking({ id: 'x3', date: '2026-06-24', time_slot: 'wedding' }),
    ]} />);
    expect(within(june('24')).getByTitle('تعارض في الحجز')).toBeInTheDocument();
  });

  it('explains the colours and the holiday rings in the legend', () => {
    const { container } = render(<CalendarGrid bookings={[]} />);
    const legend = container.firstElementChild!.firstElementChild!.firstElementChild!;
    expect(legend.querySelectorAll('span.w-4')).toHaveLength(8);   // five colours and three holiday rings, each with its swatch
    for (const label of ['حر', 'ظهراً / عصراً', 'ظهراً + مساءً', 'مساءً', 'اليوم كاملاً', 'رمضان (تقريبي)', 'عيد الفطر / الأضحى', 'يوم عرفة']) {
      expect(legend.textContent).toContain(label);
    }
  });

  it('writes the weekday names out in full for screen readers and short above the cells', () => {
    render(<CalendarGrid bookings={[]} />);
    const heads = [...june('1').parentElement!.previousElementSibling!.children];
    expect(heads.map(h => h.querySelector('[aria-hidden="true"]')!.textContent)).toEqual(['سبت', 'أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة']);
  });
});

