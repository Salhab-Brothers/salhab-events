import { formatFullDate } from '@/lib/levantineMonths';
import { X, Clock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TIME_SLOT_LABELS } from '@/lib/data';
import EventCardDownload from '@/components/EventCardDownload';

const ISLAMIC_TYPE_STYLE = {
  eid_fitr:     'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-200',
  eid_adha:     'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-200',
  arafah:       'bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200',
  ramadan_start:'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-200',
};

export default function DayDetailModal({ day, dateStr, bookings, dayOfWeek, islamicEvents = [], onClose }) {
  const isFriSat = dayOfWeek === 5 || dayOfWeek === 6;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <p className={`font-heading font-bold text-lg ${isFriSat ? 'text-primary' : 'text-foreground'}`}>
              {formatFullDate(day)}
            </p>
            {isFriSat && (
              <span className="text-xs text-primary/70 font-body">يوم مفضل للمناسبات</span>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X size={18} />
          </Button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-3 max-h-[60vh] overflow-y-auto">

          {/* Islamic Events */}
          {islamicEvents.map((ev, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 rounded-xl p-3 border ${ISLAMIC_TYPE_STYLE[ev.type] || 'bg-muted border-border text-foreground'}`}
            >
              <span className="text-xl leading-none">{ev.emoji}</span>
              <p className="font-body font-semibold text-sm leading-tight">{ev.label}</p>
            </div>
          ))}

          {/* Bookings */}
          {bookings.length === 0 && islamicEvents.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">✓</span>
              </div>
              <p className="font-body text-muted-foreground">هذا اليوم متاح للحجز</p>
            </div>
          ) : bookings.length === 0 && islamicEvents.length > 0 ? (
            <div className="text-center py-4">
              <p className="font-body text-muted-foreground text-sm">لا توجد حجوزات في هذا اليوم</p>
            </div>
          ) : (
            bookings.map((booking, i) => (
              <div key={i} className="bg-secondary/50 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-heading font-bold text-foreground text-base">{booking.event_name}</p>
                  <EventCardDownload booking={booking} size="sm" />
                </div>
                <div className="space-y-1.5 text-sm font-body text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-primary/70 shrink-0" />
                    <span>{TIME_SLOT_LABELS[booking.time_slot]}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-primary/70 shrink-0" />
                    <span>{booking.person_name}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-6 py-3 border-t border-border">
          <Button onClick={onClose} className="w-full font-body" variant="outline">إغلاق</Button>
        </div>
      </div>
    </div>
  );
}