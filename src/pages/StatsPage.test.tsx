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
    // Show what a hover tooltip would say, and which colour each bar or slice gets.
    Tooltip: ({ formatter }: { formatter?: (v: number, name?: string) => unknown }) =>
      formatter ? <i data-testid="tip" data-text={JSON.stringify([formatter(1, 'booked'), formatter(1, 'free')])} /> : null,
    Cell: ({ fill }: { fill?: string }) => <i data-testid="cell" data-fill={fill} />,
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
    expect(screen.getAllByText('لا توجد بيانات')).toHaveLength(4);
    expect(card('أكثر شهر ازدحاماً')).toHaveTextContent('-');
    expect(card('الوقت الأكثر حجزاً')).toHaveTextContent('-');
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

  it('counts the free Fridays and Saturdays of the next three months and names the busiest month', () => {
    // From 15 June 2026: 4 + 9 + 9 weekend days in June, July and August; one Friday is taken.
    render(<StatsPage bookings={[
      makeBooking({ id: '1', date: '2026-06-19', event_name: 'زفاف أ' }),
      makeBooking({ id: '2', date: '2026-07-04', event_name: 'زفاف ب' }),
      makeBooking({ id: '3', date: '2026-07-20', event_name: 'غداء ج' }),
    ]} />);
    expect(card('جمعات وسبوت متاحة خلال 3 أشهر').textContent).toMatch(/3 أشهر20$/);   // 20, not -20
    expect(card('أكثر شهر ازدحاماً')).toHaveTextContent('تموز 2026');
  });

  it('describes weekend availability and the kinds of event for screen readers', () => {
    render(<StatsPage bookings={[
      makeBooking({ id: '1', date: '2026-06-19', event_name: 'زفاف أ' }),
      makeBooking({ id: '2', date: '2026-06-20', event_name: 'خطوبة ب' }),
      makeBooking({ id: '3', date: '2026-06-26', event_name: 'زفاف ج' }),
    ]} />);
    expect(screen.getByText('حزيران: 3 محجوز، 1 متاح')).toBeInTheDocument();
    expect(screen.getByText('زفاف: 2')).toBeInTheDocument();
    expect(screen.getByText('خطوبة: 1')).toBeInTheDocument();
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

  it('lists the months by first booking date, with the number of events in each, for screen readers', () => {
    render(<StatsPage bookings={[
      makeBooking({ id: '1', date: '2026-08-10' }), makeBooking({ id: '2', date: '2026-06-05' }),
      makeBooking({ id: '3', date: '2026-08-02' }), makeBooking({ id: '4', date: '2026-07-04', status: 'cancelled' }),
    ]} />);
    const lines = [...document.querySelectorAll('ul.sr-only')].flatMap(ul => [...ul.querySelectorAll('li')].map(li => li.textContent));
    expect(lines.filter(l => /: \d+$/.test(l ?? '') && /2026/.test(l ?? ''))).toEqual(['حزيران 2026: 1', 'آب 2026: 2']);
  });

  it('counts the events of each weekday, starting from Sunday', () => {
    render(<StatsPage bookings={[
      makeBooking({ id: '1', date: '2026-06-19' }), makeBooking({ id: '2', date: '2026-06-26' }), makeBooking({ id: '3', date: '2026-06-20' }),
    ]} />);
    const lines = [...document.querySelectorAll('li')].map(li => li.textContent);
    expect(lines).toEqual(expect.arrayContaining(['الأحد: 0', 'الجمعة: 2', 'السبت: 1']));
    expect(lines.indexOf('الأحد: 0')).toBeLessThan(lines.indexOf('الجمعة: 2'));
  });

  it('highlights only Friday and Saturday in the weekday chart', () => {
    render(<StatsPage bookings={[makeBooking({ id: '1', date: '2026-06-19' })]} />);
    const fills = screen.getAllByTestId('cell').slice(-7).map(c => c.getAttribute('data-fill'));
    expect(fills.slice(0, 5).every(f => f === fills[0])).toBe(true);
    expect(fills[5]).toBe(fills[6]);
    expect(fills[5]).not.toBe(fills[0]);
  });

  it('words the hover tooltips', () => {
    render(<StatsPage bookings={[makeBooking({ id: '1', date: '2026-06-19' })]} />);
    const tips = screen.getAllByTestId('tip').map(t => JSON.parse(t.getAttribute('data-text')!));
    expect(tips).toContainEqual([[1, 'محجوز'], [1, 'متاح']]);
    expect(tips.filter(t => JSON.stringify(t) === JSON.stringify([[1, 'حجز'], [1, 'حجز']]))).toHaveLength(2);   // monthly and weekday charts
    expect(tips).toContainEqual([[1, 'مناسبة'], [1, 'مناسبة']]);
  });

  it('gives every slot in the legend its own colour', () => {
    render(<StatsPage bookings={[
      makeBooking({ id: '1', time_slot: 'lunch' }), makeBooking({ id: '2', time_slot: 'afternoon' }),
      makeBooking({ id: '3', time_slot: 'wedding' }), makeBooking({ id: '4', time_slot: 'full' }),
    ]} />);
    const dots = [...document.querySelectorAll<HTMLElement>('span.inline-block.w-3')].map(s => s.style.background).filter(Boolean);   // the other legend colours its dots with classes
    expect(dots).toHaveLength(4);
    expect(new Set(dots).size).toBe(4);
    const rows = [...document.querySelectorAll<HTMLElement>('span.inline-block.w-3')].filter(s => s.style.background).map(s => s.parentElement!.textContent);
    expect(rows.map(r => r?.replace(/\d+%/, '').trim()).sort()).toEqual(['اليوم كاملاً', 'حفل زفاف مساءاً', 'خطبة / طلبة عصراً', 'غداء ظهراً'].sort());
  });

  it('draws no list for the pie, which the legend already describes', () => {
    render(<StatsPage bookings={[makeBooking({ id: '1' })]} />);
    expect(document.querySelectorAll('ul.sr-only').length).toBe(4);
  });

  it('updates every figure when the bookings change', () => {
    const { rerender } = render(<StatsPage bookings={[makeBooking({ id: '1', date: '2026-06-19', event_name: 'زفاف', time_slot: 'lunch' })]} />);
    expect(card('إجمالي الحجوزات')).toHaveTextContent('1');
    rerender(<StatsPage bookings={[
      makeBooking({ id: '1', date: '2026-07-04', event_name: 'غداء', time_slot: 'full' }),
      makeBooking({ id: '2', date: '2026-07-11', event_name: 'غداء', time_slot: 'full' }),
    ]} />);
    expect(card('إجمالي الحجوزات')).toHaveTextContent('2');
    expect(card('أكثر شهر ازدحاماً')).toHaveTextContent('تموز 2026');
    expect(card('الوقت الأكثر حجزاً')).toHaveTextContent('اليوم كاملاً');
    const lines = [...document.querySelectorAll('li')].map(li => li.textContent);
    expect(lines).toEqual(expect.arrayContaining(['تموز 2026: 2', 'غداء: 2', 'السبت: 2', 'الجمعة: 0', 'تموز: 2 محجوز، 7 متاح']));
  });
});

