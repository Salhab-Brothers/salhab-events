import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CalendarPage from './CalendarPage';
import { makeBooking } from '@/test/factories';

describe('CalendarPage', () => {
  it('shows the heading, the summary and the grid', () => {
    render(<CalendarPage bookings={[makeBooking({ date: '2099-01-10', event_name: 'مناسبة المستقبل' })]} />);
    expect(screen.getByText('تقويم المناسبات')).toBeInTheDocument();
    expect(screen.getByText('إجمالي المحجوز')).toBeInTheDocument();
    expect(screen.getByText('اليوم كاملاً')).toBeInTheDocument(); // legend
    expect(screen.getByText(/مناسبة المستقبل —/)).toBeInTheDocument();
  });
});
