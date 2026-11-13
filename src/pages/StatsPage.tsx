import { useMemo, type ReactNode } from 'react';
import { parseISO, isAfter, startOfToday } from 'date-fns';
import { LEVANTINE_MONTHS } from '@/lib/levantineMonths';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { CalendarDays, TrendingUp, Clock, CheckCircle, CalendarCheck, Flame } from 'lucide-react';
import { normalizeSlot, type CanonicalSlot } from '@/lib/data';
import { busiestMonth, eventTypeCounts, shortMonth, weekendAvailability } from '@/lib/stats';
import type { Booking } from '@/types';

const SLOT_COLORS: Record<CanonicalSlot, string> = { lunch: '#f59e0b', afternoon: '#3b82f6', wedding: '#7c3aed', full: '#ef4444' };
const SLOT_LABELS: Record<CanonicalSlot, string> = { lunch: 'غداء ظهراً', afternoon: 'خطبة / طلبة عصراً', wedding: 'حفل زفاف مساءاً', full: 'اليوم كاملاً' };
const DAY_NAMES = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

// People who asked their device for less motion get charts that appear at once instead of growing in.
const animateCharts = () =>
  typeof window.matchMedia !== 'function' || !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const monthKey = (date: string) => {
  const d = parseISO(date);
  return `${LEVANTINE_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

/**
 * Charts are visual only, so screen readers skip them and read `summary` as a list instead.
 * Each chart also sets `accessibilityLayer={false}`: recharts 3 otherwise adds a keyboard stop
 * (svg tabindex=0), and the pie adds another (rootTabIndex), inside this hidden wrapper.
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
  const animate = animateCharts();
  const today = startOfToday();

  const upcoming = active.filter(b => isAfter(parseISO(b.date), today)).length;
  const past = active.length - upcoming;

  // Bookings per month, in calendar order (keyed by the earliest date seen for each month)
  const monthlyData = useMemo(() => {
    const counts: Record<string, number> = {};
    const firstDate: Record<string, string> = {};
    active.forEach(b => {
      const key = monthKey(b.date);
      counts[key] = (counts[key] || 0) + 1;
      if (!firstDate[key] || b.date < firstDate[key]) firstDate[key] = b.date;
    });
    return Object.keys(counts)
      .sort((a, b) => firstDate[a].localeCompare(firstDate[b]))
      .map(month => ({ month, count: counts[month] }));
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
              <p className="text-xs font-body text-muted-foreground leading-tight">{label}</p>
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
            <ResponsiveContainer width="100%" height={200}>
              <BarChart accessibilityLayer={false} data={monthlyData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fontSize: 10, fontFamily: 'Cairo' }} />
                <YAxis width={28} axisLine={false} tickLine={false} tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  formatter={(v) => [v, 'حجز']}
                  contentStyle={{ fontFamily: 'Cairo', fontSize: 12, direction: 'rtl' }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} isAnimationActive={animate} />
              </BarChart>
            </ResponsiveContainer>
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
              <ResponsiveContainer width="100%" height={180}>
                <PieChart accessibilityLayer={false}>
                  <Pie
                    data={slotData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    rootTabIndex={-1}
                    isAnimationActive={animate}
                    label={false}
                    labelLine={false}
                  >
                    {slotData.map((entry, i) => (
                      <Cell key={i} fill={SLOT_COLORS[entry.slot]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ fontFamily: 'Cairo', fontSize: 12, direction: 'rtl' }}
                  />
                </PieChart>
              </ResponsiveContainer>
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
          <p className="text-xs font-body text-muted-foreground mb-4">كم منها محجوز وكم ما زال متاحاً، شهراً بشهر</p>
          <ChartFrame summary={weekendData.map(d => `${d.month}: ${d.booked} محجوز، ${d.free} متاح`)}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart accessibilityLayer={false} data={weekendData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <XAxis dataKey="month" interval={0} tickFormatter={shortMonth} tick={{ fontSize: 10, fontFamily: 'Cairo' }} />
              <YAxis width={28} axisLine={false} tickLine={false} tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip formatter={(v, name) => [v, name === 'booked' ? 'محجوز' : 'متاح']} contentStyle={{ fontFamily: 'Cairo', fontSize: 12, direction: 'rtl' }} />
              <Bar dataKey="booked" stackId="weekend" fill="hsl(var(--primary))" isAnimationActive={animate} />
              <Bar dataKey="free" stackId="weekend" fill="hsl(var(--muted-foreground) / 0.3)" radius={[4, 4, 0, 0]} isAnimationActive={animate} />
            </BarChart>
          </ResponsiveContainer>
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
            <ResponsiveContainer width="100%" height={200}>
              <BarChart accessibilityLayer={false} data={typeData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <XAxis dataKey="type" tick={{ fontSize: 11, fontFamily: 'Cairo' }} />
                <YAxis width={28} axisLine={false} tickLine={false} tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip formatter={(v) => [v, 'مناسبة']} contentStyle={{ fontFamily: 'Cairo', fontSize: 12, direction: 'rtl' }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} isAnimationActive={animate} />
              </BarChart>
            </ResponsiveContainer>
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
            <ResponsiveContainer width="100%" height={160}>
              <BarChart accessibilityLayer={false} data={dayData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: 'Cairo' }} />
                <YAxis width={28} axisLine={false} tickLine={false} tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip formatter={(v) => [v, 'حجز']} contentStyle={{ fontFamily: 'Cairo', fontSize: 12, direction: 'rtl' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} isAnimationActive={animate}>
                  {dayData.map((_, i) => (
                    <Cell key={i} fill={i === 5 || i === 6 ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.4)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            </ChartFrame>
          )}
        </div>
      </div>
    </div>
  );
}