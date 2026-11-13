import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@/test/user';

const { BookingRequest } = vi.hoisted(() => ({ BookingRequest: { create: vi.fn() } }));
vi.mock('@/api/api', () => ({ entities: { BookingRequest } }));

import { makeBooking } from '@/test/factories';
import RequestPage from './RequestPage';

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  BookingRequest.create.mockResolvedValue(undefined);
});

const fillRequired = async (container: HTMLElement) => {
  await userEvent.type(screen.getByLabelText('الاسم الأول'), 'خالد');
  await userEvent.type(screen.getByLabelText('اسم العائلة'), 'سلهب');
  await userEvent.type(screen.getByLabelText(/رقم الهاتف/), '0501234567');
  fireEvent.change(container.querySelector('input[type="date"]')!, { target: { value: '2099-07-01' } });
  await userEvent.type(screen.getByLabelText(/اسم المناسبة/), 'عرس');
};

describe('RequestPage', () => {
  it('submits a pending request with the entered details', async () => {
    const { container } = render(<RequestPage />);
    await fillRequired(container);
    await userEvent.type(screen.getByLabelText('الاسم الثاني'), 'أحمد');
    await userEvent.click(screen.getByRole('button', { name: 'عصراً' }));
    await userEvent.click(screen.getByLabelText(/احجز الديوان/));
    await userEvent.click(screen.getByRole('button', { name: /إرسال/ }));

    await screen.findByText('تم إرسال طلبك بنجاح');
    expect(BookingRequest.create).toHaveBeenCalledWith(expect.objectContaining({
      first_name: 'خالد', second_name: 'أحمد', third_name: '', last_name: 'سلهب',
      phone: '0501234567', date: '2099-07-01', time_slot: 'afternoon',
      event_name: 'عرس', book_diwan: true, status: 'pending',
    }));
    expect(typeof BookingRequest.create.mock.calls[0][0].submitted_at).toBe('string');
  });

  it('shows the Islamic date warning for a holiday', async () => {
    const { container } = render(<RequestPage />);
    fireEvent.change(container.querySelector('input[type="date"]')!, { target: { value: '2026-05-26' } });
    expect(screen.getByText(/هذا اليوم مناسبة إسلامية/)).toBeInTheDocument();
  });

  it('lets the visitor send another request', async () => {
    const { container } = render(<RequestPage />);
    await fillRequired(container);
    await userEvent.click(screen.getByRole('button', { name: /إرسال/ }));
    await userEvent.click(await screen.findByText('تقديم طلب آخر'));
    expect(screen.getByLabelText('الاسم الأول')).toHaveValue('');
  });

  it('reports a failure and allows retrying', async () => {
    BookingRequest.create.mockRejectedValueOnce(new Error('down'));
    const { container } = render(<RequestPage />);
    await fillRequired(container);
    await userEvent.click(screen.getByRole('button', { name: /إرسال/ }));
    expect(await screen.findByText(/تعذّر إرسال الطلب/)).toBeInTheDocument();
    expect(screen.queryByText('تم إرسال طلبك بنجاح')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /إرسال/ }));
    await screen.findByText('تم إرسال طلبك بنجاح');
  });

  it('silently drops submissions that fill the honeypot', async () => {
    const { container } = render(<RequestPage />);
    await fillRequired(container);
    await userEvent.type(container.querySelector('input[name="website"]')!, 'spam');
    await userEvent.click(screen.getByRole('button', { name: /إرسال/ }));
    await screen.findByText('تم إرسال طلبك بنجاح');
    expect(BookingRequest.create).not.toHaveBeenCalled();
  });

  it('disables the button while sending', async () => {
    let finish!: () => void;
    BookingRequest.create.mockReturnValue(new Promise<void>((r) => { finish = r; }));
    const { container } = render(<RequestPage />);
    await fillRequired(container);
    await userEvent.click(screen.getByRole('button', { name: /إرسال/ }));
    expect(screen.getByRole('button', { name: /إرسال/ })).toBeDisabled();
    finish();
    await waitFor(() => expect(screen.getByText('تم إرسال طلبك بنجاح')).toBeInTheDocument());
  });

  it('refuses an invalid phone number and explains why, then accepts a corrected one', async () => {
    const { container } = render(<RequestPage />);
    await fillRequired(container);
    const phone = screen.getByLabelText(/رقم الهاتف/);
    await userEvent.clear(phone);
    await userEvent.type(phone, '12');
    await userEvent.click(screen.getByRole('button', { name: /إرسال/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent('رقم الهاتف غير صالح');
    expect(phone).toHaveAttribute('aria-invalid', 'true');
    expect(BookingRequest.create).not.toHaveBeenCalled();

    await userEvent.clear(phone);
    await userEvent.type(phone, '+972 54-259-0959');
    expect(screen.queryByRole('alert')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /إرسال/ }));
    await screen.findByText('تم إرسال طلبك بنجاح');
  });

  it('asks for a phone keypad and has no coming-soon OTP box', () => {
    render(<RequestPage />);
    expect(screen.getByLabelText(/رقم الهاتف/)).toHaveAttribute('inputmode', 'tel');
    expect(screen.queryByText(/OTP/)).toBeNull();
  });

  it('exposes the time choice as pressed buttons in a labelled group', async () => {
    render(<RequestPage />);
    const group = screen.getByRole('group', { name: /الوقت المطلوب/ });
    const afternoon = within(group).getByRole('button', { name: 'عصراً' });
    expect(afternoon).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(afternoon);
    expect(afternoon).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('RequestPage: availability', () => {
  const taken = [makeBooking({ date: '2099-07-01', time_slot: 'lunch', event_name: 'عرس قائم' })];
  const pickDate = (container: HTMLElement, value: string) =>
    fireEvent.change(container.querySelector('input[type="date"]')!, { target: { value } });

  it('says a free date and slot is available', () => {
    const { container } = render(<RequestPage bookings={taken} />);
    pickDate(container, '2099-07-02');
    expect(screen.getByRole('status')).toHaveTextContent('هذا الموعد متاح');
  });

  it('warns about a taken slot and offers the open slots of that day', async () => {
    const { container } = render(<RequestPage bookings={taken} />);
    pickDate(container, '2099-07-01');
    expect(screen.getByRole('status')).toHaveTextContent('محجوز');
    await userEvent.click(within(screen.getByRole('status')).getByRole('button', { name: 'عصراً' }));
    expect(screen.getByRole('status')).toHaveTextContent('هذا الموعد متاح');
  });

  it('offers other days when the whole day is taken, and still lets the request be sent', async () => {
    const full = [makeBooking({ date: '2099-07-01', time_slot: 'full' })];
    const { container } = render(<RequestPage bookings={full} />);
    pickDate(container, '2099-07-01');
    const buttons = within(screen.getByRole('status')).getAllByRole('button');
    expect(buttons).toHaveLength(3);
    await userEvent.click(buttons[0]);
    expect((container.querySelector('input[type="date"]') as HTMLInputElement).value).toBe('2099-07-02');
  });

  it('suggests the nearest free weekend when no date is chosen', async () => {
    const { container } = render(<RequestPage bookings={[]} />);
    await userEvent.click(screen.getByRole('button', { name: /أقرب جمعة أو سبت متاح/ }));
    expect((container.querySelector('input[type="date"]') as HTMLInputElement).value).not.toBe('');
  });

  it('starts with the day chosen on the calendar, unless it is already past', () => {
    window.location.hash = '#/request?date=2099-08-08';
    const { container, unmount } = render(<RequestPage />);
    expect((container.querySelector('input[type="date"]') as HTMLInputElement).value).toBe('2099-08-08');
    unmount();
    window.location.hash = '#/request?date=2001-01-01';
    const again = render(<RequestPage />);
    expect((again.container.querySelector('input[type="date"]') as HTMLInputElement).value).toBe('');
    window.location.hash = '';
  });
});
