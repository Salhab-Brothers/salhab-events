import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    await userEvent.click(screen.getAllByRole('button')[0]);
    await waitFor(() => expect(Review.delete).toHaveBeenCalledWith('a'));
  });

  it('does not delete when the admin cancels', async () => {
    vi.mocked(window.confirm).mockReturnValueOnce(false);
    Review.list.mockResolvedValue([approved]);
    render(<ReviewModeration />);
    await screen.findByText('مقبول');
    await userEvent.click(screen.getAllByRole('button')[0]);
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
});
