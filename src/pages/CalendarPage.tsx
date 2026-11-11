import SummaryBar from '@/components/SummaryBar';
import CalendarGrid from '@/components/calendar/CalendarGrid';
import type { Booking } from '@/types';

export default function CalendarPage({ bookings }: { bookings: Booking[] }) {
  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-foreground mb-1">تقويم المناسبات</h1>
        <p className="font-body text-muted-foreground text-sm">عرض الأيام المحجوزة والمتاحة للأشهر القادمة</p>
      </div>
      <SummaryBar bookings={bookings} />
      <div className="bg-card border border-border/50 rounded-2xl p-4 sm:p-6 shadow-sm">
        <CalendarGrid bookings={bookings} />
      </div>
    </div>
  );
}