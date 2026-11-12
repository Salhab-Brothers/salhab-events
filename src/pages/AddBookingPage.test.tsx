import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@/test/user';
import { makeBooking } from '@/test/factories';

const { Booking } = vi.hoisted(() => ({ Booking: { create: vi.fn(), update: vi.fn() } }));
vi.mock('@/api/api', () => ({ entities: { Booking } }));

import AddBookingPage from './AddBookingPage';
import type { Booking as BookingRow } from '@/types';

const FUTURE = '2099-07-01';

const setup = (over: { bookings?: BookingRow[]; editingBooking?: BookingRow | null } = {}) => {
  const onBookingAdded = vi.fn();
  const onCancel = vi.fn();
  const utils = render(
    <AddBookingPage bookings={over.bookings ?? []} editingBooking={over.editingBooking ?? null}
      onBookingAdded={onBookingAdded} onCancel={onCancel} />,
  );
  return { ...utils, onBookingAdded, onCancel };
};

const dateInput = (c: HTMLElement) => c.querySelector('input[type="date"]')!;

const fill = async (c: HTMLElement, date = FUTURE) => {
  fireEvent.change(dateInput(c), { target: { value: date } });
  await userEvent.type(screen.getByLabelText(/اسم المناسبة/), 'عرس');
  await userEvent.type(screen.getByLabelText(/اسم الشخص المسؤول/), 'أحمد');
  await userEvent.type(screen.getByLabelText(/رقم الهاتف/), '0501234567');
};

const submit = () => userEvent.click(screen.getByRole('button', { name: /إضافة الحجز|حفظ التعديلات/ }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  Booking.create.mockResolvedValue(undefined);
  Booking.update.mockResolvedValue(undefined);
});
afterEach(() => vi.useRealTimers());

describe('AddBookingPage: new booking', () => {
  it('creates a confirmed booking, reports success and resets the form', async () => {
    const { container, onBookingAdded } = setup();
    await fill(container);
    await userEvent.click(screen.getByRole('button', { name: 'عصراً' }));
    await userEvent.click(screen.getByLabelText(/احجز الديوان/));
    await userEvent.type(screen.getByLabelText(/ملاحظات/), 'ملاحظة');
    await submit();

    await waitFor(() => expect(onBookingAdded).toHaveBeenCalledTimes(1));
    expect(Booking.create).toHaveBeenCalledWith({
      date: FUTURE, event_name: 'عرس', time_slot: 'afternoon', person_name: 'أحمد',
      phone: '0501234567', notes: 'ملاحظة', book_diwan: true, status: 'confirmed',
    });
    expect(dateInput(container)).toHaveValue('');
    expect(screen.getByLabelText(/اسم الشخص المسؤول/)).toHaveValue('');
  });

  it('hides the success state after a few seconds', async () => {
    const { container } = setup();
    await fill(container);
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await submit();
    await waitFor(() => expect(Booking.create).toHaveBeenCalled());
    await act(async () => { vi.advanceTimersByTime(3500); });
  });

  it('shows the Islamic date warning', () => {
    const { container } = setup();
    fireEvent.change(dateInput(container), { target: { value: '2026-05-26' } });
    expect(screen.getByText(/هذا اليوم مناسبة إسلامية/)).toBeInTheDocument();
  });

  it('shows an error when saving fails and keeps the form', async () => {
    Booking.create.mockRejectedValue(new Error('x'));
    const { container, onBookingAdded } = setup();
    await fill(container);
    await submit();
    expect(await screen.findByText('تعذّر حفظ الحجز. حاول مرة أخرى.')).toBeInTheDocument();
    expect(onBookingAdded).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/اسم الشخص المسؤول/)).toHaveValue('أحمد');
  });
});

describe('AddBookingPage: conflicts', () => {
  const existing = (over: Partial<BookingRow>) =>
    makeBooking({ id: 'x', date: FUTURE, time_slot: 'lunch', event_name: 'موجود', ...over });

  it('warns about a same-slot booking and can be cancelled', async () => {
    const { container, onBookingAdded } = setup({ bookings: [existing({})] });
    await fill(container);
    await submit();
    expect(await screen.findByText('⚠️ تعارض في الحجز')).toBeInTheDocument();
    expect(screen.getByText('موجود')).toBeInTheDocument();
    await userEvent.click(screen.getByText('إلغاء'));
    expect(screen.queryByText('⚠️ تعارض في الحجز')).toBeNull();
    expect(Booking.create).not.toHaveBeenCalled();
    expect(onBookingAdded).not.toHaveBeenCalled();
  });

  it('lets the admin override the warning and save anyway', async () => {
    const { container, onBookingAdded } = setup({ bookings: [existing({})] });
    await fill(container);
    await submit();
    await userEvent.click(await screen.findByText('تجاهل والحفظ'));
    await waitFor(() => expect(onBookingAdded).toHaveBeenCalled());
    expect(Booking.create).toHaveBeenCalledTimes(1);
  });

  it('treats a full-day booking as conflicting with every slot, in both directions', async () => {
    const { container } = setup({ bookings: [existing({ time_slot: 'full' })] });
    await fill(container);
    await submit();
    expect(await screen.findByText('⚠️ تعارض في الحجز')).toBeInTheDocument();
  });

  it('flags a full-day request against an existing slot', async () => {
    const { container } = setup({ bookings: [existing({ time_slot: 'wedding' })] });
    await fill(container);
    await userEvent.click(screen.getByRole('button', { name: 'اليوم كاملاً' }));
    await submit();
    expect(await screen.findByText('⚠️ تعارض في الحجز')).toBeInTheDocument();
  });

  it('compares legacy slot names with current ones', async () => {
    const { container } = setup({ bookings: [existing({ time_slot: 'morning' })] });
    await fill(container);
    await submit();
    expect(await screen.findByText('⚠️ تعارض في الحجز')).toBeInTheDocument();
  });

  it('ignores cancelled bookings, other dates and different slots', async () => {
    const { container, onBookingAdded } = setup({
      bookings: [
        existing({ status: 'cancelled' }),
        existing({ date: '2099-07-02' }),
        existing({ time_slot: 'wedding' }),
      ],
    });
    await fill(container);
    await submit();
    await waitFor(() => expect(onBookingAdded).toHaveBeenCalled());
    expect(screen.queryByText('⚠️ تعارض في الحجز')).toBeNull();
  });

  it('clears the warning when the date or slot changes', async () => {
    const { container } = setup({ bookings: [existing({})] });
    await fill(container);
    await submit();
    await screen.findByText('⚠️ تعارض في الحجز');
    fireEvent.change(dateInput(container), { target: { value: '2099-07-03' } });
    expect(screen.queryByText('⚠️ تعارض في الحجز')).toBeNull();

    fireEvent.change(dateInput(container), { target: { value: FUTURE } });
    await submit();
    await screen.findByText('⚠️ تعارض في الحجز');
    await userEvent.click(screen.getByRole('button', { name: 'مساءً' }));
    expect(screen.queryByText('⚠️ تعارض في الحجز')).toBeNull();
  });
});

describe('AddBookingPage: editing', () => {
  const editing = makeBooking({
    id: 'e1', date: FUTURE, event_name: 'قديم', person_name: 'سامي', phone: '0509999999',
    notes: 'ن', time_slot: 'evening', book_diwan: true,
  });

  it('prefills the form, normalising legacy slots, and saves with update', async () => {
    const { container, onBookingAdded } = setup({ editingBooking: editing });
    expect(screen.getByText('تعديل الحجز')).toBeInTheDocument();
    expect(dateInput(container)).toHaveValue(FUTURE);
    expect(screen.getByLabelText(/اسم المناسبة/)).toHaveValue('قديم');
    await userEvent.clear(screen.getByLabelText(/اسم المناسبة/));
    await userEvent.type(screen.getByLabelText(/اسم المناسبة/), 'جديد');
    await submit();
    await waitFor(() => expect(onBookingAdded).toHaveBeenCalled());
    expect(Booking.update).toHaveBeenCalledWith('e1', {
      date: FUTURE, event_name: 'جديد', time_slot: 'wedding', person_name: 'سامي',
      phone: '0509999999', notes: 'ن', book_diwan: true, status: 'confirmed',
    });
    expect(Booking.create).not.toHaveBeenCalled();
    // the form is kept after an edit
    expect(screen.getByLabelText(/اسم المناسبة/)).toHaveValue('جديد');
  });

  it('does not flag the booking being edited as its own conflict', async () => {
    const { onBookingAdded } = setup({ editingBooking: editing, bookings: [editing] });
    await submit();
    await waitFor(() => expect(onBookingAdded).toHaveBeenCalled());
  });

  it('fills missing private fields with empty strings', () => {
    setup({ editingBooking: makeBooking({ phone: undefined, notes: undefined }) });
    expect(screen.getByLabelText(/رقم الهاتف/)).toHaveValue('');
  });

  it('can be cancelled', async () => {
    const { onCancel } = setup({ editingBooking: editing });
    await userEvent.click(screen.getByRole('button', { name: 'إلغاء' }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('has no cancel button when adding', () => {
    setup();
    expect(screen.queryByRole('button', { name: 'إلغاء' })).toBeNull();
  });

  it('refuses an invalid phone number and does not save', async () => {
    const { container } = setup();
    await fill(container);
    const phone = screen.getByLabelText(/رقم الهاتف/);
    await userEvent.clear(phone);
    await userEvent.type(phone, 'abc');
    await submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('رقم الهاتف غير صالح');
    expect(Booking.create).not.toHaveBeenCalled();
    await userEvent.type(phone, '1234567');
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
