import { useState } from 'react';
import { format } from 'date-fns';
import { formatFullDateStr } from '@/lib/levantineMonths';
import { Check, X, MessageCircle, Trash2, Pencil, CalendarDays, Phone, User, Clock, Inbox, LogOut, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { entities } from '@/api/api';
import { TIME_SLOT_LABELS, slotsClash } from '@/lib/data';
import { bookingsToCsv } from '@/lib/csv';
import { replyLink } from '@/lib/whatsapp';
import type { Booking, BookingRequest, RequestStatus } from '@/types';
import { useDialog } from '@/components/useDialog';
import AddBookingPage from './AddBookingPage';
import ReviewModeration from '@/components/ReviewModeration';
import DownloadEventsImage from '@/components/DownloadEventsImage';
import EventCardDownload from '@/components/EventCardDownload';

const REQ_STATUS: Record<RequestStatus, { label: string; cls: string }> = {
  pending: { label: 'بانتظار المراجعة', cls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
  approved: { label: 'مقبول', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
  rejected: { label: 'مرفوض', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

type Tab = 'requests' | 'bookings' | 'add-booking' | 'reviews' | 'download';

const TABS: { id: Tab; label: string }[] = [
  { id: 'requests', label: 'الطلبات' },
  { id: 'bookings', label: 'الحجوزات' },
  { id: 'add-booking', label: 'إضافة حجز' },
  { id: 'reviews', label: 'التقييمات' },
  { id: 'download', label: 'تحميل الصورة' },
];

const fullName = (r: BookingRequest) =>
  [r.first_name, r.second_name, r.third_name, r.last_name].filter(Boolean).join(' ');

interface AdminPageProps {
  bookings: Booking[];
  requests: BookingRequest[];
  onRefresh: () => void | Promise<void>;
  onEditBooking: (booking: Booking) => void;
  editingBooking: Booking | null;
  onClearEdit: () => void;
  onLogout: () => void;
}

export default function AdminPage({ bookings, requests, onRefresh, onEditBooking, editingBooking, onClearEdit, onLogout }: AdminPageProps) {
  const [tab, setTab] = useState<Tab>(editingBooking ? 'add-booking' : 'requests');
  const [loading, setLoading] = useState<string | null>(null);
  const { confirm, notify, dialog } = useDialog();

  const pendingRequests = requests.filter(r => r.status === 'pending');

  // Runs an admin action; always refreshes, and tells the admin if it failed.
  const run = async (key: string, action: () => Promise<unknown>) => {
    setLoading(key);
    try {
      await action();
    } catch (err) {
      console.error('Admin action failed', err);
      await notify('تعذّر تنفيذ العملية. حاول مرة أخرى.');
    }
    setLoading(null);
    onRefresh();
  };

  const approveRequest = async (req: BookingRequest) => {
    const clash = bookings.find(b => b.status !== 'cancelled' && b.date === req.date && slotsClash(b.time_slot, req.time_slot));
    if (clash && !(await confirm(`يوجد حجز في نفس الوقت: "${clash.event_name}" (${TIME_SLOT_LABELS[clash.time_slot]}). هل تريد القبول رغم ذلك؟`))) return;
    await createFromRequest(req);
  };

  const createFromRequest = (req: BookingRequest) => run(req.id, async () => {
    await entities.Booking.create({
      date: req.date,
      event_name: req.event_name,
      time_slot: req.time_slot,
      person_name: fullName(req),
      phone: req.phone,
      notes: '',
      status: 'confirmed',
    });
    await entities.BookingRequest.update(req.id, { status: 'approved' });
  });

  const rejectRequest = (req: BookingRequest) => run(req.id + '-reject', () =>
    entities.BookingRequest.update(req.id, { status: 'rejected' }));

  const deleteBooking = async (booking: Booking) => {
    if (!(await confirm(`هل تريد حذف "${booking.event_name}"؟`))) return;
    await run(booking.id + '-delete', () => entities.Booking.delete(booking.id));
  };


  return (
    <div className="animate-fade-in mx-auto max-w-5xl">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-foreground mb-1">لوحة الإدارة</h1>
          <p className="font-body text-muted-foreground text-sm">إدارة الطلبات والحجوزات</p>
        </div>
          <Button variant="ghost" size="sm" onClick={onLogout} className="font-body text-muted-foreground gap-1.5 shrink-0">
            <LogOut size={14} />
            خروج
          </Button>
      </div>

      {/* Tabs */}
      <div className="mb-6 grid grid-cols-6 gap-1 rounded-xl bg-muted p-1 sm:flex sm:w-fit">
        {TABS.map((t, i) => (
          <button
            key={t.id}
            aria-pressed={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-lg px-2 py-2 text-sm font-body font-medium whitespace-nowrap transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${i < 3 ? 'col-span-2' : 'col-span-3'} sm:min-h-0 sm:px-4
              ${tab === t.id ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {t.label}
            {t.id === 'requests' && pendingRequests.length > 0 && (
              <span className="bg-primary text-primary-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                {pendingRequests.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Requests Tab */}
      {tab === 'requests' && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {requests.length === 0 && (
            <div className="text-center py-20 lg:col-span-2">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Inbox size={32} className="text-muted-foreground" />
              </div>
              <p className="font-heading font-semibold text-foreground text-lg mb-1">لا توجد طلبات</p>
              <p className="font-body text-muted-foreground text-sm">لم يتم استلام أي طلبات حجز حتى الآن</p>
            </div>
          )}
          {[...requests]
            .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at))
            .map(req => (
            <div
              key={req.id}
              className="bg-card border border-border/50 rounded-xl p-4 sm:p-5 shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-heading font-bold text-base text-foreground">{req.event_name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-body ${REQ_STATUS[req.status].cls}`}>
                      {REQ_STATUS[req.status].label}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-body text-muted-foreground">
                    <div className="flex items-center gap-1.5"><User size={13} className="text-primary/60" />{fullName(req)}</div>
                    <div className="flex items-center gap-1.5"><Phone size={13} className="text-primary/60" /><span dir="ltr">{req.phone}</span></div>
                    <div className="flex items-center gap-1.5"><CalendarDays size={13} className="text-primary/60" />{formatFullDateStr(req.date)}</div>
                    <div className="flex items-center gap-1.5"><Clock size={13} className="text-primary/60" />{TIME_SLOT_LABELS[req.time_slot]}</div>
                  </div>
                  <p className="text-xs font-body text-muted-foreground">
                    قُدِّم: {format(new Date(req.submitted_at), 'yyyy/MM/dd HH:mm')}
                  </p>
                </div>
                {replyLink(req) && (
                  <Button asChild size="sm" variant="outline" className="gap-1.5 self-start font-body">
                    <a href={replyLink(req)!} target="_blank" rel="noopener noreferrer"><MessageCircle size={14} />رد عبر واتساب</a>
                  </Button>
                )}
                {req.status === 'pending' && (
                  <div className="flex gap-2 sm:flex-col">
                    <Button
                      size="sm"
                      className="gap-1.5 font-body flex-1 sm:flex-none"
                      onClick={() => approveRequest(req)}
                      disabled={loading === req.id}
                    >
                      <Check size={14} />
                      {loading === req.id ? '...' : 'قبول'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 font-body flex-1 sm:flex-none text-destructive border-destructive/30 hover:bg-destructive/5"
                      onClick={() => rejectRequest(req)}
                      disabled={loading === req.id + '-reject'}
                    >
                      <X size={14} />
                      رفض
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Download Tab */}
      {tab === 'download' && (
        <DownloadEventsImage bookings={bookings} onRefresh={onRefresh} />
      )}

      {tab === 'reviews' && <ReviewModeration />}

      {/* Add Booking Tab */}
      {tab === 'add-booking' && (
        <AddBookingPage
          bookings={bookings}
          onBookingAdded={() => { onRefresh(); onClearEdit(); setTab('bookings'); }}
          editingBooking={editingBooking}
          onCancel={() => { onClearEdit(); setTab('bookings'); }}
        />
      )}

      {/* Bookings Tab */}
      {tab === 'bookings' && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {bookings.length > 0 && (
            <div className="flex justify-end lg:col-span-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 font-body"
                onClick={() => {
                  const blob = new Blob([bookingsToCsv(bookings)], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url; a.download = 'حجوزات-آل-سلهب.csv'; a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download size={15} />
                تصدير CSV
              </Button>
            </div>
          )}
          {bookings.length === 0 && (
            <div className="text-center py-20 lg:col-span-2">
              <p className="font-body text-muted-foreground">لا توجد حجوزات</p>
            </div>
          )}
          {[...bookings]
            .sort((a, b) => a.date.localeCompare(b.date))
            .map(booking => (
            <div key={booking.id} className="bg-card border border-border/50 rounded-xl p-4 sm:p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <h3 className="font-heading font-bold text-base text-foreground">{booking.event_name}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-body border border-primary/20">
                      {TIME_SLOT_LABELS[booking.time_slot]}
                    </span>
                    {booking.book_diwan && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 font-body border border-emerald-200 dark:border-emerald-700">
                        🏛️ الديوان
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-body text-muted-foreground">
                    <span>{formatFullDateStr(booking.date)}</span>
                    <span>{booking.person_name}</span>
                    <span dir="ltr">{booking.phone}</span>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-1 border-t border-border/50 pt-2 sm:border-0 sm:pt-0">
                  <EventCardDownload booking={booking} size="sm" />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-10 w-10 text-muted-foreground hover:text-primary md:h-8 md:w-8"
                    onClick={() => { onEditBooking(booking); setTab('add-booking'); }}
                    title="تعديل"
                    aria-label={`تعديل ${booking.event_name}`}
                  >
                    <Pencil size={14} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-10 w-10 text-muted-foreground hover:text-destructive md:h-8 md:w-8"
                    onClick={() => deleteBooking(booking)}
                    title="حذف"
                    aria-label={`حذف ${booking.event_name}`}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {dialog}
    </div>
  );
}