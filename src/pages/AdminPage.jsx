import { useState } from 'react';
import { format } from 'date-fns';
import { formatFullDateStr } from '@/lib/levantineMonths';
import { Check, X, Trash2, Pencil, CalendarDays, Phone, User, Clock, Inbox, LogOut, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { entities } from '@/api/api';
import { TIME_SLOT_LABELS } from '@/lib/data';
import AddBookingPage from './AddBookingPage';
import DownloadEventsImage from '@/components/DownloadEventsImage';
import EventCardDownload from '@/components/EventCardDownload';

const REQ_STATUS = {
  pending: { label: 'بانتظار المراجعة', cls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
  approved: { label: 'مقبول', cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
  rejected: { label: 'مرفوض', cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' },
};

export default function AdminPage({ bookings, requests, onRefresh, onEditBooking, editingBooking, onClearEdit, onLogout }) {
  const [tab, setTab] = useState(editingBooking ? 'add-booking' : 'requests');
  const [loading, setLoading] = useState(null);

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const allRequests = requests;

  const approveRequest = async (req) => {
    setLoading(req.id);
    // Create booking from request
    await entities.Booking.create({
      date: req.date,
      event_name: req.event_name,
      time_slot: req.time_slot,
      person_name: `${req.first_name} ${req.second_name || ''} ${req.third_name || ''} ${req.last_name}`.trim(),
      phone: req.phone,
      notes: '',
      status: 'confirmed',
    });
    await entities.BookingRequest.update(req.id, { status: 'approved' });
    setLoading(null);
    onRefresh();
  };

  const rejectRequest = async (req) => {
    setLoading(req.id + '-reject');
    await entities.BookingRequest.update(req.id, { status: 'rejected' });
    setLoading(null);
    onRefresh();
  };

  const deleteBooking = async (booking) => {
    if (!confirm(`هل تريد حذف "${booking.event_name}"؟`)) return;
    try {
      await entities.Booking.delete(booking.id);
    } catch (err) {
      // 404 = already deleted, remove from UI silently
      const msg = err?.message || '';
      if (msg.includes('404') || msg.includes('not found') || msg.toLowerCase().includes('not found')) {
        alert('تم حذف الحجز مسبقاً أو لم يُعثر عليه');
      }
    }
    onRefresh();
  };

  const fullName = (r) => [r.first_name, r.second_name, r.third_name, r.last_name].filter(Boolean).join(' ');

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-foreground mb-1">لوحة الإدارة</h1>
          <p className="font-body text-muted-foreground text-sm">إدارة الطلبات والحجوزات</p>
        </div>
        {onLogout && (
          <Button variant="ghost" size="sm" onClick={onLogout} className="font-body text-muted-foreground gap-1.5 shrink-0">
            <LogOut size={14} />
            خروج
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted p-1 rounded-xl mb-6 w-fit flex-wrap">
        {[
          { id: 'requests', label: `الطلبات`, badge: pendingRequests.length },
          { id: 'bookings', label: 'الحجوزات' },
          { id: 'add-booking', label: 'إضافة حجز' },
          { id: 'download', label: 'تحميل الصورة' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-body font-medium transition-all
              ${tab === t.id ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {t.label}
            {t.badge > 0 && (
              <span className="bg-primary text-primary-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Requests Tab */}
      {tab === 'requests' && (
        <div className="space-y-3">
          {allRequests.length === 0 && (
            <div className="text-center py-20">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Inbox size={32} className="text-muted-foreground" />
              </div>
              <p className="font-heading font-semibold text-foreground text-lg mb-1">لا توجد طلبات</p>
              <p className="font-body text-muted-foreground text-sm">لم يتم استلام أي طلبات حجز حتى الآن</p>
            </div>
          )}
          {allRequests
            .sort((a, b) => (b.submitted_at || '').localeCompare(a.submitted_at || ''))
            .map(req => (
            <div
              key={req.id}
              className="bg-card border border-border/50 rounded-xl p-4 sm:p-5 shadow-sm"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-heading font-bold text-base text-foreground">{req.event_name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-body ${REQ_STATUS[req.status]?.cls}`}>
                      {REQ_STATUS[req.status]?.label}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-body text-muted-foreground">
                    <div className="flex items-center gap-1.5"><User size={13} className="text-primary/60" />{fullName(req)}</div>
                    <div className="flex items-center gap-1.5"><Phone size={13} className="text-primary/60" /><span dir="ltr">{req.phone}</span></div>
                    <div className="flex items-center gap-1.5"><CalendarDays size={13} className="text-primary/60" />{req.date && formatFullDateStr(req.date)}</div>
                    <div className="flex items-center gap-1.5"><Clock size={13} className="text-primary/60" />{TIME_SLOT_LABELS[req.time_slot]}</div>
                  </div>
                  {req.submitted_at && (
                    <p className="text-xs font-body text-muted-foreground/60">
                      قُدِّم: {format(new Date(req.submitted_at), 'yyyy/MM/dd HH:mm')}
                    </p>
                  )}
                </div>
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

      {/* Add Booking Tab */}
      {tab === 'add-booking' && (
        <AddBookingPage
          bookings={bookings}
          onBookingAdded={() => { onRefresh(); onClearEdit && onClearEdit(); setTab('bookings'); }}
          editingBooking={editingBooking}
          onCancel={() => { onClearEdit && onClearEdit(); setTab('bookings'); }}
        />
      )}

      {/* Bookings Tab */}
      {tab === 'bookings' && (
        <div className="space-y-3">
          {bookings.length > 0 && (
            <div className="flex justify-end mb-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 font-body"
                onClick={() => {
                  const rows = [
                    ['التاريخ', 'المناسبة', 'الوقت', 'المسؤول', 'الهاتف', 'الحالة', 'الديوان', 'ملاحظات'],
                    ...bookings.sort((a,b) => a.date.localeCompare(b.date)).map(b => [
                      b.date, b.event_name, TIME_SLOT_LABELS[b.time_slot],
                      b.person_name, b.phone, b.status,
                      b.book_diwan ? 'نعم' : 'لا', b.notes || '',
                    ])
                  ];
                  const csv = rows.map(r => r.join(',')).join('\n');
                  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
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
            <div className="text-center py-20">
              <p className="font-body text-muted-foreground">لا توجد حجوزات</p>
            </div>
          )}
          {bookings
            .sort((a, b) => a.date.localeCompare(b.date))
            .map(booking => (
            <div key={booking.id} className="bg-card border border-border/50 rounded-xl p-4 sm:p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
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
                    <span>{booking.date && formatFullDateStr(booking.date)}</span>
                    <span>{booking.person_name}</span>
                    <span dir="ltr">{booking.phone}</span>
                  </div>
                </div>
                <div className="flex gap-1 items-center">
                  <EventCardDownload booking={booking} size="sm" />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                    onClick={() => { onEditBooking(booking); setTab('add-booking'); }}
                    title="تعديل"
                  >
                    <Pencil size={14} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteBooking(booking)}
                    title="حذف"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}