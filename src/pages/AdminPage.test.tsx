import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@/test/user';
import { makeBooking, makeRequest } from '@/test/factories';

const { Booking, BookingRequest } = vi.hoisted(() => ({
  Booking: { create: vi.fn(), delete: vi.fn() },
  BookingRequest: { update: vi.fn() },
}));
vi.mock('@/api/api', () => ({ entities: { Booking, BookingRequest } }));
vi.mock('@/components/DownloadEventsImage', () => ({ default: () => <div>download-tab</div> }));
vi.mock('@/components/ReviewModeration', () => ({ default: () => <div>reviews-tab</div> }));
vi.mock('@/components/EventCardDownload', () => ({ default: () => <span>card</span> }));
vi.mock('./AddBookingPage', () => ({
  default: (p: { editingBooking: unknown; onBookingAdded: () => void; onCancel: () => void }) => (
    <div>
      add-tab{p.editingBooking ? ':editing' : ''}
      <button onClick={p.onBookingAdded}>saved</button>
      <button onClick={p.onCancel}>cancelled</button>
    </div>
  ),
}));

import AdminPage from './AdminPage';
import type { Booking as BookingRow, BookingRequest as RequestRow } from '@/types';

const props = () => ({
  bookings: [] as BookingRow[],
  requests: [] as RequestRow[],
  onRefresh: vi.fn(),
  onEditBooking: vi.fn(),
  editingBooking: null as BookingRow | null,
  onClearEdit: vi.fn(),
  onLogout: vi.fn(),
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  Booking.create.mockResolvedValue(undefined);
  Booking.delete.mockResolvedValue(undefined);
  BookingRequest.update.mockResolvedValue(undefined);
});

const goTo = (name: string) => userEvent.click(screen.getByRole('button', { name }));

describe('AdminPage requests', () => {
  it('shows an empty state', () => {
    render(<AdminPage {...props()} />);
    expect(screen.getByText('لا توجد طلبات')).toBeInTheDocument();
  });

  it('lists requests newest first with a pending badge, without mutating the input', () => {
    const older = makeRequest({ id: 'o', event_name: 'أقدم', submitted_at: '2026-01-01T10:00:00Z', status: 'approved' });
    const newer = makeRequest({ id: 'n', event_name: 'أحدث', submitted_at: '2026-02-01T10:00:00Z' });
    const p = { ...props(), requests: [older, newer] };
    const { container } = render(<AdminPage {...p} />);
    const titles = [...container.querySelectorAll('h3')].map((h) => h.textContent);
    expect(titles).toEqual(['أحدث', 'أقدم']);
    expect(p.requests[0]).toBe(older);
    expect(screen.getByText('بانتظار المراجعة')).toBeInTheDocument();
    expect(screen.getByText('مقبول')).toBeInTheDocument();
    expect(screen.getAllByText('قبول')).toHaveLength(1); // only pending requests have actions
    expect(screen.getByText('1')).toBeInTheDocument(); // badge
  });

  it('approves: creates the booking, marks the request, then refreshes', async () => {
    const p = { ...props(), requests: [makeRequest({ first_name: 'خالد', second_name: '', third_name: '', last_name: 'سلهب' })] };
    render(<AdminPage {...p} />);
    await userEvent.click(screen.getByText('قبول'));
    await waitFor(() => expect(p.onRefresh).toHaveBeenCalled());
    expect(Booking.create).toHaveBeenCalledWith(expect.objectContaining({
      person_name: 'خالد سلهب', status: 'confirmed', event_name: 'غداء', phone: '0501234567', notes: '',
    }));
    expect(BookingRequest.update).toHaveBeenCalledWith('r1', { status: 'approved' });
  });

  it('warns before approving a request that clashes with a booking, and approves only if confirmed', async () => {
    const clash = makeBooking({ date: '2026-06-20', time_slot: 'full', event_name: 'عرس قائم' });
    const p = { ...props(), bookings: [clash], requests: [makeRequest({ date: '2026-06-20', time_slot: 'lunch' })] };
    render(<AdminPage {...p} />);
    await userEvent.click(screen.getByText('قبول'));
    expect(await screen.findByRole('dialog')).toHaveTextContent('عرس قائم');
    await userEvent.click(screen.getByRole('button', { name: 'إلغاء' }));
    expect(Booking.create).not.toHaveBeenCalled();
    await userEvent.click(screen.getByText('قبول'));
    await userEvent.click(await screen.findByRole('button', { name: 'تأكيد' }));
    await waitFor(() => expect(Booking.create).toHaveBeenCalled());
  });

  it('does not warn for a cancelled booking or another day', async () => {
    const p = { ...props(), bookings: [makeBooking({ date: '2026-06-20', time_slot: 'full', status: 'cancelled' }), makeBooking({ id: 'x', date: '2026-06-21', time_slot: 'full' })], requests: [makeRequest({ date: '2026-06-20', time_slot: 'lunch' })] };
    render(<AdminPage {...p} />);
    await userEvent.click(screen.getByText('قبول'));
    await waitFor(() => expect(Booking.create).toHaveBeenCalled());
  });

  it('rejects a request', async () => {
    const p = { ...props(), requests: [makeRequest()] };
    render(<AdminPage {...p} />);
    await userEvent.click(screen.getByText('رفض'));
    await waitFor(() => expect(p.onRefresh).toHaveBeenCalled());
    expect(BookingRequest.update).toHaveBeenCalledWith('r1', { status: 'rejected' });
    expect(Booking.create).not.toHaveBeenCalled();
  });

  it('tells the admin when an action fails, and still refreshes', async () => {
    BookingRequest.update.mockRejectedValue(new Error('nope'));
    const p = { ...props(), requests: [makeRequest()] };
    render(<AdminPage {...p} />);
    await userEvent.click(screen.getByText('رفض'));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('تعذّر تنفيذ العملية. حاول مرة أخرى.');
    expect(p.onRefresh).not.toHaveBeenCalled();   // refreshes once the admin has read it
    await userEvent.click(screen.getByRole('button', { name: 'حسناً' }));
    await waitFor(() => expect(p.onRefresh).toHaveBeenCalled());
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows progress on the approve button while working', async () => {
    let finish!: () => void;
    Booking.create.mockReturnValue(new Promise<void>((r) => { finish = r; }));
    render(<AdminPage {...{ ...props(), requests: [makeRequest()] }} />);
    await userEvent.click(screen.getByText('قبول'));
    expect(screen.getByText('...').closest('button')).toBeDisabled();
    finish();
    await waitFor(() => expect(screen.getByText('قبول')).toBeInTheDocument());
  });
});

describe('AdminPage bookings', () => {
  const twoBookings = [
    makeBooking({ id: 'b2', date: '2026-09-01', event_name: 'ثاني', book_diwan: true }),
    makeBooking({ id: 'b1', date: '2026-07-01', event_name: 'أول' }),
  ];

  it('shows an empty state without an export button', async () => {
    render(<AdminPage {...props()} />);
    await goTo('الحجوزات');
    expect(screen.getByText('لا توجد حجوزات')).toBeInTheDocument();
    expect(screen.queryByText('تصدير CSV')).toBeNull();
  });

  it('lists bookings oldest first with the diwan badge', async () => {
    const p = { ...props(), bookings: twoBookings };
    const { container } = render(<AdminPage {...p} />);
    await goTo('الحجوزات');
    expect([...container.querySelectorAll('h3')].map((h) => h.textContent)).toEqual(['أول', 'ثاني']);
    expect(screen.getByText('🏛️ الديوان')).toBeInTheDocument();
    expect(p.bookings[0].id).toBe('b2');
  });

  it('exports the bookings as a CSV file', async () => {
    const createObjectURL = vi.fn(() => 'blob:x');
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<AdminPage {...{ ...props(), bookings: twoBookings }} />);
    await goTo('الحجوزات');
    await userEvent.click(screen.getByText('تصدير CSV'));
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:x');
  });

  it('opens the editor for a booking', async () => {
    const p = { ...props(), bookings: [twoBookings[1]] };
    render(<AdminPage {...p} />);
    await goTo('الحجوزات');
    await userEvent.click(screen.getByTitle('تعديل'));
    expect(p.onEditBooking).toHaveBeenCalledWith(twoBookings[1]);
    expect(screen.getByText(/add-tab/)).toBeInTheDocument();
  });

  it('deletes after confirmation and refreshes', async () => {
    const p = { ...props(), bookings: [twoBookings[1]] };
    render(<AdminPage {...p} />);
    await goTo('الحجوزات');
    await userEvent.click(screen.getByRole('button', { name: /^حذف/ }));
    expect(screen.getByRole('dialog')).toHaveTextContent(/هل تريد حذف/);
    await userEvent.click(screen.getByRole('button', { name: 'تأكيد' }));
    await waitFor(() => expect(Booking.delete).toHaveBeenCalledWith('b1'));
    expect(p.onRefresh).toHaveBeenCalled();
  });

  it('keeps the booking when the admin declines', async () => {
    const p = { ...props(), bookings: [twoBookings[1]] };
    render(<AdminPage {...p} />);
    await goTo('الحجوزات');
    await userEvent.click(screen.getByRole('button', { name: /^حذف/ }));
    await userEvent.click(screen.getByRole('button', { name: 'إلغاء' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(Booking.delete).not.toHaveBeenCalled();
    expect(p.onRefresh).not.toHaveBeenCalled();
  });
});

describe('AdminPage shell', () => {
  it('opens on the editor when editing and returns to bookings after saving or cancelling', async () => {
    const p = { ...props(), editingBooking: makeBooking() };
    render(<AdminPage {...p} />);
    expect(screen.getByText('add-tab:editing')).toBeInTheDocument();
    await userEvent.click(screen.getByText('saved'));
    expect(p.onRefresh).toHaveBeenCalled();
    expect(p.onClearEdit).toHaveBeenCalledTimes(1);
    expect(screen.getByText('لا توجد حجوزات')).toBeInTheDocument();
    await goTo('إضافة حجز');
    await userEvent.click(screen.getByText('cancelled'));
    expect(p.onClearEdit).toHaveBeenCalledTimes(2);
    expect(screen.getByText('لا توجد حجوزات')).toBeInTheDocument();
  });

  it('switches to the reviews and download tabs', async () => {
    render(<AdminPage {...props()} />);
    await goTo('التقييمات');
    expect(screen.getByText('reviews-tab')).toBeInTheDocument();
    await goTo('تحميل الصورة');
    expect(screen.getByText('download-tab')).toBeInTheDocument();
  });

  it('logs out', async () => {
    const p = props();
    render(<AdminPage {...p} />);
    await userEvent.click(screen.getByRole('button', { name: /خروج/ }));
    expect(p.onLogout).toHaveBeenCalled();
  });
});
