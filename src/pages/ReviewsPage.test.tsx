import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor, within, fireEvent } from '@testing-library/react';
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
    await new Promise(r => setTimeout(r, 50));   // a send would start on the next tick
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

describe('ReviewsPage details', () => {
  const filled = (el: Element) => el.querySelectorAll('.fill-amber-400').length;

  it('shows no summary and no failure message before there is anything to report', async () => {
    const { container } = renderWithQuery(<ReviewsPage />);
    await screen.findByText(/كن أول/);
    expect(screen.queryByText(/^\d+ تقييم$/)).toBeNull();
    expect(container.querySelector('.text-destructive')).toBeNull();
    expect(screen.queryByText(/سيظهر بعد مراجعة الإدارة/)).toBeNull();
    expect(screen.getByText('اختر عدد النجوم')).toBeInTheDocument();
  });

  it('draws as many filled stars as the rating, in the list and in the chooser', async () => {
    Review.list.mockResolvedValue([makeReview({ id: '1', rating: 3 })]);
    renderWithQuery(<ReviewsPage />);
    await screen.findByText('سارة');
    expect(filled(screen.getAllByRole('img', { name: '3 / 5' })[0])).toBe(3);
    expect(screen.getAllByRole('img', { name: '3 / 5' })[0].children).toHaveLength(5);
    await rate(2);
    expect(filled(screen.getByRole('group', { name: /التقييم/ }))).toBe(2);
    await rate(5);
    expect(filled(screen.getByRole('group', { name: /التقييم/ }))).toBe(5);
    expect(screen.queryByText('اختر عدد النجوم')).toBeNull();
  });

  it('works out the average, its rounded stars and the bar for each rating', async () => {
    Review.list.mockResolvedValue([
      makeReview({ id: '1', rating: 5 }), makeReview({ id: '2', rating: 5 }), makeReview({ id: '3', rating: 4 }), makeReview({ id: '4', rating: 1 }),
    ]);
    const { container } = renderWithQuery(<ReviewsPage />);
    expect(await screen.findByText('3.8')).toBeInTheDocument();                 // 15 / 4 = 3.75
    expect(screen.getByText('4 تقييم')).toBeInTheDocument();
    expect(screen.getAllByRole('img', { name: '4 / 5' }).length).toBeGreaterThan(0);   // 3.75 rounds to 4 stars
    const bars = [...container.querySelectorAll<HTMLElement>('.bg-amber-400.rounded-full')].map(b => b.style.width);
    expect(bars).toEqual(['50%', '25%', '0%', '0%', '25%']);                    // rows for 5, 4, 3, 2, 1 stars
    const counts = [...container.querySelectorAll('.w-4.text-center')].map(c => c.textContent);
    expect(counts).toEqual(['5', '2', '4', '1', '3', '0', '2', '0', '1', '1']);   // label and count of each row
  });

  it('shows the event name, comment and Arabic date of a review only when there are some', async () => {
    Review.list.mockResolvedValue([
      makeReview({ id: '1', reviewer_name: 'سارة', event_name: 'زفاف سامي', comment: 'رائع', created_date: '2026-03-04T10:00:00Z' }),
      makeReview({ id: '2', reviewer_name: 'علي', event_name: '', comment: '', created_date: '2026-03-05T10:00:00Z' }),
    ]);
    renderWithQuery(<ReviewsPage />);
    await screen.findByText('سارة');
    const second = screen.getByText('علي').closest('.rounded-xl')!;
    expect(second.querySelectorAll('p')).toHaveLength(2);   // name and date only
    expect(screen.getByText('4 مارس 2026')).toBeInTheDocument();
  });

  it('sends the event date as null when empty, shows progress, refreshes the list and hides the thanks again', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let finish!: () => void;
    Review.create.mockReturnValue(new Promise<void>(r => { finish = r; }));
    renderWithQuery(<ReviewsPage />);
    await screen.findByText(/كن أول/);
    await userEvent.type(screen.getByLabelText(/اسمك/), 'منى');
    await rate(4);
    await userEvent.click(screen.getByRole('button', { name: /إرسال/ }));
    expect(screen.getByRole('button', { name: /جارٍ الإرسال/ })).toBeDisabled();
    finish();
    expect(await screen.findByText(/سيظهر بعد مراجعة الإدارة/)).toBeInTheDocument();
    expect(Review.create).toHaveBeenCalledWith(expect.objectContaining({ event_date: null }));
    await waitFor(() => expect(Review.list).toHaveBeenCalledTimes(2));
    vi.advanceTimersByTime(3900);
    expect(screen.getByText(/سيظهر بعد مراجعة الإدارة/)).toBeInTheDocument();
    vi.advanceTimersByTime(200);
    await waitFor(() => expect(screen.queryByText(/سيظهر بعد مراجعة الإدارة/)).toBeNull());
    vi.useRealTimers();
  });

  it('keeps the honeypot out of the tab order and stops the browser submitting by itself', async () => {
    const { container } = renderWithQuery(<ReviewsPage />);
    await screen.findByText(/كن أول/);
    expect(container.querySelector('input[name="website"]')).toHaveAttribute('tabindex', '-1');
    expect(fireEvent.submit(container.querySelector('form')!)).toBe(false);
  });

  it('shows the invitation only while there are no reviews', async () => {
    Review.list.mockResolvedValue([makeReview({ id: '1' })]);
    renderWithQuery(<ReviewsPage />);
    await screen.findByText('سارة');
    expect(screen.queryByText(/كن أول من يقيّم/)).toBeNull();
  });
});

