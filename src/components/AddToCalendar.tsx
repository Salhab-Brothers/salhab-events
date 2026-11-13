import { CalendarPlus } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { eventToIcs } from '@/lib/ics';
import type { Booking } from '@/types';

/** Downloads a calendar file that the phone's calendar app opens. */
export default function AddToCalendar({ booking, size = 'sm' }: { booking: Booking; size?: ButtonProps['size'] }) {
  const save = () => {
    const url = URL.createObjectURL(new Blob([eventToIcs(booking)], { type: 'text/calendar;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${booking.date}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <Button size={size} variant="outline" onClick={save} className="gap-1.5 font-body shrink-0" title="إضافة إلى التقويم">
      <CalendarPlus size={14} />
      تقويمي
    </Button>
  );
}
