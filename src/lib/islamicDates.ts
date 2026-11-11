// Islamic dates for 2026 (approximate, based on astronomical calculations)
// All dates are the EARLIEST possible (first probability day)

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

export const ISLAMIC_EVENTS_2026: IslamicEvent[] = [
  {
    date: '2026-02-17', // Ramadan 1447 starts ~Feb 17 or 18
    type: 'ramadan_start',
    label: 'بداية شهر رمضان المبارك (تقريبي)',
    emoji: '🌙',
    days: 1, // just show one day
  },
  {
    date: '2026-03-19', // Eid al-Fitr 1447: ~Mar 19 or 20
    type: 'eid_fitr',
    label: 'عيد الفطر المبارك',
    emoji: '🌙',
    days: 4, // 3 days + احتمال
  },
  {
    date: '2026-05-26', // Arafah (9 Dhul Hijjah): ~May 26
    type: 'arafah',
    label: 'يوم عرفة',
    emoji: '🕌',
    days: 1,
  },
  {
    date: '2026-05-27', // Eid al-Adha 1447: ~May 27 or 28
    type: 'eid_adha',
    label: 'عيد الأضحى المبارك',
    emoji: '🐑',
    days: 5, // 4 days + احتمال
  },
  // 2027 dates (approx)
  {
    date: '2027-02-06',
    type: 'ramadan_start',
    label: 'بداية شهر رمضان المبارك (تقريبي)',
    emoji: '🌙',
    days: 1,
  },
  {
    date: '2027-03-08',
    type: 'eid_fitr',
    label: 'عيد الفطر المبارك',
    emoji: '🌙',
    days: 4,
  },
  {
    date: '2027-05-15',
    type: 'arafah',
    label: 'يوم عرفة',
    emoji: '🕌',
    days: 1,
  },
  {
    date: '2027-05-16',
    type: 'eid_adha',
    label: 'عيد الأضحى المبارك',
    emoji: '🐑',
    days: 5,
  },
];

// Build a map: dateStr -> event info (including all days of the event)
export function buildIslamicDateMap() {
  const map: Record<string, IslamicDay[]> = {};

  ISLAMIC_EVENTS_2026.forEach(event => {
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