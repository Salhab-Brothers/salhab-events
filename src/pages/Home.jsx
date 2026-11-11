import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CalendarPage from './CalendarPage';
import EventsPage from './EventsPage';
import RequestPage from './RequestPage';
import ReviewsPage from './ReviewsPage';
import AdminAuth from '@/components/AdminAuth';

// Heavy, rarely-used pages (charts, image export) load on demand.
const AdminPage = lazy(() => import('./AdminPage'));
const StatsPage = lazy(() => import('./StatsPage'));
import { useTheme } from '@/lib/theme';
import { entities, PUBLIC_BOOKING_COLUMNS } from '@/api/api';
import { useIsAdmin, signOutAdmin } from '@/lib/adminSession';


export default function Home() {
  const { theme, toggle } = useTheme();
  const [activePage, setActivePage] = useState('calendar');
  const [bookings, setBookings] = useState([]);
  const [requests, setRequests] = useState([]);
  const [editingBooking, setEditingBooking] = useState(null);
  const [initialized, setInitialized] = useState(false);
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const fetchedRef = useRef(false);

  const [loadError, setLoadError] = useState(false);

  const fetchData = async () => {
    try {
      await loadData();
      setLoadError(false);
    } catch (err) {
      console.error('Failed to load data', err);
      setLoadError(true);
    }
  };

  const loadData = async () => {
    // Requests are admin-only; anonymous visitors only load bookings.
    const [bList, rList] = await Promise.all([
      entities.Booking.list('-created_date', 1000, isAdmin ? '*' : PUBLIC_BOOKING_COLUMNS),
      isAdmin ? entities.BookingRequest.list('-created_date', 1000) : Promise.resolve([]),
    ]);
    // Deduplicate by composite key (event_name + date + time_slot) as safety net
    const dedupeBookings = (list) => {
      const seen = new Set();
      return list.filter(b => {
        const key = `${b.event_name}|${b.date}|${b.time_slot}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };
    setBookings(dedupeBookings(bList));
    setRequests(rList.filter((r, i, arr) => arr.findIndex(x => x.id === r.id) === i));
  };

  // On mount: load data — useRef guard prevents StrictMode double-invoke
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchData().then(() => setInitialized(true));
  }, []);

  // Load admin-only data once the admin check resolves (and clear it on logout)
  useEffect(() => {
    if (initialized) fetchData();
  }, [isAdmin]);

  // Re-fetch when switching back to calendar/events to get fresh data
  useEffect(() => {
    if (!initialized) return;
    if (activePage === 'calendar' || activePage === 'events') {
      fetchData();
    }
  }, [activePage]);

  const handleEditBooking = (booking) => {
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
            onLogout={() => { signOutAdmin(); setActivePage('calendar'); }}
          />
        );
      default:
        return <CalendarPage bookings={bookings} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar
        activePage={activePage}
        setActivePage={(page) => {
          if (page !== 'add-booking') setEditingBooking(null);
          setActivePage(page);
        }}
        theme={theme}
        toggleTheme={toggle}
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <Suspense fallback={<div className="min-h-[40vh]" />}>{renderPage()}</Suspense>
      </main>
      <Footer />
    </div>
  );
}