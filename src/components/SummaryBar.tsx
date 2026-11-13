import { CalendarDays, CheckCircle, Clock } from 'lucide-react';
import { format, parseISO, isAfter, startOfToday } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { Booking } from '@/types';

export default function SummaryBar({ bookings }: { bookings: Booking[] }) {
  const today = startOfToday();

  const upcoming = bookings
    .filter(b => b.status !== 'cancelled' && isAfter(parseISO(b.date), today))
    .sort((a, b) => a.date.localeCompare(b.date));

  const nextEvent = upcoming[0];
  const bookedCount = bookings.filter(b => b.status !== 'cancelled').length;

  const stats = [
    {
      icon: CheckCircle,
      label: 'إجمالي المحجوز',
      value: `${bookedCount} يوم`,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      icon: Clock,
      label: 'المناسبات القادمة',
      value: `${upcoming.length} مناسبة`,
      color: 'text-amber-700 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/30',
    },
    {
      icon: CalendarDays,
      label: 'أقرب مناسبة',
      value: nextEvent
        ? `${nextEvent.event_name} - ${format(parseISO(nextEvent.date), 'd MMMM', { locale: ar })}`
        : 'لا توجد مناسبات قادمة',
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/30',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5 sm:mb-6">
      {stats.map(({ icon: Icon, label, value, color, bg }, i) => (
        <div
          key={label}
          className={`flex items-center gap-3 sm:gap-4 px-3 py-3 sm:px-5 sm:py-4 rounded-xl border border-border/50 ${bg} transition-all ${i === 2 ? 'col-span-2 lg:col-span-1' : ''}`}
        >
          <div className={`p-2 sm:p-2.5 rounded-lg bg-white/60 dark:bg-black/20 shrink-0 ${color}`}>
            <Icon size={20} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground font-body">{label}</p>
            <p className={`text-sm font-heading font-semibold mt-0.5 ${color} leading-tight`}>{value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}