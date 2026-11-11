import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { makeBooking } from '@/test/factories';

const { html2canvas } = vi.hoisted(() => ({ html2canvas: vi.fn() }));
vi.mock('html2canvas', () => ({ default: html2canvas }));

import DownloadEventsImage from './DownloadEventsImage';

let clickSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 5, 15, 9, 5));
  html2canvas.mockReset();
  html2canvas.mockResolvedValue({ toDataURL: () => 'data:image/jpeg;base64,AAA' });
  Object.defineProperty(document, 'fonts', { value: { ready: Promise.resolve() }, configurable: true });
  clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const bookings = [
  makeBooking({ id: '1', date: '2026-06-15', time_slot: 'lunch', event_name: 'مناسبة اليوم', book_diwan: true }), // today (Monday)
  makeBooking({ id: '2', date: '2026-06-19', time_slot: 'afternoon', event_name: 'عصر الجمعة' }), // Friday
  makeBooking({ id: '3', date: '2026-06-20', time_slot: 'full', event_name: 'كامل السبت' }), // Saturday
  makeBooking({ id: '4', date: '2026-06-22', time_slot: 'wedding', event_name: 'مساء' }),
  makeBooking({ id: '5', date: '2026-06-23', time_slot: 'morning', event_name: 'قديم الاسم' }),
  makeBooking({ id: '6', date: '2026-06-01', event_name: 'مضى' }),
  makeBooking({ id: '7', date: '2026-06-24', status: 'cancelled', event_name: 'ملغى' }),
];

describe('DownloadEventsImage', () => {
  it('lists only upcoming, non-cancelled events (including today)', () => {
    render(<DownloadEventsImage bookings={bookings} />);
    expect(screen.getByText('5 مناسبة قادمة')).toBeInTheDocument();
    expect(screen.getByText('مناسبة اليوم')).toBeInTheDocument();
    expect(screen.queryByText('مضى')).toBeNull();
    expect(screen.queryByText('ملغى')).toBeNull();
    expect(screen.getByText('✅')).toBeInTheDocument();
  });

  it('shows an empty state and disables download', () => {
    render(<DownloadEventsImage bookings={[]} />);
    expect(screen.getByText('لا توجد مناسبات قادمة')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /تحميل الصورة/ })).toBeDisabled();
  });

  it('renders the stored last-update time', () => {
    localStorage.setItem('salhab_image_timestamp', new Date(2026, 5, 14, 15, 30).toISOString());
    render(<DownloadEventsImage bookings={bookings} />);
    expect(screen.getByText(/آخر تحديث: الأحد، 14 يونيو 2026 الساعة 3:30 م/)).toBeInTheDocument();
  });

  it('formats morning and midnight times', () => {
    localStorage.setItem('salhab_image_timestamp', new Date(2026, 5, 14, 0, 7).toISOString());
    render(<DownloadEventsImage bookings={bookings} />);
    expect(screen.getByText(/الساعة 12:07 ص/)).toBeInTheDocument();
  });

  it('downloads the image and records the time', async () => {
    render(<DownloadEventsImage bookings={bookings} />);
    await userEvent.click(screen.getByRole('button', { name: /تحميل الصورة/ }));
    await waitFor(() => expect(clickSpy).toHaveBeenCalledTimes(1));
    expect(html2canvas).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('salhab_image_timestamp')).toBeTruthy();
    expect(await screen.findByText(/آخر تحديث/)).toBeInTheDocument();
  });

  it('prepares the cloned document for rendering', async () => {
    render(<DownloadEventsImage bookings={bookings} />);
    await userEvent.click(screen.getByRole('button', { name: /تحميل الصورة/ }));
    await waitFor(() => expect(html2canvas).toHaveBeenCalled());
    const { onclone } = html2canvas.mock.calls[0][1] as { onclone: (d: Document) => void };

    const doc = document.implementation.createHTMLDocument('x');
    doc.body.innerHTML = '<div data-printable style="max-width:960px"></div><h1 data-canvas-font></h1>';
    onclone(doc);
    expect(doc.querySelector<HTMLElement>('[data-printable]')!.style.width).toBe('960px');
    expect(doc.querySelector<HTMLElement>('[data-canvas-font]')!.style.fontFamily).toContain('Tahoma');

    onclone(document.implementation.createHTMLDocument('empty')); // nothing to patch
  });

  it('refreshes through the callback and records the time', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    render(<DownloadEventsImage bookings={bookings} onRefresh={onRefresh} />);
    await userEvent.click(screen.getByRole('button', { name: /تحديث الصورة/ }));
    await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/آخر تحديث/)).toBeInTheDocument();
  });

  it('refreshes without a callback', async () => {
    render(<DownloadEventsImage bookings={bookings} />);
    await userEvent.click(screen.getByRole('button', { name: /تحديث الصورة/ }));
    expect(await screen.findByText(/آخر تحديث/)).toBeInTheDocument();
  });
});
