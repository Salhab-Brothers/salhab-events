import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@/test/user';
import { makeReview } from '@/test/factories';

const { Review } = vi.hoisted(() => ({
  Review: { list: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));
vi.mock('@/api/api', () => ({ entities: { Review } }));

import ReviewModeration from './ReviewModeration';

const pending = makeReview({ id: 'p', reviewer_name: 'منتظر', approved: false, comment: 'تعليق', event_name: 'زفاف أ' });
const approved = makeReview({ id: 'a', reviewer_name: 'مقبول', approved: true, comment: '', event_name: '' });

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  Review.update.mockResolvedValue(undefined);
  Review.delete.mockResolvedValue(undefined);
});

describe('ReviewModeration', () => {
  it('renders nothing while loading', () => {
    Review.list.mockReturnValue(new Promise(() => {}));
    const { container } = render(<ReviewModeration />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows an empty state', async () => {
    Review.list.mockResolvedValue([]);
    render(<ReviewModeration />);
    expect(await screen.findByText('لا توجد تقييمات')).toBeInTheDocument();
  });

  it('shows a load error', async () => {
    Review.list.mockRejectedValue(new Error('x'));
    render(<ReviewModeration />);
    expect(await screen.findByText('تعذّر تحميل التقييمات')).toBeInTheDocument();
  });

  it('lists pending and approved reviews', async () => {
    Review.list.mockResolvedValue([pending, approved]);
    render(<ReviewModeration />);
    expect(await screen.findByText('منتظر')).toBeInTheDocument();
    expect(screen.getByText('بانتظار المراجعة')).toBeInTheDocument();
    expect(screen.getByText('تعليق')).toBeInTheDocument();
    expect(screen.getByText('زفاف أ')).toBeInTheDocument();
    expect(screen.getAllByText('قبول')).toHaveLength(1); // only the pending one
  });

  it('approves a pending review and reloads', async () => {
    Review.list.mockResolvedValue([pending]);
    render(<ReviewModeration />);
    await userEvent.click(await screen.findByText('قبول'));
    await waitFor(() => expect(Review.update).toHaveBeenCalledWith('p', { approved: true }));
    await waitFor(() => expect(Review.list).toHaveBeenCalledTimes(2));
  });

  it('deletes after confirmation', async () => {
    Review.list.mockResolvedValue([approved]);
    render(<ReviewModeration />);
    await screen.findByText('مقبول');
    await userEvent.click(screen.getByRole('button', { name: /^حذف تقييم/ }));
    await userEvent.click(screen.getByRole('button', { name: 'تأكيد' }));
    await waitFor(() => expect(Review.delete).toHaveBeenCalledWith('a'));
  });

  it('does not delete when the admin cancels', async () => {
    Review.list.mockResolvedValue([approved]);
    render(<ReviewModeration />);
    await screen.findByText('مقبول');
    await userEvent.click(screen.getByRole('button', { name: /^حذف تقييم/ }));
    await userEvent.click(screen.getByRole('button', { name: 'إلغاء' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(Review.delete).not.toHaveBeenCalled();
  });

  it('reports a failed action but keeps the list', async () => {
    Review.list.mockResolvedValue([pending]);
    Review.update.mockRejectedValue(new Error('nope'));
    render(<ReviewModeration />);
    await userEvent.click(await screen.findByText('قبول'));
    expect(await screen.findByText('تعذّر تنفيذ العملية')).toBeInTheDocument();
    expect(screen.getByText('منتظر')).toBeInTheDocument();
  });

  it('shows only the details a review has, and no error when all is well', async () => {
    Review.list.mockResolvedValue([approved]);
    const { container } = render(<ReviewModeration />);
    await screen.findByText('مقبول');
    expect(container.querySelector('.text-destructive')).toBeNull();
    const card = screen.getByText('مقبول').closest('.rounded-xl')!;
    expect(card.querySelectorAll('p')).toHaveLength(0);               // no event name, no comment
    expect(screen.queryByText('بانتظار المراجعة')).toBeNull();        // already approved
  });

  it('logs failures, and drops an old error when the next action starts', async () => {
    Review.list.mockRejectedValueOnce(new Error('x'));
    render(<ReviewModeration />);
    await screen.findByText('تعذّر تحميل التقييمات');
    expect(console.error).toHaveBeenCalledWith('Failed to load reviews', expect.any(Error));

    Review.list.mockResolvedValue([pending]);
    Review.update.mockRejectedValueOnce(new Error('nope')).mockImplementationOnce(() => new Promise(() => {}));
    const { unmount } = render(<ReviewModeration />);
    await userEvent.click((await screen.findAllByText('قبول'))[0]!);
    await screen.findByText('تعذّر تنفيذ العملية');
    expect(console.error).toHaveBeenCalledWith('Review action failed', expect.any(Error));
    await userEvent.click(screen.getAllByText('قبول')[0]!);
    await waitFor(() => expect(screen.queryByText('تعذّر تنفيذ العملية')).toBeNull());
    unmount();
  });
});

