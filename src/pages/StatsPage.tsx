// Stryker disable StringLiteral: the strings here are CSS classes and wording, which the screenshot and browser tests cover
import { useMemo, type ReactNode } from 'react';
import { parseISO, isAfter, startOfToday } from 'date-fns';
import { LEVANTINE_MONTHS } from '@/lib/levantineMonths';
import { BarChart, PieChart } from '@/components/charts';
import { CalendarDays, TrendingUp, Clock, CheckCircle, CalendarCheck, Flame } from 'lucide-react';
import { normalizeSlot, type CanonicalSlot } from '@/lib/data';
import { busiestMonth, eventTypeCounts, shortMonth, weekendAvailability } from '@/lib/stats';
import type { Booking } from '@/types';

const PRIMARY = 'hsl(var(--primary))';
const FREE = 'hsl(var(--muted-foreground) / 0.3)';
const DIM = 'hsl(var(--muted-foreground) / 0.4)';
const SLOT_COLORS: Record<CanonicalSlot, string> = { lunch: '#f59e0b', afternoon: '#3b82f6', wedding: '#7c3aed', full: '#ef4444' };
const SLOT_LABELS: Record<CanonicalSlot, string> = { lunch: 'غداء ظهراً', afternoon: 'خطبة / طلبة عصراً', wedding: 'حفل زفاف مساءاً', full: 'اليوم كاملاً' };
const DAY_NAMES = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

const monthKey = (date: string) => {
  const d = parseISO(date);
  return `${LEVANTINE_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

/**
 * Charts are visual only, so screen readers skip them and read `summary` as a list instead.
 */
function ChartFrame({ summary, children }: { summary: string[]; children: ReactNode }) {
  return (
    <>
      <div aria-hidden="true">{children}</div>
      {summary.length > 0 && <ul className="sr-only">{summary.map(line => <li key={line}>{line}</li>)}</ul>}
    </>
  );
}

export default function StatsPage({ bookings }: { bookings: Booking[] }) {
  const active = useMemo(() => bookings.filter(b => b.status !== 'cancelled'), [bookings]);
  const today = startOfToday();

  const upcoming = active.filter(b => isAfter(parseISO(b.date), today)).length;
  const past = active.length - upcoming;

  // Bookings per month, in calendar order (yyyy-MM sorts the same way)
  const monthlyData = useMemo(() => {
    const counts: Record<string, number> = {};
    active.forEach(b => { const key = b.date.slice(0, 7); counts[key] = (counts[key] || 0) + 1; });
    return Object.keys(counts).sort().map(key => ({ month: monthKey(`${key}-01`), count: counts[key] }));
  }, [active]);

  // Slot distribution, most popular first
  const slotData = useMemo(() => {
    const counts: Record<CanonicalSlot, number> = { lunch: 0, afternoon: 0, wedding: 0, full: 0 };
    active.forEach(b => { counts[normalizeSlot(b.time_slot)]++; });
    return (Object.keys(counts) as CanonicalSlot[])
      .filter(slot => counts[slot] > 0)
      .map(slot => ({ name: SLOT_LABELS[slot], value: counts[slot], slot }))
      .sort((a, b) => b.value - a.value);
  }, [active]);

  // Bookings per weekday
  const dayData = useMemo(() => {
    const counts = Array<number>(7).fill(0);
    active.forEach(b => { counts[parseISO(b.date).getDay()]++; });
    return DAY_NAMES.map((name, i) => ({ name, count: counts[i] }));
  }, [active]);

  // Fridays and Saturdays still free or booked in the coming months, and the kinds of event held.
  const weekendData = useMemo(() => weekendAvailability(active, today), [active, today]);
  const typeData = useMemo(() => eventTypeCounts(active), [active]);
  const freeWeekendDays = weekendData.slice(0, 3).reduce((sum, m) => sum + m.free, 0);
  const busiest = useMemo(() => busiestMonth(active), [active]);

  const statCards = [
    { icon: CalendarDays, label: 'إجمالي الحجوزات', value: active.length, color: 'text-primary', bg: 'bg-primary/10' },
    { icon: TrendingUp, label: 'المناسبات القادمة', value: upcoming, color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30' },
    { icon: CheckCircle, label: 'المناسبات المنتهية', value: past, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
    { icon: Clock, label: 'الوقت الأكثر حجزاً', value: slotData.length ? slotData[0].name : '-', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30' },
    { icon: CalendarCheck, label: 'جمعات وسبوت متاحة خلال 3 أشهر', value: freeWeekendDays, color: 'text-teal-700 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-950/30' },
    { icon: Flame, label: 'أكثر شهر ازدحاماً', value: busiest ? busiest.month : '-', color: 'text-rose-700 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/30' },
  ];

  // Stryker disable BooleanLiteral,ObjectLiteral,ArrayDeclaration,UnaryOperator: chart settings and look, which jsdom cannot show (the screenshots do)
  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-foreground mb-1">الإحصائيات</h1>
        <p className="font-body text-muted-foreground text-sm">نظرة عامة على حجوزات قاعة آل سلهب</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-3 mb-8 min-[22rem]:grid-cols-2 sm:grid-cols-3">
        {statCards.map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className={`flex min-w-0 items-center gap-3 p-4 rounded-xl border border-border/50 ${bg} shadow-sm`}>
            <div className={`p-2 rounded-lg bg-white/60 dark:bg-black/20 ${color}`}>
              <Icon size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-body text-muted-foreground leading-tight">{label}</p>
              <p className={`font-heading font-bold text-lg leading-tight break-words ${color}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly chart */}
        <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
          <h2 className="font-heading font-bold text-base text-foreground mb-4">الحجوزات حسب الشهر</h2>
          {monthlyData.length === 0 ? (
            <p className="text-sm font-body text-muted-foreground text-center py-10">لا توجد بيانات</p>
          ) : (
            <ChartFrame summary={monthlyData.map(d => `${d.month}: ${d.count}`)}>
            <BarChart data={monthlyData.map(d => ({ label: d.month, segments: [{ value: d.count, color: PRIMARY, title: `${d.count} حجز` }] }))} />
            </ChartFrame>
          )}
        </div>

        {/* Slot pie */}
        <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
          <h2 className="font-heading font-bold text-base text-foreground mb-4">توزيع أوقات الحجز</h2>
          {active.length === 0 ? (
            <p className="text-sm font-body text-muted-foreground text-center py-10">لا توجد بيانات</p>
          ) : (
            <>
              <ChartFrame summary={[]}>
              <PieChart slices={slotData.map(s => ({ value: s.value, color: SLOT_COLORS[s.slot], title: `${s.name}: ${s.value}` }))} />
              </ChartFrame>
              {/* External legend */}
              <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 mt-3">
                {slotData.map((entry) => {
                  const total = slotData.reduce((s, e) => s + e.value, 0);
                  const pct = ((entry.value / total) * 100).toFixed(0);
                  return (
                    <div key={entry.slot} className="flex items-center gap-1.5 font-body text-sm text-foreground">
                      <span style={{ background: SLOT_COLORS[entry.slot] }} className="inline-block w-3 h-3 rounded-sm shrink-0" />
                      <span>{entry.name}</span>
                      <span className="text-muted-foreground">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Weekends: the days families want most */}
        <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
          <h2 className="font-heading font-bold text-base text-foreground mb-1">الجمعات والسبوت القادمة</h2>
          <p className="text-sm font-body text-muted-foreground mb-4">كم منها محجوز وكم ما زال متاحاً، شهراً بشهر</p>
          <ChartFrame summary={weekendData.map(d => `${d.month}: ${d.booked} محجوز، ${d.free} متاح`)}>
          <BarChart allLabels format={shortMonth} data={weekendData.map(d => ({ label: d.month, segments: [
              { value: d.booked, color: PRIMARY, title: `${d.booked} محجوز` },
              { value: d.free, color: FREE, title: `${d.free} متاح` },
            ] }))} />
          </ChartFrame>
          <div className="flex justify-center gap-5 mt-3 font-body text-sm text-foreground">
            <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-primary" />محجوز</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-muted-foreground/30" />متاح</span>
          </div>
        </div>

        {/* Kinds of event */}
        <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
          <h2 className="font-heading font-bold text-base text-foreground mb-4">أنواع المناسبات</h2>
          {typeData.length === 0 ? (
            <p className="text-sm font-body text-muted-foreground text-center py-10">لا توجد بيانات</p>
          ) : (
            <ChartFrame summary={typeData.map(d => `${d.type}: ${d.count}`)}>
            <BarChart data={typeData.map(d => ({ label: d.type, segments: [{ value: d.count, color: PRIMARY, title: `${d.count} مناسبة` }] }))} />
            </ChartFrame>
          )}
        </div>

        {/* Day of week */}
        <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm lg:col-span-2">
          <h2 className="font-heading font-bold text-base text-foreground mb-4">الحجوزات حسب يوم الأسبوع</h2>
          {active.length === 0 ? (
            <p className="text-sm font-body text-muted-foreground text-center py-10">لا توجد بيانات</p>
          ) : (
            <ChartFrame summary={dayData.map(d => `${d.name}: ${d.count}`)}>
            <BarChart height={160} labelSize={12} allLabels data={dayData.map((d, i) => ({ label: d.name, segments: [
              { value: d.count, color: i === 5 || i === 6 ? PRIMARY : DIM, title: `${d.count} حجز` },
            ] }))} />
            </ChartFrame>
          )}
        </div>
      </div>
    </div>
  );
}