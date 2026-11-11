import { format } from 'date-fns';
import { getIslamicEvents, getIslamicStyle } from '@/lib/islamicDates';

const STATUS_STYLES = {
  free:      'bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40',
  daytime:   'bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800/50 text-amber-900 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-800/40',
  wedding:   'bg-violet-100 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-800/50 text-violet-900 dark:text-violet-200 hover:bg-violet-200 dark:hover:bg-violet-800/40',
  mixed:     'bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800/50 text-orange-900 dark:text-orange-200 hover:bg-orange-200 dark:hover:bg-orange-800/40',
  full:      'bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800/50 text-red-800 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-800/40',
  // legacy
  morning:   'bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800/50 text-amber-900 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-800/40',
  evening:   'bg-violet-100 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-800/50 text-violet-900 dark:text-violet-200 hover:bg-violet-200 dark:hover:bg-violet-800/40',
};

// Islamic event overlays (ring/border highlight)
const ISLAMIC_RING = {
  eid:     'ring-2 ring-purple-400 dark:ring-purple-500',
  arafah:  'ring-2 ring-teal-400 dark:ring-teal-500',
  ramadan: 'ring-2 ring-indigo-400 dark:ring-indigo-500',
};

const ISLAMIC_EMOJI = {
  eid:     '🌙',
  arafah:  '🕌',
  ramadan: '🌙',
};

export default function DayCell({ day, dateStr, status, isToday, isFriSat, hasBooking, hasConflict, isPast, onClick }) {
  const dayNum = format(day, 'd');
  const islamicEvents = getIslamicEvents(dateStr);
  const islamicStyle = getIslamicStyle(islamicEvents);

  return (
    <button
      onClick={onClick}
      className={`
        relative aspect-square min-h-[2.5rem] sm:min-h-[3rem] rounded-lg transition-all duration-150 cursor-pointer
        flex flex-col items-center justify-center gap-0.5
        ${STATUS_STYLES[status]}
        ${isFriSat && status === 'free' ? 'ring-1 ring-primary/20' : ''}
        ${isToday ? 'ring-2 ring-primary ring-offset-1 ring-offset-background font-bold' : ''}
        ${islamicStyle && !isToday ? ISLAMIC_RING[islamicStyle] : ''}
      `}
      title={islamicEvents.map(e => e.label).join(' | ') || dateStr}
    >
      <span className={`text-xs sm:text-sm font-heading font-semibold leading-none ${isToday ? 'text-primary' : ''}`}>
        {dayNum}
      </span>

      {/* Islamic event emoji */}
      {islamicStyle && (
        <span className="text-[8px] sm:text-[10px] leading-none">
          {ISLAMIC_EMOJI[islamicStyle]}
        </span>
      )}

      {/* Conflict warning */}
      {hasConflict && (
        <span className="absolute top-0.5 left-0.5 text-[9px] sm:text-[11px] leading-none" title="تعارض في الحجز">⚠️</span>
      )}

      {/* Booking dot */}
      {hasBooking && (
        <span className="w-1 h-1 rounded-full bg-current opacity-60" />
      )}
    </button>
  );
}