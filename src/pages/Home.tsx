import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AdminAuth from '@/components/AdminAuth';
import CalendarPage from './CalendarPage';
import EventsPage from './EventsPage';
import RequestPage from './RequestPage';
import ReviewsPage from './ReviewsPage';
import { useTheme } from '@/lib/theme';
import { entities, PUBLIC_BOOKING_COLUMNS } from '@/api/api';
import { useIsAdmin, signOutAdmin } from '@/lib/adminSession';
import { pageFromHash, pageHash } from '@/lib/route';
import type { Booking, BookingRequest, PageId } from '@/types';

// Heavy, rarely-used pages (charts, image export) load on demand.
const AdminPage = lazy(() => import('./AdminPage'));
const StatsPage = lazy(() => import('./StatsPage'));

export default function Home() {
  const { theme, toggle } = useTheme();
  // The page lives in the URL hash (#/reviews), so reload, back and shared links work.
  const [activePage, setActivePage] = useState<PageId>(() => pageFromHash(window.location.hash));
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [requests, setRequests] = useState<BookingRequest[]>([]);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const mainRef = useRef<HTMLElement>(null);

  // Requests and full booking rows are admin-only; visitors load public columns.
  // Re-created when the admin state changes, which re-runs the load effect below.
  const fetchData = useCallback(async () => {
    // Offline: say so at once instead of waiting for the database client's retries to give up.
    if (!navigator.onLine) {
      setLoadError(true);
      return;
    }
    try {
      const [bList, rList] = await Promise.all([
        entities.Booking.list('-created_date', 1000, isAdmin ? '*' : PUBLIC_BOOKING_COLUMNS),
        isAdmin ? entities.BookingRequest.list('-created_date', 1000) : Promise.resolve([]),
      ]);
      setBookings(bList);
      setRequests(rList);
      setLoadError(false);
    } catch (err) {
      console.error('Failed to load data', err);
      setLoadError(true);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchData().then(() => setInitialized(true));
  }, [fetchData]);

  const showPage = useCallback((page: PageId) => {
    setEditingBooking(null);
    setActivePage(page);
    // Fresh data when returning to the public listings
    if (page === 'calendar' || page === 'events') fetchData();
  }, [fetchData]);

  useEffect(() => {
    const onHashChange = () => showPage(pageFromHash(window.location.hash));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [showPage]);

  const handlePageChange = (page: PageId) => {
    // A new hash triggers showPage through the listener above; the same page just refreshes.
    if (window.location.hash === pageHash(page)) showPage(page);
    else window.location.hash = pageHash(page);
  };

  const handleEditBooking = (booking: Booking) => {
    setEditingBooking(booking);
    setActivePage('admin');
  };

  const renderPage = () => {
    if (!initialized) {
      return (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
        </div>
      );
    }

    if (loadError && (activePage === 'calendar' || activePage === 'events' || activePage === 'stats')) {
      return (
        <div className="text-center py-16 space-y-4">
          <p className="font-body text-foreground">تعذّر تحميل البيانات. تحقق من الاتصال وحاول مرة أخرى.</p>
          <button onClick={fetchData} className="font-body text-sm text-primary hover:underline">إعادة المحاولة</button>
        </div>
      );
    }

    switch (activePage) {
      case 'calendar':
        return <CalendarPage bookings={bookings} />;
      case 'events':
        return <EventsPage bookings={bookings} />;
      case 'request':
        return <RequestPage />;
      case 'reviews':
        return <ReviewsPage />;
      case 'stats':
        return <StatsPage bookings={bookings} />;
      case 'admin':
        if (adminLoading) return null;
        if (!isAdmin) return <AdminAuth />;
        return (
          <AdminPage
            bookings={bookings}
            requests={requests}
            onRefresh={fetchData}
            onEditBooking={handleEditBooking}
            editingBooking={editingBooking}
            onClearEdit={() => setEditingBooking(null)}
            onLogout={() => { signOutAdmin(); handlePageChange('calendar'); }}
          />
        );
    }
  };

  return (
    <div className="min-h-dvh bg-background">
      {/* First stop for keyboard users: jump past the navigation. Not a link to "#main-content" because the
          address bar's hash is the page router. */}
      <a
        href="#main-content"
        onClick={(e) => { e.preventDefault(); mainRef.current?.focus(); }}
        className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        انتقل إلى المحتوى
      </a>
      <Navbar
        activePage={activePage}
        setActivePage={handlePageChange}
        theme={theme}
        toggleTheme={toggle}
      />
      <main id="main-content" ref={mainRef} tabIndex={-1} className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 focus:outline-none">
        <Suspense fallback={<div className="min-h-[40vh]" />}>{renderPage()}</Suspense>
      </main>
      <Footer />
    </div>
  );
}
