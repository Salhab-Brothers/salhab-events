import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@/test/user';
import { renderWithQuery } from '@/test/render';
import { makeReview } from '@/test/factories';

const { Review } = vi.hoisted(() => ({ Review: { list: vi.fn(), create: vi.fn() } }));
vi.mock('@/api/api', () => ({ entities: { Review } }));

import ReviewsPage from './ReviewsPage';

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  Review.list.mockResolvedValue([]);
  Review.create.mockResolvedValue(undefined);
});

// The rating widget is five buttons holding stars; the form's is the one with size-28 stars.
const rate = async (n: number) => {
  const stars = document.querySelectorAll('form button[type="button"]');
  await userEvent.click(stars[n - 1]);
};

describe('ReviewsPage', () => {
  it('invites the first review when there are none', async () => {
    renderWithQuery(<ReviewsPage />);
    expect(await screen.findByText(/كن أول من يقيّم/)).toBeInTheDocument();
  });

  it('shows the average, distribution and each review', async () => {
    Review.list.mockResolvedValue([
      makeReview({ id: '1', reviewer_name: 'سارة', rating: 5, event_name: 'زفاف', comment: 'ممتاز', created_date: '2026-03-04T10:00:00Z' }),
      makeReview({ id: '2', reviewer_name: 'علي', rating: 4, event_name: '', comment: '' }),
    ]);
    renderWithQuery(<ReviewsPage />);
    expect(await screen.findByText('4.5')).toBeInTheDocument();
    expect(screen.getByText('2 تقييم')).toBeInTheDocument();
    expect(screen.getByText('سارة')).toBeInTheDocument();
    expect(screen.getByText('ممتاز')).toBeInTheDocument();
    expect(screen.getByText('زفاف')).toBeInTheDocument();
  });

  it('keeps submit disabled until a rating is chosen, then submits', async () => {
    renderWithQuery(<ReviewsPage />);
    await screen.findByText(/كن أول/);
    const submit = screen.getByRole('button', { name: /إرسال/ });
    expect(submit).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/اسمك/), 'منى');
    await userEvent.type(screen.getByLabelText(/اسم المناسبة/), 'خطبة');
    await userEvent.type(screen.getByLabelText(/تعليقك/), 'جميل');
    await rate(4);
    expect(submit).toBeEnabled();
    await userEvent.click(submit);

    await waitFor(() => expect(Review.create).toHaveBeenCalledWith({
      reviewer_name: 'منى', event_name: 'خطبة', rating: 4, comment: 'جميل', event_date: null,
    }));
    expect(await screen.findByText(/سيظهر بعد مراجعة الإدارة/)).toBeInTheDocument();
    expect(screen.getByLabelText(/اسمك/)).toHaveValue('');
  });

  it('reports a failed submission', async () => {
    Review.create.mockRejectedValue(new Error('x'));
    renderWithQuery(<ReviewsPage />);
    await screen.findByText(/كن أول/);
    await userEvent.type(screen.getByLabelText(/اسمك/), 'منى');
    await rate(5);
    await userEvent.click(screen.getByRole('button', { name: /إرسال/ }));
    expect(await screen.findByText('تعذّر إرسال التقييم. حاول مرة أخرى.')).toBeInTheDocument();
  });

  it('drops bot submissions that fill the honeypot', async () => {
    const { container } = renderWithQuery(<ReviewsPage />);
    await screen.findByText(/كن أول/);
    await userEvent.type(screen.getByLabelText(/اسمك/), 'بوت');
    await userEvent.type(container.querySelector('input[name="website"]')!, 'spam');
    await rate(5);
    await userEvent.click(screen.getByRole('button', { name: /إرسال/ }));
    expect(await screen.findByText(/سيظهر بعد مراجعة الإدارة/)).toBeInTheDocument();
    expect(Review.create).not.toHaveBeenCalled();
  });

  it('does not submit without a rating even if the form is submitted directly', async () => {
    const { container } = renderWithQuery(<ReviewsPage />);
    await screen.findByText(/كن أول/);
    await userEvent.type(screen.getByLabelText(/اسمك/), 'منى');
    container.querySelector('form')!.requestSubmit();
    expect(Review.create).not.toHaveBeenCalled();
  });

  it('shows given ratings as plain stars, not buttons', async () => {
    Review.list.mockResolvedValue([makeReview({ rating: 3 })]);
    renderWithQuery(<ReviewsPage />);
    await screen.findByText('سارة');
    expect(document.querySelector('.space-y-3 button')).toBeNull();
    expect(screen.getAllByRole('img', { name: '3 / 5' }).length).toBeGreaterThan(0);
  });

  it('lets the rating be chosen by name, and announces which star is selected', async () => {
    renderWithQuery(<ReviewsPage />);
    await screen.findByText(/كن أول/);
    const group = screen.getByRole('group', { name: /التقييم/ });
    const four = within(group).getByRole('button', { name: '4 من 5' });
    expect(four).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(four);
    expect(four).toHaveAttribute('aria-pressed', 'true');
    expect(within(group).getByRole('button', { name: '5 من 5' })).toHaveAttribute('aria-pressed', 'false');
  });
});
