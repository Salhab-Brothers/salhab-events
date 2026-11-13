import { CalendarCheck, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatFullDateStr } from '@/lib/levantineMonths';
import { freeSlots, isSlotFree, nextFreeDays, nextFreeWeekend } from '@/lib/availability';
import { TIME_SLOT_LABELS, type CanonicalSlot } from '@/lib/data';
import type { Booking } from '@/types';

const chip = 'h-auto min-h-9 whitespace-normal py-1.5 font-body text-xs';

/** Under the date and time of a request: says whether the choice is free and offers a way out when it is not. */
export default function AvailabilityHint({ bookings, date, slot, today, onPick }: {
  bookings: Booking[];
  date: string;
  slot: CanonicalSlot;
  today: Date;
  onPick: (change: { date?: string; slot?: CanonicalSlot }) => void;
}) {
  if (!date) {
    const next = nextFreeWeekend(bookings, today);
    if (!next) return null;
    return (
      <Button type="button" variant="outline" className={`${chip} gap-1.5`} onClick={() => onPick({ date: next })}>
        <CalendarCheck size={14} />
        أقرب جمعة أو سبت متاح: {formatFullDateStr(next)}
      </Button>
    );
  }
  if (isSlotFree(bookings, date, slot)) {
    return <p role="status" className="font-body text-sm text-emerald-700 dark:text-emerald-400">✓ هذا الموعد متاح</p>;
  }
  const slots = freeSlots(bookings, date);
  const days = slots.length ? [] : nextFreeDays(bookings, date, 3);
  return (
    <div role="status" className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-3 font-body text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
      <p className="flex items-start gap-2"><TriangleAlert size={16} className="mt-0.5 shrink-0" />
        هذا الوقت محجوز في هذا اليوم. يمكنك إرسال الطلب وستراجعه الإدارة، أو اختيار موعد آخر.</p>
      {slots.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span>متاح في نفس اليوم:</span>
          {slots.map(s => <Button key={s.value} type="button" size="sm" variant="outline" className={chip} onClick={() => onPick({ slot: s.value })}>{TIME_SLOT_LABELS[s.value]}</Button>)}
        </div>
      )}
      {days.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span>أقرب أيام متاحة:</span>
          {days.map(d => <Button key={d} type="button" size="sm" variant="outline" className={chip} onClick={() => onPick({ date: d })}>{formatFullDateStr(d)}</Button>)}
        </div>
      )}
    </div>
  );
}
