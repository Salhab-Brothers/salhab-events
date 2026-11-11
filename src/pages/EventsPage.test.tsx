import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@/test/user';
import EventsPage from './EventsPage';
import { makeBooking } from '@/test/factories';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 5, 15));
});
afterEach(() => vi.useRealTimers());

const bookings = [
  makeBooking({ id: '1', date: '2026-06-20', event_name: 'زفاف سامي', person_name: 'سامي', time_slot: 'wedding', book_diwan: true }),
  makeBooking({ id: '2', date: '2026-06-21', event_name: 'خطوبة ليلى', person_name: 'ليلى', time_slot: 'afternoon', status: 'pending' }),
  makeBooking({ id: '3', date: '2026-07-04', event_name: 'طلبة نور', person_name: 'نور', time_slot: 'morning' }),
  makeBooking({ id: '4', date: '2026-07-05', event_name: 'غداء عائلي', person_name: 'فؤاد', time_slot: 'lunch' }),
  makeBooking({ id: '5', date: '2026-07-06', event_name: 'تجمع', person_name: 'هند', time_slot: 'full', status: 'cancelled' }),
  makeBooking({ id: '6', date: '2026-07-07', event_name: 'حفل قديم الاسم', person_name: 'ماجد', time_slot: 'evening' }),
  makeBooking({ id: '7', date: '2026-05-01', event_name: 'زفاف ماضٍ', person_name: 'ماضي', time_slot: 'wedding' }),
  makeBooking({ id: '8', date: '2026-05-02', event_name: 'ملغى ماضٍ', status: 'cancelled' }),
];

const titles = () => [...document.querySelectorAll('h3')].map((h) => h.textContent);
const pill = (name: string) => screen.getByRole('button', { name });

describe('EventsPage', () => {
  it('shows upcoming events by default, oldest first, with counts', () => {
    render(<EventsPage bookings={bookings} />);
    expect(titles()).toEqual(['زفاف سامي', 'خطوبة ليلى', 'طلبة نور', 'غداء عائلي', 'تجمع', 'حفل قديم الاسم']);
    expect(screen.getByText(/عرض/).textContent).toContain('6');
    expect(screen.getAllByText('مؤكد', { selector: 'span.rounded-full' }).length).toBeGreaterThan(0);
    expect(screen.getByText('معلّق', { selector: 'span.rounded-full' })).toBeInTheDocument();
    expect(screen.getByText('✅ الديوان')).toBeInTheDocument();
  });

  it('can show past events, counting only non-cancelled ones', async () => {
    render(<EventsPage bookings={bookings} />);
    await userEvent.click(screen.getByLabelText(/إظهار المناسبات الماضية \(1\)/));
    expect(titles()).toContain('زفاف ماضٍ');
    expect(titles()).toContain('ملغى ماضٍ');
  });

  it('hides the past toggle when there are no past events', () => {
    render(<EventsPage bookings={[bookings[0]]} />);
    expect(screen.queryByText(/إظهار المناسبات الماضية/)).toBeNull();
  });

  it('searches by event name, person and date', async () => {
    render(<EventsPage bookings={bookings} />);
    const box = screen.getByPlaceholderText(/ابحث/);
    await userEvent.type(box, 'ليلى');
    expect(titles()).toEqual(['خطوبة ليلى']);
    await userEvent.clear(box);
    await userEvent.type(box, 'فؤاد');
    expect(titles()).toEqual(['غداء عائلي']);
    await userEvent.clear(box);
    await userEvent.type(box, '2026-07-04');
    expect(titles()).toEqual(['طلبة نور']);
  });

  it.each([
    ['زفاف', ['زفاف سامي']],
    ['خطوبة', ['خطوبة ليلى']],
    ['طلبة', ['طلبة نور']],
    ['غداء', ['غداء عائلي']],
    ['أخرى', ['تجمع', 'حفل قديم الاسم']],
  ])('filters by event type %s', async (type, expected) => {
    render(<EventsPage bookings={bookings} />);
    await userEvent.click(pill(type));
    expect(titles()).toEqual(expected);
  });

  it('treats "طلب" and "خطبة" wording as the right type', async () => {
    render(<EventsPage bookings={[
      makeBooking({ id: 'a', date: '2026-07-01', event_name: 'خطبة هدى' }),
      makeBooking({ id: 'b', date: '2026-07-02', event_name: 'طلب يد' }),
    ]} />);
    await userEvent.click(pill('خطوبة'));
    expect(titles()).toEqual(['خطبة هدى']);
    await userEvent.click(pill('طلبة'));
    expect(titles()).toEqual(['طلب يد']);
  });

  it('filters by time slot including legacy names', async () => {
    render(<EventsPage bookings={bookings} />);
    await userEvent.click(pill('ظهراً'));
    expect(titles()).toEqual(['طلبة نور', 'غداء عائلي']); // morning + lunch
    await userEvent.click(pill('مساءً'));
    expect(titles()).toEqual(['زفاف سامي', 'حفل قديم الاسم']); // wedding + evening
    await userEvent.click(pill('عصراً'));
    expect(titles()).toEqual(['خطوبة ليلى']);
    await userEvent.click(pill('اليوم كاملاً'));
    expect(titles()).toEqual(['تجمع']);
  });

  it('filters by the diwan flag', async () => {
    render(<EventsPage bookings={bookings} />);
    await userEvent.click(screen.getByLabelText('الديوان فقط'));
    expect(titles()).toEqual(['زفاف سامي']);
  });

  it('filters by month and status through the selects', async () => {
    render(<EventsPage bookings={bookings} />);
    const [monthSelect, statusSelect] = screen.getAllByRole('combobox');
    await userEvent.click(monthSelect);
    await userEvent.click(await screen.findByRole('option', { name: /تموز/ }));
    expect(titles()).toEqual(['طلبة نور', 'غداء عائلي', 'تجمع', 'حفل قديم الاسم']);
    await userEvent.click(statusSelect);
    await userEvent.click(await screen.findByRole('option', { name: 'ملغي' }));
    expect(titles()).toEqual(['تجمع']);
  });

  it('shows an empty state and clears every filter at once', async () => {
    render(<EventsPage bookings={bookings} />);
    await userEvent.type(screen.getByPlaceholderText(/ابحث/), 'لا شيء مطابق');
    expect(screen.getByText('لا توجد نتائج مطابقة')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /مسح الفلاتر/ }));
    expect(titles()).toHaveLength(6);
    expect(screen.queryByRole('button', { name: /مسح الفلاتر/ })).toBeNull();
  });

  it('offers to clear after any kind of filter', async () => {
    render(<EventsPage bookings={bookings} />);
    expect(screen.queryByRole('button', { name: /مسح الفلاتر/ })).toBeNull();
    for (const action of [
      () => userEvent.click(pill('زفاف')),
      () => userEvent.click(pill('عصراً')),
      () => userEvent.click(screen.getByLabelText('الديوان فقط')),
      () => userEvent.type(screen.getByPlaceholderText(/ابحث/), 'x'),
    ]) {
      await action();
      await userEvent.click(screen.getByRole('button', { name: /مسح الفلاتر/ }));
      expect(screen.queryByRole('button', { name: /مسح الفلاتر/ })).toBeNull();
    }
  });

  it('does not offer a month that only has past events', async () => {
    render(<EventsPage bookings={bookings} />);
    await userEvent.click(screen.getAllByRole('combobox')[0]);
    const list = await screen.findByRole('listbox');
    expect(within(list).queryByText(/أيار/)).toBeNull();
  });
});
