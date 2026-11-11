import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { makeBooking } from '@/test/factories';

// jsdom has no layout, so charts render nothing; stub them with plain elements.
vi.mock('recharts', () => {
  const Box = ({ children }: { children?: ReactNode }) => <div>{children}</div>;
  return {
    ResponsiveContainer: Box, BarChart: Box, PieChart: Box, Pie: Box, Bar: Box,
    XAxis: () => null, YAxis: () => null,
    Tooltip: ({ formatter }: { formatter?: (v: number) => unknown }) => {
      formatter?.(1);
      return null;
    },
    Cell: () => <i data-testid="cell" />,
  };
});

import StatsPage from './StatsPage';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 5, 15));
});
afterEach(() => vi.useRealTimers());

const card = (label: string) => screen.getByText(label).parentElement!;

describe('StatsPage', () => {
  it('shows empty states without bookings', () => {
    render(<StatsPage bookings={[]} />);
    expect(screen.getAllByText('لا توجد بيانات')).toHaveLength(3);
    expect(card('الوقت الأكثر حجزاً')).toHaveTextContent('—');
    expect(card('إجمالي الحجوزات')).toHaveTextContent('0');
  });

  it('summarises totals, upcoming and finished events, ignoring cancelled ones', () => {
    render(<StatsPage bookings={[
      makeBooking({ id: '1', date: '2026-06-20', time_slot: 'wedding' }),
      makeBooking({ id: '2', date: '2026-07-04', time_slot: 'evening' }),
      makeBooking({ id: '3', date: '2026-05-01', time_slot: 'lunch' }),
      makeBooking({ id: '4', date: '2026-06-22', time_slot: 'full', status: 'cancelled' }),
    ]} />);
    expect(card('إجمالي الحجوزات')).toHaveTextContent('3');
    expect(card('المناسبات القادمة')).toHaveTextContent('2');
    expect(card('المناسبات المنتهية')).toHaveTextContent('1');
  });

  it('reports the most popular slot, merging legacy names', () => {
    render(<StatsPage bookings={[
      makeBooking({ id: '1', time_slot: 'wedding' }),
      makeBooking({ id: '2', time_slot: 'evening' }),
      makeBooking({ id: '3', time_slot: 'lunch' }),
    ]} />);
    expect(card('الوقت الأكثر حجزاً')).toHaveTextContent('حفل زفاف مساءاً');
    // legend with percentages: 67% wedding, 33% lunch
    expect(screen.getByText('67%')).toBeInTheDocument();
    expect(screen.getByText('33%')).toBeInTheDocument();
  });

  it('draws one pie cell per slot and one bar cell per weekday', () => {
    render(<StatsPage bookings={[
      makeBooking({ id: '1', time_slot: 'lunch' }),
      makeBooking({ id: '2', time_slot: 'afternoon' }),
    ]} />);
    expect(screen.getAllByTestId('cell')).toHaveLength(2 + 7);
  });

  it('orders months chronologically even when bookings arrive unordered', () => {
    render(<StatsPage bookings={[
      makeBooking({ id: '1', date: '2026-09-10' }),
      makeBooking({ id: '2', date: '2026-07-04' }),
      makeBooking({ id: '3', date: '2026-07-20' }),
      makeBooking({ id: '4', date: '2026-07-01' }),
    ]} />);
    expect(screen.getByText('الحجوزات حسب الشهر')).toBeInTheDocument();
  });
});
