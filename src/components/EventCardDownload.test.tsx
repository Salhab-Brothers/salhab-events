import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import EventCardDownload from './EventCardDownload';
import { installCanvasMock } from '@/test/canvasMock';
import { makeBooking } from '@/test/factories';
import type { TimeSlot } from '@/types';

let clickSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.useFakeTimers();
  installCanvasMock();
  clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const download = async (booking = makeBooking()) => {
  render(<EventCardDownload booking={booking} />);
  fireEvent.click(screen.getByRole('button'));
  expect(screen.getByRole('button')).toHaveTextContent('...');
  expect(screen.getByRole('button')).toBeDisabled();
  await act(async () => { vi.advanceTimersByTime(50); });
};

describe('EventCardDownload', () => {
  it('draws a card and downloads it with a safe file name', async () => {
    const created: HTMLAnchorElement[] = [];
    const orig = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = orig(tag);
      if (tag === 'a') created.push(el as HTMLAnchorElement);
      return el;
    });
    await download(makeBooking({ event_name: 'زفاف أحمد وسارة', date: '2026-06-20' }));
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(created[0].download).toBe('زفاف-أحمد-وسارة-2026-06-20.jpg');
    expect(created[0].href).toContain('data:image/jpeg');
    expect(screen.getByRole('button')).toHaveTextContent('بطاقة');
    expect(screen.getByRole('button')).toBeEnabled();
  });

  it.each(['lunch', 'afternoon', 'wedding', 'full', 'morning', 'evening'] as TimeSlot[])(
    'draws a %s card', async (slot) => {
      await download(makeBooking({ time_slot: slot }));
      expect(clickSpy).toHaveBeenCalled();
    });

  it('adds the diwan badge when booked', async () => {
    await download(makeBooking({ book_diwan: true }));
    expect(clickSpy).toHaveBeenCalled();
  });

  it('wraps a long event name across lines', async () => {
    const long = Array.from({ length: 30 }, (_, i) => `كلمة${i}`).join(' ');
    await download(makeBooking({ event_name: long }));
    expect(clickSpy).toHaveBeenCalled();
  });

  it('accepts a custom button size', () => {
    render(<EventCardDownload booking={makeBooking()} size="lg" />);
    expect(screen.getByRole('button').className).toContain('h-10');
  });
});
