import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import userEvent from '@/test/user';
import { renderWithQuery } from '@/test/render';

const { invoke, BookingRequest, Review } = vi.hoisted(() => ({
  invoke: vi.fn(),
  BookingRequest: { create: vi.fn() },
  Review: { list: vi.fn(), create: vi.fn() },
}));
vi.mock('@/api/api', () => ({ supabase: { functions: { invoke } }, entities: { BookingRequest, Review } }));
// Stand-in widget: a button that "solves" the challenge.
vi.mock('@/components/Captcha', () => ({
  default: ({ onToken }: { onToken: (t: string | null) => void }) => (
    <button type="button" onClick={() => onToken('tok')}>solve</button>
  ),
}));

import RequestPage from './RequestPage';
import ReviewsPage from './ReviewsPage';

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('VITE_TURNSTILE_SITE_KEY', 'site');
  invoke.mockResolvedValue({ error: null });
  Review.list.mockResolvedValue([]);
});
afterEach(() => vi.unstubAllEnvs());

describe('captcha on the booking request form', () => {
  it('blocks sending until solved, then sends through the verifying function', async () => {
    const { container } = renderWithQuery(<RequestPage />);
    await userEvent.type(screen.getByPlaceholderText('الاسم الأول'), 'خالد');
    await userEvent.type(screen.getByPlaceholderText('اسم العائلة'), 'سلهب');
    await userEvent.type(screen.getByPlaceholderText('05xxxxxxxx'), '0501234567');
    fireEvent.change(container.querySelector('input[type="date"]')!, { target: { value: '2099-07-01' } });
    await userEvent.type(screen.getByPlaceholderText('مثال: عرس، خطبة، تجمع عائلي'), 'عرس');

    const send = screen.getByRole('button', { name: /إرسال/ });
    expect(send).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'solve' }));
    expect(send).toBeEnabled();
    await userEvent.click(send);

    await screen.findByText('تم إرسال طلبك بنجاح');
    expect(invoke).toHaveBeenCalledWith('submit', { body: expect.objectContaining({ kind: 'request', token: 'tok' }) });
    expect(BookingRequest.create).not.toHaveBeenCalled();
  });
});

describe('captcha on the review form', () => {
  it('blocks sending until solved, then sends through the verifying function', async () => {
    renderWithQuery(<ReviewsPage />);
    await userEvent.type(screen.getByPlaceholderText('الاسم الكامل'), 'سارة');
    await userEvent.click(document.querySelectorAll('form button[type="button"]')[4]);

    const send = screen.getByRole('button', { name: /إرسال التقييم/ });
    expect(send).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'solve' }));
    await userEvent.click(send);

    await screen.findByText(/شكراً/);
    expect(invoke).toHaveBeenCalledWith('submit', { body: expect.objectContaining({ kind: 'review', token: 'tok' }) });
    expect(Review.create).not.toHaveBeenCalled();
  });
});
