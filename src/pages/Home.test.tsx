import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@/test/user';
import { makeBooking, makeRequest } from '@/test/factories';

const { Booking, BookingRequest, adminState, signOutAdmin } = vi.hoisted(() => ({
  Booking: { list: vi.fn() },
  BookingRequest: { list: vi.fn() },
  adminState: { isAdmin: false, loading: false },
  signOutAdmin: vi.fn(),
}));

vi.mock('@/api/api', () => ({
  entities: { Booking, BookingRequest },
  PUBLIC_BOOKING_COLUMNS: 'public-cols',
}));
vi.mock('@/lib/adminSession', () => ({ useIsAdmin: () => adminState, signOutAdmin }));
vi.mock('./CalendarPage', () => ({ default: ({ bookings }: { bookings: unknown[] }) => <div>calendar:{bookings.length}</div> }));
vi.mock('./EventsPage', () => ({ default: ({ bookings }: { bookings: unknown[] }) => <div>events:{bookings.length}</div> }));
vi.mock('./RequestPage', () => ({ default: () => <div>request-page</div> }));
vi.mock('./ReviewsPage', () => ({ default: () => <div>reviews-page</div> }));
vi.mock('./StatsPage', () => ({ default: ({ bookings }: { bookings: unknown[] }) => <div>stats:{bookings.length}</div> }));
vi.mock('@/components/AdminAuth', () => ({ default: () => <div>login-form</div> }));
vi.mock('./AdminPage', () => ({
  default: (p: {
    bookings: unknown[]; requests: unknown[]; editingBooking: { id: string } | null;
    onEditBooking: (b: ReturnType<typeof makeBooking>) => void; onClearEdit: () => void;
    onLogout: () => void; onRefresh: () => void;
  }) => (
    <div>
      admin:{p.bookings.length}:{p.requests.length}:{p.editingBooking?.id ?? 'none'}
      <button onClick={() => p.onEditBooking(makeBooking({ id: 'edit-me' }))}>edit</button>
      <button onClick={p.onClearEdit}>clear</button>
      <button onClick={p.onLogout}>logout</button>
      <button onClick={p.onRefresh}>refresh</button>
    </div>
  ),
}));

import Home from './Home';

const nav = (label: string) => screen.getAllByText(label)[0];

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  adminState.isAdmin = false;
  adminState.loading = false;
  Booking.list.mockResolvedValue([makeBooking({ id: '1' }), makeBooking({ id: '2' })]);
  BookingRequest.list.mockResolvedValue([makeRequest()]);
});

describe('Home: loading', () => {
  it('shows a spinner, then the calendar with public columns only', async () => {
    const { container } = render(<Home />);
    expect(container.querySelector('.animate-spin')).not.toBeNull();
    expect(await screen.findByText('calendar:2')).toBeInTheDocument();
    expect(Booking.list).toHaveBeenCalledWith('-created_date', 1000, 'public-cols');
    expect(BookingRequest.list).not.toHaveBeenCalled();
  });

  it('shows an error with retry when loading fails, then recovers', async () => {
    Booking.list.mockRejectedValueOnce(new Error('down'));
    render(<Home />);
    expect(await screen.findByText(/تعذّر تحميل البيانات/)).toBeInTheDocument();
    await userEvent.click(screen.getByText('إعادة المحاولة'));
    expect(await screen.findByText('calendar:2')).toBeInTheDocument();
  });

  it('shows the retry message at once when the browser is offline, without calling the database', async () => {
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    render(<Home />);
    expect(await screen.findByText(/تعذّر تحميل البيانات/)).toBeInTheDocument();
    expect(Booking.list).not.toHaveBeenCalled();
    online.mockReturnValue(true);
    await userEvent.click(screen.getByText('إعادة المحاولة'));
    expect(await screen.findByText('calendar:2')).toBeInTheDocument();
    online.mockRestore();
  });

  it('keeps pages that need no data usable during a load failure', async () => {
    Booking.list.mockRejectedValue(new Error('down'));
    render(<Home />);
    await screen.findByText(/تعذّر تحميل البيانات/);
    await userEvent.click(nav('طلب حجز'));
    expect(screen.getByText('request-page')).toBeInTheDocument();
    await userEvent.click(nav('التقييمات'));
    expect(screen.getByText('reviews-page')).toBeInTheDocument();
  });
});

describe('Home: keyboard', () => {
  it('has a skip link that moves focus to the content without changing the page address', async () => {
    Booking.list.mockResolvedValue([]);
    render(<Home />);
    await screen.findByText('calendar:0');
    const hashBefore = window.location.hash;
    await userEvent.click(screen.getByRole('link', { name: 'انتقل إلى المحتوى' }));
    expect(screen.getByRole('main')).toHaveFocus();
    expect(window.location.hash).toBe(hashBefore);
  });
});

describe('Home: navigation', () => {
  it('visits every public page', async () => {
    render(<Home />);
    await screen.findByText('calendar:2');
    await userEvent.click(nav('المناسبات'));
    expect(screen.getByText('events:2')).toBeInTheDocument();
    await userEvent.click(nav('الإحصائيات'));
    expect(await screen.findByText('stats:2')).toBeInTheDocument();
    await userEvent.click(nav('التقويم'));
    expect(screen.getByText('calendar:2')).toBeInTheDocument();
  });

  it('refreshes data when returning to the calendar or events, but not for other pages', async () => {
    render(<Home />);
    await screen.findByText('calendar:2');
    expect(Booking.list).toHaveBeenCalledTimes(1);
    await userEvent.click(nav('طلب حجز'));
    expect(Booking.list).toHaveBeenCalledTimes(1);
    await userEvent.click(nav('التقويم'));
    await waitFor(() => expect(Booking.list).toHaveBeenCalledTimes(2));
    await userEvent.click(nav('المناسبات'));
    await waitFor(() => expect(Booking.list).toHaveBeenCalledTimes(3));
  });
});

describe('Home: page URLs', () => {
  it('opens the page named in the URL hash', async () => {
    window.location.hash = '#/reviews';
    render(<Home />);
    expect(await screen.findByText('reviews-page')).toBeInTheDocument();
  });

  it('falls back to the calendar for an unknown hash', async () => {
    window.location.hash = '#/nowhere';
    render(<Home />);
    expect(await screen.findByText('calendar:2')).toBeInTheDocument();
  });

  it('puts the page in the URL when navigating, and follows back and forward', async () => {
    render(<Home />);
    await screen.findByText('calendar:2');
    await userEvent.click(nav('التقييمات'));
    expect(await screen.findByText('reviews-page')).toBeInTheDocument();
    expect(window.location.hash).toBe('#/reviews');
    await userEvent.click(nav('المناسبات'));
    expect(await screen.findByText('events:2')).toBeInTheDocument();

    window.history.back();
    expect(await screen.findByText('reviews-page')).toBeInTheDocument();
    window.history.forward();
    expect(await screen.findByText('events:2')).toBeInTheDocument();
  });

  it('refreshes the data when the page you are already on is chosen again', async () => {
    window.history.replaceState(null, '', '#/calendar');   // no hashchange event, like a fresh page load
    render(<Home />);
    await screen.findByText('calendar:2');
    await userEvent.click(nav('التقويم'));
    await waitFor(() => expect(Booking.list).toHaveBeenCalledTimes(2));
    expect(window.location.hash).toBe('#/calendar');
  });
});

describe('Home: admin area', () => {
  it('shows the login form to visitors', async () => {
    render(<Home />);
    await screen.findByText('calendar:2');
    await userEvent.click(nav('الإدارة'));
    expect(screen.getByText('login-form')).toBeInTheDocument();
  });

  it('shows nothing while the admin check is running', async () => {
    adminState.loading = true;
    render(<Home />);
    await screen.findByText('calendar:2');
    await userEvent.click(nav('الإدارة'));
    expect(screen.queryByText('login-form')).toBeNull();
    expect(screen.queryByText(/admin:/)).toBeNull();
  });

  it('loads full bookings and requests for admins', async () => {
    adminState.isAdmin = true;
    render(<Home />);
    await screen.findByText('calendar:2');
    expect(Booking.list).toHaveBeenCalledWith('-created_date', 1000, '*');
    expect(BookingRequest.list).toHaveBeenCalledWith('-created_date', 1000);
    await userEvent.click(nav('الإدارة'));
    expect(await screen.findByText(/admin:2:1:none/)).toBeInTheDocument();
  });

  it('edits a booking, clears the edit, and clears it when navigating away', async () => {
    adminState.isAdmin = true;
    render(<Home />);
    await screen.findByText('calendar:2');
    await userEvent.click(nav('الإدارة'));
    await userEvent.click(await screen.findByText('edit'));
    expect(screen.getByText(/admin:2:1:edit-me/)).toBeInTheDocument();
    await userEvent.click(screen.getByText('clear'));
    expect(screen.getByText(/admin:2:1:none/)).toBeInTheDocument();
    await userEvent.click(screen.getByText('edit'));
    await userEvent.click(nav('طلب حجز'));
    await userEvent.click(nav('الإدارة'));
    expect(screen.getByText(/admin:2:1:none/)).toBeInTheDocument();
  });

  it('refreshes on request and logs out to the calendar', async () => {
    adminState.isAdmin = true;
    render(<Home />);
    await screen.findByText('calendar:2');
    await userEvent.click(nav('الإدارة'));
    await userEvent.click(await screen.findByText('refresh'));
    await waitFor(() => expect(Booking.list).toHaveBeenCalledTimes(2));
    await userEvent.click(screen.getByText('logout'));
    expect(signOutAdmin).toHaveBeenCalled();
    expect(screen.getByText('calendar:2')).toBeInTheDocument();
  });

  it('reloads with admin data when the admin state flips', async () => {
    const { rerender } = render(<Home />);
    await screen.findByText('calendar:2');
    adminState.isAdmin = true;
    rerender(<Home />);
    await waitFor(() => expect(BookingRequest.list).toHaveBeenCalled());
    expect(Booking.list).toHaveBeenLastCalledWith('-created_date', 1000, '*');
  });

  it('toggles the theme', async () => {
    render(<Home />);
    await screen.findByText('calendar:2');
    await userEvent.click(screen.getByTitle('الوضع الداكن'));
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
