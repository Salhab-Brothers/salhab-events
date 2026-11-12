import { useState, useMemo } from 'react';
import {
  startOfMonth, endOfMonth, eachDayOfInterval, format,
  startOfToday, isSameDay, getDay, isBefore
} from 'date-fns';
import { formatMonthYear } from '@/lib/levantineMonths';
import DayCell, { type SlotStatus } from './DayCell';
import DayDetailModal, { type SelectedDay } from './DayDetailModal';
import { normalizeSlot } from '@/lib/data';
import type { Booking } from '@/types';
import { getIslamicEvents } from '@/lib/islamicDates';

// Week starts on Saturday: Sat=6, Sun=0, Mon=1, Tue=2, Wed=3, Thu=4, Fri=5
const WEEKDAY_LABELS = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

// Map JS getDay() (0=Sun..6=Sat) to column index when week starts Saturday
// Sat=6 → col 0, Sun=0 → col 1, Mon=1 → col 2, Tue=2 → col 3, Wed=3 → col 4, Thu=4 → col 5, Fri=5 → col 6
const DAY_TO_COL: Record<number, number> = { 6: 0, 0: 1, 1: 2, 2: 3, 3: 4, 4: 5, 5: 6 };

// Weekend highlight: Fri (5) and Sat (6)
const IS_WEEKEND_DOW = (dow: number) => dow === 5 || dow === 6;

export default function CalendarGrid({ bookings }: { bookings: Booking[] }) {
  const today = startOfToday();
  const [selectedDay, setSelectedDay] = useState<SelectedDay | null>(null);

  // Build a map of date -> bookings for fast lookup
  const bookingMap = useMemo(() => {
    const map: Record<string, Booking[]> = {};
    bookings.forEach(b => {
      if (b.status === 'cancelled') return;
      if (!map[b.date]) map[b.date] = [];
      map[b.date].push(b);
    });
    return map;
  }, [bookings]);

  const currentMonthStr = format(today, "yyyy-MM");

  // Collect all months from current month onward that have at least one future (non-cancelled) booking
  const monthsWithEvents = useMemo(() => {
    const monthSet = new Set<string>();
    // Always include current month
    monthSet.add(currentMonthStr);
    bookings.forEach(b => {
      if (b.status !== 'cancelled' && b.date.slice(0, 7) >= currentMonthStr) {
        monthSet.add(b.date.slice(0, 7));
      }
    });
    return Array.from(monthSet)
      .sort()
      .map(ym => new Date(ym + '-01'));
  }, [bookings, currentMonthStr]);

  // A date has a conflict if there are overlapping bookings:
  // - any "full" day + anything else, or two same slots

  const conflictDates = useMemo(() => {
    const set = new Set<string>();
    Object.entries(bookingMap).forEach(([dateStr, dayBookings]) => {
      if (dayBookings.length < 2) return;
      const hasFull = dayBookings.some(b => normalizeSlot(b.time_slot) === 'full');
      if (hasFull) { set.add(dateStr); return; }
      // Count each normalized slot - only same-slot conflicts matter
      const slotCounts: Record<string, number> = {};
      dayBookings.forEach(b => {
        const s = normalizeSlot(b.time_slot);
        slotCounts[s] = (slotCounts[s] || 0) + 1;
      });
      if (Object.values(slotCounts).some(c => c > 1)) set.add(dateStr);
    });
    return set;
  }, [bookingMap]);

  // Returns the "dominant" visual status for the day cell color
  const getSlotStatus = (dateStr: string): SlotStatus => {
    const dayBookings = bookingMap[dateStr] || [];
    if (!dayBookings.length) return 'free';
    const slots = dayBookings.map(b => normalizeSlot(b.time_slot));
    if (slots.includes('full')) return 'full';
    const hasLunch = slots.includes('lunch');
    const hasAfternoon = slots.includes('afternoon');
    const hasWedding = slots.includes('wedding');
    // All three daytime slots booked → show as full
    if (hasLunch && hasAfternoon && hasWedding) return 'full';
    // Wedding only or wedding + others
    if (hasWedding && !hasLunch && !hasAfternoon) return 'wedding';
    // Only lunch and/or afternoon remain (plus possibly a wedding)
    return hasWedding ? 'mixed' : 'daytime';
  };

  const handleDayClick = (day: Date, dateStr: string) => {
    const dayBookings = bookingMap[dateStr] || [];
    const dayOfWeek = getDay(day);
    const islamicEvents = getIslamicEvents(dateStr);
    setSelectedDay({ day, bookings: dayBookings, dayOfWeek, islamicEvents });
  };

  return (
    <div>
      {/* Legend */}
      <div className="sticky top-16 z-10 bg-background/95 backdrop-blur-sm py-2 mb-3 -mx-1 px-1">
        <div className="flex flex-wrap gap-3 text-xs font-body">
          {[
            { label: 'حر',              cls: 'bg-emerald-100 border border-emerald-200' },
            { label: 'ظهراً / عصراً',   cls: 'bg-amber-100 border border-amber-200' },
            { label: 'ظهراً + مساءً',   cls: 'bg-orange-100 border border-orange-200' },
            { label: 'مساءً',           cls: 'bg-violet-100 border border-violet-200' },
            { label: 'اليوم كاملاً',    cls: 'bg-red-100 border border-red-200' },
          ].map(({ label, cls }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className={`w-4 h-4 rounded ${cls}`} />
              <span className="text-muted-foreground">{label}</span>
            </div>
          ))}
          <div className="w-full border-t border-border/30 my-1" />
          {[
            { label: 'رمضان (تقريبي)', emoji: '🌙', ring: 'ring-2 ring-indigo-400' },
            { label: 'عيد الفطر / الأضحى', emoji: '🌙', ring: 'ring-2 ring-purple-400' },
            { label: 'يوم عرفة', emoji: '🕌', ring: 'ring-2 ring-teal-400' },
          ].map(({ label, emoji, ring }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className={`w-4 h-4 rounded bg-background border border-border ${ring}`} />
              <span className="text-muted-foreground">{emoji} {label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* All months with events */}
      <div className="space-y-10">
        {monthsWithEvents.map(month => {
          const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) });
          const firstCol = DAY_TO_COL[getDay(days[0])];
          const emptyCells = Array.from({ length: firstCol });

          return (
            <div key={format(month, 'yyyy-MM')}>
              <h3 className="font-heading font-bold text-lg text-foreground mb-3 text-center">
                {formatMonthYear(month)}
              </h3>
              {/* Weekday headers - starts Saturday */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {WEEKDAY_LABELS.map((label, i) => (
                  <div
                    key={label}
                    className={`text-center text-xs font-body font-semibold py-1.5 rounded
                      ${i === 0 || i === 6 ? 'text-primary font-bold' : 'text-muted-foreground'}`}
                  >
                    {label}
                  </div>
                ))}
              </div>
              {/* Day cells */}
              <div className="grid grid-cols-7 gap-1">
                {emptyCells.map((_, i) => <div key={`empty-${i}`} />)}
                {days.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const status = getSlotStatus(dateStr);
                  const isToday = isSameDay(day, today);
                  const isPast = isBefore(day, today) && !isToday;
                  const dayOfWeek = getDay(day);
                  const isFriSat = IS_WEEKEND_DOW(dayOfWeek);
                  const hasBooking = !isPast && (bookingMap[dateStr] || []).length > 0;
                  const hasConflict = !isPast && conflictDates.has(dateStr);

                  return (
                    <DayCell
                      key={dateStr}
                      day={day}
                      dateStr={dateStr}
                      status={isPast ? 'free' : status}
                      isToday={isToday}
                      isFriSat={isFriSat}
                      hasBooking={hasBooking}
                      hasConflict={hasConflict}
                      onClick={isPast ? undefined : () => handleDayClick(day, dateStr)}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail modal */}
      {selectedDay && (
        <DayDetailModal
          {...selectedDay}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </div>
  );
}