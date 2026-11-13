import { describe, it, expect } from 'vitest';
import {
  ISLAMIC_EVENTS, computeIslamicEvents, buildIslamicDateMap, getIslamicEvents, getIslamicStyle,
} from './islamicDates';

describe('islamicDates', () => {
  it('returns no events for an ordinary day', () => {
    expect(getIslamicEvents('2026-06-10')).toEqual([]);
    expect(getIslamicEvents('')).toEqual([]);
  });

  it('marks the first day of Ramadan', () => {
    const [e] = getIslamicEvents('2026-02-17');
    expect(e).toMatchObject({ type: 'ramadan_start', isFirst: true, dayIndex: 0 });
  });

  it('marks Arafah', () => {
    const [e] = getIslamicEvents('2026-05-26');
    expect(e.type).toBe('arafah');
    expect(e.label).toBe('يوم عرفة');
  });

  it('spans Eid al-Fitr across 4 days with distinct labels', () => {
    const labels = ['2026-03-19', '2026-03-20', '2026-03-21', '2026-03-22']
      .map((d) => getIslamicEvents(d)[0].label);
    expect(labels[0]).toContain('الاحتمال الأول');
    expect(labels[1]).toBe('عيد الفطر المبارك');
    expect(labels[2]).toContain('اليوم الثاني');
    expect(labels[3]).toContain('اليوم الثالث');
    expect(getIslamicEvents('2026-03-23')).toEqual([]);
  });

  it('spans Eid al-Adha across 5 days overlapping Arafah', () => {
    const first = getIslamicEvents('2026-05-27');
    expect(first.map((e) => e.type).sort()).toEqual(['eid_adha']);
    expect(getIslamicEvents('2026-05-28')[0].label).toBe('عيد الأضحى المبارك');
    expect(getIslamicEvents('2026-05-29')[0].label).toContain('اليوم الثاني من');
    expect(getIslamicEvents('2026-05-30')[0].label).toContain('اليوم الثالث');
    expect(getIslamicEvents('2026-05-31')[0].label).toBe('اليوم الرابع من عيد الأضحى');
  });

  it('crosses month boundaries when building ranges', () => {
    const map = buildIslamicDateMap();
    expect(map['2027-05-19']).toBeDefined();
    expect(ISLAMIC_EVENTS.length).toBeGreaterThanOrEqual(8);
  });

  it('picks a display style by priority', () => {
    expect(getIslamicStyle([])).toBeNull();
    expect(getIslamicStyle([{ type: 'eid_adha' }, { type: 'arafah' }])).toBe('eid');
    expect(getIslamicStyle([{ type: 'eid_fitr' }])).toBe('eid');
    expect(getIslamicStyle([{ type: 'arafah' }])).toBe('arafah');
    expect(getIslamicStyle([{ type: 'ramadan_start' }])).toBe('ramadan');
    expect(getIslamicStyle([{ type: 'other' as never }])).toBeNull();
  });
});

describe('computeIslamicEvents', () => {
  it('works out the same days for 2026 as the list this replaced', () => {
    const got = computeIslamicEvents([2026]).map(({ date, type, days }) => ({ date, type, days }));
    expect(got).toEqual([
      { date: '2026-02-17', type: 'ramadan_start', days: 1 },
      { date: '2026-03-19', type: 'eid_fitr', days: 4 },
      { date: '2026-05-26', type: 'arafah', days: 1 },
      { date: '2026-05-27', type: 'eid_adha', days: 5 },
    ]);
  });
  it('finds a Hijri date that falls twice in one year (Ramadan 2030 begins in January and December)', () => {
    expect(computeIslamicEvents([2030]).filter((e) => e.type === 'ramadan_start')).toHaveLength(2);
  });
  it('covers last year and the next four, so no hand updating is needed', () => {
    const years = new Set(ISLAMIC_EVENTS.map((e) => e.date.slice(0, 4)));
    const now = new Date().getFullYear();
    for (let y = now - 1; y <= now + 4; y++) expect(years.has(String(y))).toBe(true);
  });
});
