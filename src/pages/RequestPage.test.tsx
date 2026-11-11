import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { BookingRequest } = vi.hoisted(() => ({ BookingRequest: { create: vi.fn() } }));
vi.mock('@/api/api', () => ({ entities: { BookingRequest } }));

import RequestPage from './RequestPage';

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  BookingRequest.create.mockResolvedValue(undefined);
});

const fillRequired = async (container: HTMLElement) => {
  await userEvent.type(screen.getByPlaceholderText('الاسم الأول'), 'خالد');
  await userEvent.type(screen.getByPlaceholderText('اسم العائلة'), 'سلهب');
  await userEvent.type(screen.getByPlaceholderText('05xxxxxxxx'), '0501234567');
  fireEvent.change(container.querySelector('input[type="date"]')!, { target: { value: '2099-07-01' } });
  await userEvent.type(screen.getByPlaceholderText('مثال: عرس، خطبة، تجمع عائلي'), 'عرس');
};

describe('RequestPage', () => {
  it('submits a pending request with the entered details', async () => {
    const { container } = render(<RequestPage />);
    await fillRequired(container);
    await userEvent.type(screen.getByPlaceholderText('الاسم الثاني'), 'أحمد');
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
    expect(screen.getByPlaceholderText('الاسم الأول')).toHaveValue('');
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
});
