import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@/test/user';
import Logo from './Logo';
import Footer from './Footer';
import IslamicDateWarning from './IslamicDateWarning';
import ConflictDialog from './ConflictDialog';
import SummaryBar from './SummaryBar';
import PageNotFound from '@/lib/PageNotFound';
import { makeBooking } from '@/test/factories';

describe('Logo', () => {
  it('renders at the default and a custom size', () => {
    const { container, rerender } = render(<Logo />);
    expect(container.querySelector('svg')).toHaveAttribute('width', '40');
    rerender(<Logo size={56} />);
    expect(container.querySelector('svg')).toHaveAttribute('width', '56');
  });
});

describe('Footer', () => {
  it('links to the profile page safely', () => {
    render(<Footer />);
    const link = screen.getByRole('link', { name: 'SalhabBrothers' });
    expect(link).toHaveAttribute('href', 'https://linktr.ee/SalhabBrothers');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link.getAttribute('rel')).toContain('noopener');
  });
});

describe('IslamicDateWarning', () => {
  it('renders nothing without a date or on an ordinary day', () => {
    const { container, rerender } = render(<IslamicDateWarning dateStr="" />);
    expect(container).toBeEmptyDOMElement();
    rerender(<IslamicDateWarning dateStr="2026-06-10" />);
    expect(container).toBeEmptyDOMElement();
  });

  it.each(['2026-02-17', '2026-05-26', '2026-03-19'])('warns on %s', (d) => {
    render(<IslamicDateWarning dateStr={d} />);
    expect(screen.getByText(/هذا اليوم مناسبة إسلامية/)).toBeInTheDocument();
  });

  it('falls back to a default style for an unknown event type', async () => {
    vi.resetModules();
    vi.doMock('@/lib/islamicDates', () => ({
      getIslamicEvents: () => [{ type: 'mystery', label: 'حدث', emoji: '⭐' }],
    }));
    const { default: Fresh } = await import('./IslamicDateWarning');
    render(<Fresh dateStr="2026-01-01" />);
    expect(screen.getByText(/حدث/)).toBeInTheDocument();
    vi.doUnmock('@/lib/islamicDates');
  });
});

describe('ConflictDialog', () => {
  const conflicts = [
    makeBooking({ event_name: 'زفاف أ', date: '2026-05-01', time_slot: 'wedding' }),
    makeBooking({ id: 'b2', event_name: 'غداء ب', date: '', time_slot: 'lunch' }),
  ];

  it('lists conflicts and wires both actions', async () => {
    const onOverride = vi.fn();
    const onCancel = vi.fn();
    render(<ConflictDialog conflicts={conflicts} onOverride={onOverride} onCancel={onCancel} />);
    expect(screen.getByText('زفاف أ')).toBeInTheDocument();
    expect(screen.getByText('غداء ب')).toBeInTheDocument();
    await userEvent.click(screen.getByText('تجاهل والحفظ'));
    await userEvent.click(screen.getByText('إلغاء'));
    expect(onOverride).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe('SummaryBar', () => {
  afterEach(() => vi.useRealTimers());

  it('summarises upcoming events and ignores cancelled ones', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 5, 15));
    render(
      <SummaryBar
        bookings={[
          makeBooking({ date: '2026-06-01', event_name: 'قديم' }),
          makeBooking({ date: '2026-07-10', event_name: 'لاحقاً' }),
          makeBooking({ date: '2026-06-20', event_name: 'الأقرب' }),
          makeBooking({ date: '2026-06-18', event_name: 'ملغى', status: 'cancelled' }),
        ]}
      />,
    );
    expect(screen.getByText('3 يوم')).toBeInTheDocument();
    expect(screen.getByText('2 مناسبة')).toBeInTheDocument();
    expect(screen.getByText(/الأقرب -/)).toBeInTheDocument();
  });

  it('shows a placeholder when nothing is upcoming', () => {
    render(<SummaryBar bookings={[]} />);
    expect(screen.getByText('لا توجد مناسبات قادمة')).toBeInTheDocument();
    expect(screen.getByText('0 يوم')).toBeInTheDocument();
  });
});

describe('PageNotFound', () => {
  it('offers a way home', () => {
    render(<PageNotFound />);
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/');
  });
});

describe('IslamicDateWarning colours', () => {
  it.each([['2026-02-17', 'bg-indigo-50'], ['2026-05-26', 'bg-teal-50'], ['2026-03-19', 'bg-purple-50'], ['2026-05-27', 'bg-purple-50']])(
    'uses its own colour on %s', (date, cls) => {
      const { container } = render(<IslamicDateWarning dateStr={date} />);
      expect(container.firstElementChild!.className).toContain(cls);
    });
});

describe('ConflictDialog dates', () => {
  it('writes the date of a conflict out, and nothing for a booking without one', () => {
    render(<ConflictDialog conflicts={[
      makeBooking({ event_name: 'زفاف أ', date: '2026-05-01', time_slot: 'wedding' }),
      makeBooking({ id: 'b2', event_name: 'غداء ب', date: '', time_slot: 'lunch' }),
    ]} onOverride={vi.fn()} onCancel={vi.fn()} />);
    const rows = [...document.querySelectorAll('.bg-orange-50')];
    expect(rows[0].querySelectorAll('span')[0].textContent).toMatch(/2026/);
    expect(rows[1].querySelectorAll('span')[0].textContent).toBe('');
  });
});

describe('SummaryBar details', () => {
  afterEach(() => vi.useRealTimers());
  it('names the next event with its day and month in Arabic, and gives the last card a wider look only', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 5, 15));
    const { container } = render(<SummaryBar bookings={[makeBooking({ date: '2026-06-20', event_name: 'الأقرب' })]} />);
    expect(screen.getByText('الأقرب - 20 يونيو')).toBeInTheDocument();
    const cards = [...container.firstElementChild!.children];
    expect(cards).toHaveLength(3);
    expect(cards[2].className).not.toBe(cards[1].className);   // the third card spans the row
  });
});


describe('SlotPicker', () => {
  it('marks only the chosen slot as pressed and highlighted', async () => {
    const { SlotPicker } = await import('./FormControls');
    const { container } = render(<><span id="lbl">وقت</span><SlotPicker value="afternoon" onChange={vi.fn()} labelId="lbl" /></>);
    const buttons = [...container.querySelectorAll('button')];
    expect(buttons).toHaveLength(4);
    expect(buttons.map(b => b.getAttribute('aria-pressed'))).toEqual(['false', 'true', 'false', 'false']);
    expect(buttons.map(b => b.className.includes('bg-primary'))).toEqual([false, true, false, false]);
  });
});
