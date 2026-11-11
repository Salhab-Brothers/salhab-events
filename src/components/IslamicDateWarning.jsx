import { getIslamicEvents } from '@/lib/islamicDates';

const TYPE_STYLE = {
  eid_fitr:     { bg: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-700', text: 'text-purple-800 dark:text-purple-200' },
  eid_adha:     { bg: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-700', text: 'text-purple-800 dark:text-purple-200' },
  arafah:       { bg: 'bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-700', text: 'text-teal-800 dark:text-teal-200' },
  ramadan_start:{ bg: 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-700', text: 'text-indigo-800 dark:text-indigo-200' },
};

export default function IslamicDateWarning({ dateStr }) {
  if (!dateStr) return null;
  const events = getIslamicEvents(dateStr);
  if (!events.length) return null;

  const style = TYPE_STYLE[events[0].type] || TYPE_STYLE.ramadan_start;

  return (
    <div className={`flex items-start gap-2.5 rounded-xl border p-3 ${style.bg}`}>
      <span className="text-lg leading-none mt-0.5">{events[0].emoji}</span>
      <div className={`text-sm font-body ${style.text}`}>
        <p className="font-semibold">تنبيه: هذا اليوم مناسبة إسلامية</p>
        <ul className="mt-0.5 space-y-0.5">
          {events.map((ev, i) => (
            <li key={i} className="opacity-90">— {ev.label}</li>
          ))}
        </ul>
        <p className="mt-1 text-xs opacity-70">يمكنك المتابعة والحجز في هذا اليوم</p>
      </div>
    </div>
  );
}