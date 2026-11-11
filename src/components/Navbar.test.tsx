import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@/test/user';
import Navbar from './Navbar';
import type { PageId, Theme } from '@/types';

const setup = (over: { activePage?: PageId; theme?: Theme } = {}) => {
  const setActivePage = vi.fn();
  const toggleTheme = vi.fn();
  render(
    <Navbar activePage={over.activePage ?? 'calendar'} setActivePage={setActivePage}
      theme={over.theme ?? 'light'} toggleTheme={toggleTheme} />,
  );
  return { setActivePage, toggleTheme };
};

describe('Navbar', () => {
  it('navigates from the desktop nav', async () => {
    const { setActivePage } = setup();
    const nav = within(screen.getByRole('navigation'));
    await userEvent.click(nav.getByText('المناسبات'));
    expect(setActivePage).toHaveBeenCalledWith('events');
    await userEvent.click(nav.getByText('الإدارة'));
    expect(setActivePage).toHaveBeenCalledWith('admin');
  });

  it('highlights the active page', () => {
    setup({ activePage: 'stats' });
    const nav = within(screen.getByRole('navigation'));
    expect(nav.getByText('الإحصائيات').closest('button')!.className).toContain('bg-primary');
    expect(nav.getByText('التقويم').closest('button')!.className).not.toContain('bg-primary ');
  });

  it('returns to the calendar from the logo', async () => {
    const { setActivePage } = setup({ activePage: 'reviews' });
    await userEvent.click(screen.getAllByRole('button')[0]);
    expect(setActivePage).toHaveBeenCalledWith('calendar');
  });

  it('toggles the theme and shows the matching title', async () => {
    const { toggleTheme } = setup({ theme: 'light' });
    await userEvent.click(screen.getByTitle('الوضع الداكن'));
    expect(toggleTheme).toHaveBeenCalledTimes(1);
  });

  it('offers the light-mode action while dark', () => {
    setup({ theme: 'dark' });
    expect(screen.getByTitle('الوضع الفاتح')).toBeInTheDocument();
  });

  it('opens the mobile menu, navigates, and closes it', async () => {
    const { setActivePage } = setup({ activePage: 'events' });
    const buttons = screen.getAllByRole('button');
    const menuToggle = buttons[buttons.length - 1];
    await userEvent.click(menuToggle);
    const items = screen.getAllByText('التقييمات');
    expect(items).toHaveLength(2); // desktop + mobile
    await userEvent.click(items[1]);
    expect(setActivePage).toHaveBeenCalledWith('reviews');
    expect(screen.getAllByText('التقييمات')).toHaveLength(1); // menu closed again
  });

  it('marks the active page inside the mobile menu', async () => {
    setup({ activePage: 'request' });
    const buttons = screen.getAllByRole('button');
    await userEvent.click(buttons[buttons.length - 1]);
    const mobile = screen.getAllByText('طلب حجز')[1].closest('button')!;
    expect(mobile.className).toContain('bg-primary');
  });
});
