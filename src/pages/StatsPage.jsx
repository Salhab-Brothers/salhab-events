import { useMemo } from 'react';
import { parseISO, isAfter, startOfToday } from 'date-fns';
import { LEVANTINE_MONTHS } from '@/lib/levantineMonths';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { CalendarDays, TrendingUp, Clock, CheckCircle } from 'lucide-react';

const SLOT_COLORS = { lunch: '#f59e0b', afternoon: '#3b82f6', wedding: '#7c3aed', full: '#ef4444', morning: '#f59e0b', evening: '#7c3aed' };
const SLOT_LABELS = { lunch: 'غداء ظهراً', afternoon: 'خطبة / طلبة عصراً', wedding: 'حفل زفاف مساءاً', full: 'اليوم كاملاً', morning: 'غداء ظهراً', evening: 'حفل زفاف مساءاً' };

export default function StatsPage({ bookings }) {
  const active = bookings.filter(b => b.status !== 'cancelled');
  const today = startOfToday();

  const upcoming = active.filter(b => isAfter(parseISO(b.date), today)).length;
  const past = active.length - upcoming;

  // Bookings per month (next 6 months + past 3 months)
  const monthlyData = useMemo(() => {
    const map = {};
    active.forEach(b => {
      const d = parseISO(b.date);
      const key = `${LEVANTINE_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
      map[key] = (map[key] || 0) + 1;
    });
    // Sort by actual date using first booking found for each key
    const keyDateMap = {};
    active.forEach(b => {
      const d = parseISO(b.date);
      const key = `${LEVANTINE_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
      if (!keyDateMap[key] || b.date < keyDateMap[key]) keyDateMap[key] = b.date;
    });
    return Object.entries(map)
      .sort(([a], [b]) => (keyDateMap[a] || '').localeCompare(keyDateMap[b] || ''))
      .map(([month, count]) => ({ month, count }));
  }, [active]);

  // Slot distribution
  const slotData = useMemo(() => {
    const normalize = (s) => s === 'morning' ? 'lunch' : s === 'evening' ? 'wedding' : s;
    const map = { lunch: 0, afternoon: 0, wedding: 0, full: 0 };
    active.forEach(b => {
      const s = normalize(b.time_slot);
      if (map[s] !== undefined) map[s]++;
    });
    return Object.entries(map)
      .filter(([, v]) => v > 0)
      .map(([slot, value]) => ({ name: SLOT_LABELS[slot], value, slot }));
  }, [active]);

  // Busiest days of week
  const dayData = useMemo(() => {
    const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const map = Array(7).fill(0);
    active.forEach(b => {
      const d = parseISO(b.date).getDay();
      map[d]++;
    });
    return dayNames.map((name, i) => ({ name, count: map[i] }));
  }, [active]);

  const statCards = [
    { icon: CalendarDays, label: 'إجمالي الحجوزات', value: active.length, color: 'text-primary', bg: 'bg-primary/10' },
    { icon: TrendingUp, label: 'المناسبات القادمة', value: upcoming, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30' },
    { icon: CheckCircle, label: 'المناسبات المنتهية', value: past, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
    { icon: Clock, label: 'الوقت الأكثر حجزاً', value: slotData.sort((a, b) => b.value - a.value)[0]?.name || '—', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30' },
  ];

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-foreground mb-1">الإحصائيات</h1>
        <p className="font-body text-muted-foreground text-sm">نظرة عامة على حجوزات قاعة آل سلهب</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {statCards.map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className={`flex items-center gap-3 p-4 rounded-xl border border-border/50 ${bg} shadow-sm`}>
            <div className={`p-2 rounded-lg bg-white/60 dark:bg-black/20 ${color}`}>
              <Icon size={18} />
            </div>
            <div>
              <p className="text-xs font-body text-muted-foreground leading-tight">{label}</p>
              <p className={`font-heading font-bold text-lg leading-tight ${color}`}>{value}</p>
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
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="month" tick={{ fontSize: 10, fontFamily: 'Cairo' }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  formatter={(v) => [v, 'حجز']}
                  contentStyle={{ fontFamily: 'Cairo', fontSize: 12, direction: 'rtl' }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Slot pie */}
        <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
          <h2 className="font-heading font-bold text-base text-foreground mb-4">توزيع أوقات الحجز</h2>
          {active.length === 0 ? (
            <p className="text-sm font-body text-muted-foreground text-center py-10">لا توجد بيانات</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={slotData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    label={false}
                    labelLine={false}
                  >
                    {slotData.map((entry, i) => (
                      <Cell key={i} fill={SLOT_COLORS[entry.slot]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v, name) => [v, name]}
                    contentStyle={{ fontFamily: 'Cairo', fontSize: 12, direction: 'rtl' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* External legend */}
              <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 mt-3">
                {slotData.map((entry) => {
                  const total = slotData.reduce((s, e) => s + e.value, 0);
                  const pct = total > 0 ? ((entry.value / total) * 100).toFixed(0) : 0;
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

        {/* Day of week */}
        <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm lg:col-span-2">
          <h2 className="font-heading font-bold text-base text-foreground mb-4">الحجوزات حسب يوم الأسبوع</h2>
          {active.length === 0 ? (
            <p className="text-sm font-body text-muted-foreground text-center py-10">لا توجد بيانات</p>
          ) : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={dayData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: 'Cairo' }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip formatter={(v) => [v, 'حجز']} contentStyle={{ fontFamily: 'Cairo', fontSize: 12, direction: 'rtl' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {dayData.map((entry, i) => (
                    <Cell key={i} fill={i === 5 || i === 6 ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground) / 0.4)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}