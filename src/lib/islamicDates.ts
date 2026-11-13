// Islamic holidays, worked out from the Umm al-Qura calendar (approximate: the real day depends on the moon).

export type IslamicEventType = 'ramadan_start' | 'eid_fitr' | 'arafah' | 'eid_adha';

export interface IslamicEvent {
  date: string;
  type: IslamicEventType;
  label: string;
  emoji: string;
  days: number;
}

export interface IslamicDay {
  type: IslamicEventType;
  label: string;
  emoji: string;
  dayIndex: number;
  isFirst: boolean;
}

const LABELS: Record<IslamicEventType, Pick<IslamicEvent, 'label' | 'emoji' | 'days'>> = {
  ramadan_start: { label: 'بداية شهر رمضان المبارك (تقريبي)', emoji: '🌙', days: 1 },
  eid_fitr: { label: 'عيد الفطر المبارك', emoji: '🌙', days: 4 },   // 3 days, plus the one before in case the moon is sighted early
  arafah: { label: 'يوم عرفة', emoji: '🕌', days: 1 },
  eid_adha: { label: 'عيد الأضحى المبارك', emoji: '🐑', days: 5 },   // 4 days, plus one for the same reason
};

const hijri = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { month: 'numeric', day: 'numeric' });
const pad = (n: number) => String(n).padStart(2, '0');
const toStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * The holidays of the given years, worked out from the Umm al-Qura calendar the browser knows.
 * Ramadan and Eid al-Fitr start a day earlier than the calendar says, because the real day depends
 * on the moon being sighted; the day before is shown as a possibility.
 */
export function computeIslamicEvents(years: number[]): IslamicEvent[] {
  const events: IslamicEvent[] = [];
  for (const year of years) {
    for (let day = new Date(year, 0, 1, 12); day.getFullYear() === year; day.setDate(day.getDate() + 1)) {
      const parts = hijri.formatToParts(day);
      const month = Number(parts.find(p => p.type === 'month')!.value);
      const dom = Number(parts.find(p => p.type === 'day')!.value);
      const add = (type: IslamicEventType, back = 0) =>
        events.push({ type, ...LABELS[type], date: toStr(new Date(year, day.getMonth(), day.getDate() - back)) });
      if (month === 9 && dom === 1) add('ramadan_start', 1);
      else if (month === 10 && dom === 1) add('eid_fitr', 1);
      else if (month === 12 && dom === 9) add('arafah');
      else if (month === 12 && dom === 10) add('eid_adha');
    }
  }
  return events;
}

/** From last year to four years ahead, so the calendar never runs out of holidays. */
const thisYear = new Date().getFullYear();
export const ISLAMIC_EVENTS: IslamicEvent[] = computeIslamicEvents(Array.from({ length: 6 }, (_, i) => thisYear - 1 + i));

// Build a map: dateStr -> event info (including all days of the event)
export function buildIslamicDateMap() {
  const map: Record<string, IslamicDay[]> = {};

  ISLAMIC_EVENTS.forEach(event => {
    const [year, month, day] = event.date.split('-').map(Number);

    for (let i = 0; i < event.days; i++) {
      const d = new Date(year, month - 1, day + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

      if (!map[dateStr]) map[dateStr] = [];

      let dayLabel = event.label;
      const isFirst = i === 0;

      if (event.type === 'eid_fitr' || event.type === 'eid_adha') {
        if (i === 0) {
          dayLabel = `${event.label} (الاحتمال الأول)`;
        } else if (i === 1) {
          dayLabel = event.label;
        } else if (i === 2) {
          dayLabel = event.type === 'eid_fitr' ? `اليوم الثاني من ${event.emoji} عيد الفطر` : `اليوم الثاني من ${event.emoji} عيد الأضحى`;
        } else if (i === 3) {
          dayLabel = event.type === 'eid_fitr' ? `اليوم الثالث من عيد الفطر` : `اليوم الثالث من عيد الأضحى`;
        } else if (i === 4) {
          dayLabel = `اليوم الرابع من عيد الأضحى`;
        }
      } else if (event.type === 'ramadan_start') {
        dayLabel = event.label;
      } else if (event.type === 'arafah') {
        dayLabel = event.label;
      }

      map[dateStr].push({
        type: event.type,
        label: dayLabel,
        emoji: event.emoji,
        dayIndex: i,
        isFirst,
      });
    }
  });

  return map;
}

export const ISLAMIC_DATE_MAP = buildIslamicDateMap();

export function getIslamicEvents(dateStr: string): IslamicDay[] {
  return ISLAMIC_DATE_MAP[dateStr] || [];
}

export function getIslamicStyle(events: Pick<IslamicDay, 'type'>[]) {
  if (!events.length) return null;
  const types = events.map(e => e.type);
  if (types.includes('eid_adha') || types.includes('eid_fitr')) return 'eid';
  if (types.includes('arafah')) return 'arafah';
  if (types.includes('ramadan_start')) return 'ramadan';
  return null;
}