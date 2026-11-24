import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@/test/user';
import AddToCalendar from './AddToCalendar';
import { makeBooking } from '@/test/factories';

describe('AddToCalendar', () => {
  it('downloads a calendar file named for the day, with the event in it, and frees the temporary address', async () => {
    const seen: { blob?: Blob; name?: string } = {};
    const revoke = vi.fn();
    Object.assign(URL, { createObjectURL: vi.fn((b: Blob) => { seen.blob = b; return 'blob:cal'; }), revokeObjectURL: revoke });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { seen.name = `${this.download}|${this.href}`; });
    render(<AddToCalendar booking={makeBooking({ date: '2026-07-04', event_name: 'زفاف سامي' })} />);
    await userEvent.click(screen.getByRole('button', { name: /تقويمي/ }));
    expect(seen.blob!.type).toBe('text/calendar;charset=utf-8');
    expect(await seen.blob!.text()).toContain('BEGIN:VCALENDAR');
    expect(await seen.blob!.text()).toContain('زفاف سامي');
    expect(seen.name).toBe('2026-07-04.ics|blob:cal');
    expect(revoke).toHaveBeenCalledWith('blob:cal');
  });
});
