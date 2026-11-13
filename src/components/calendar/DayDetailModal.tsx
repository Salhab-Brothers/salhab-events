import { useEffect, useId, useRef } from 'react';
import { formatFullDate } from '@/lib/levantineMonths';
import { X, Clock, User, Send } from 'lucide-react';
import { format, isBefore, startOfDay } from 'date-fns';
import { Button } from '@/components/ui/button';
import { TIME_SLOT_LABELS } from '@/lib/data';
import EventCardDownload from '@/components/EventCardDownload';
import AddToCalendar from '@/components/AddToCalendar';
import type { IslamicDay, IslamicEventType } from '@/lib/islamicDates';
import type { Booking } from '@/types';

const ISLAMIC_TYPE_STYLE: Record<IslamicEventType, string> = {
  eid_fitr:     'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-200',
  eid_adha:     'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-200',
  arafah:       'bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200',
  ramadan_start:'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-200',
};

export interface SelectedDay {
  day: Date;
  bookings: Booking[];
  dayOfWeek: number;
  islamicEvents: IslamicDay[];
}

export default function DayDetailModal({ day, bookings, dayOfWeek, islamicEvents, onClose }: SelectedDay & { onClose: () => void }) {
  const isFriSat = dayOfWeek === 5 || dayOfWeek === 6;
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  // A native modal dialog: focus moves in and stays in, Escape closes it, the page behind is inert.
  // When it goes away, focus returns to the day that opened it.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    ref.current?.showModal();
    return () => opener?.focus?.();
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={e => { e.preventDefault(); onClose(); }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}   // only the dimmed backdrop, not the card
      className="m-0 mt-auto max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-black/40 backdrop:backdrop-blur-sm sm:m-auto sm:max-w-md"
    >
      <div className="flex max-h-[90dvh] w-full flex-col rounded-t-2xl border border-border bg-card text-foreground shadow-2xl animate-fade-in sm:rounded-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3 sm:px-6 sm:py-4">
          <div>
            <p id={titleId} className={`font-heading font-bold text-lg ${isFriSat ? 'text-primary' : 'text-foreground'}`}>
              {formatFullDate(day)}
            </p>
            {isFriSat && (
              <span className="text-xs text-primary/70 font-body">يوم مفضل للمناسبات</span>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="إغلاق" className="rounded-full">
            <X size={18} />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4 sm:px-6">

          {/* Islamic Events */}
          {islamicEvents.map((ev, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 rounded-xl p-3 border ${ISLAMIC_TYPE_STYLE[ev.type]}`}
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
              {!isBefore(day, startOfDay(new Date())) && (
                <Button asChild className="mt-4 gap-2 font-body">
                  <a href={`#/request?date=${format(day, 'yyyy-MM-dd')}`}><Send size={14} />اطلب هذا اليوم</a>
                </Button>
              )}
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
                  <div className="flex shrink-0 gap-1.5">
                    <AddToCalendar booking={booking} />
                    <EventCardDownload booking={booking} size="sm" />
                  </div>
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

        <div className="shrink-0 border-t border-border px-5 py-3 sm:px-6">
          <Button onClick={onClose} className="w-full font-body" variant="outline">إغلاق</Button>
        </div>
      </div>
    </dialog>
  );
}