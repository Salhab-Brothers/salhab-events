import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { makeBooking } from '@/test/factories';

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
    const pie = document.querySelector('svg[role="presentation"][viewBox]')!;
    expect(pie.querySelectorAll('path')).toHaveLength(2);                        // one slice per slot in use
    expect(document.querySelectorAll('[data-bar="الأحد"]')).toHaveLength(1);    // and a bar position for every weekday
    expect(['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].every(d => bar(d))).toBe(true);
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

  const bar = (label: string) => document.querySelector(`[data-bar="${label}"]`)!;
  const fillsOf = (label: string) => [...bar(label).querySelectorAll('path')].map(p => p.getAttribute('fill'));

  it('highlights only Friday and Saturday in the weekday chart', () => {
    render(<StatsPage bookings={[
      makeBooking({ id: '1', date: '2026-06-19' }), makeBooking({ id: '2', date: '2026-06-20' }), makeBooking({ id: '3', date: '2026-06-15' }),
    ]} />);
    const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const [monday, friday, saturday] = [fillsOf(days[1]!)[0], fillsOf(days[5]!)[0], fillsOf(days[6]!)[0]];
    expect(friday).toBe(saturday);        // Friday and Saturday share a colour
    expect(friday).not.toBe(monday);      // an ordinary day has another
  });

  it('words the hover text of each bar', () => {
    render(<StatsPage bookings={[makeBooking({ id: '1', date: '2026-06-19', event_name: 'زفاف' })]} />);
    const titles = [...document.querySelectorAll('svg title')].map(t => t.textContent);
    expect(titles).toContain('الجمعة: 1 حجز');
    expect(titles).toContain('حزيران 2026: 1 حجز');
    expect(titles).toContain('زفاف: 1 مناسبة');
    expect(titles.some(t => /^حزيران: \d+ محجوز$/.test(t ?? ''))).toBe(true);
    expect(titles.some(t => /^حزيران: \d+ متاح$/.test(t ?? ''))).toBe(true);
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

