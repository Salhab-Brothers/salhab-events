import { useState, useMemo } from 'react';
import { formatFullDateStr, formatMonthYearStr } from '@/lib/levantineMonths';
import { Search, CalendarDays, User, Phone, X } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TIME_SLOT_LABELS, STATUS_LABELS } from '@/lib/data';

const SLOT_BADGE = {
  lunch:     'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 border-amber-200 dark:border-amber-800',
  afternoon: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200 border-blue-200 dark:border-blue-800',
  wedding:   'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200 border-violet-200 dark:border-violet-800',
  full:      'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800',
  morning:   'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 border-amber-200 dark:border-amber-800',
  evening:   'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200 border-violet-200 dark:border-violet-800',
};

const STATUS_BADGE = {
  confirmed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

// Detect event type from event_name
const detectEventType = (name = '') => {
  if (name.includes('زفاف')) return 'زفاف';
  if (name.includes('خطوبة') || name.includes('خطبة')) return 'خطوبة';
  if (name.includes('طلبة') || name.includes('طلب')) return 'طلبة';
  if (name.includes('غداء')) return 'غداء';
  return 'أخرى';
};

const EVENT_TYPE_FILTERS = ['الكل', 'زفاف', 'خطوبة', 'طلبة', 'غداء', 'أخرى'];
const SLOT_FILTERS = [
  { value: 'all', label: 'الكل' },
  { value: 'lunch', label: 'ظهراً' },
  { value: 'afternoon', label: 'عصراً' },
  { value: 'wedding', label: 'مساءً' },
  { value: 'full', label: 'اليوم كاملاً' },
];

const PillButton = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-3 py-1.5 rounded-full text-xs font-body font-medium border transition-all whitespace-nowrap
      ${active
        ? 'bg-primary text-primary-foreground border-primary'
        : 'bg-card border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
      }`}
  >
    {children}
  </button>
);

export default function EventsPage({ bookings }) {
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const [search, setSearch] = useState('');
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterSlot, setFilterSlot] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('الكل');
  const [filterDiwan, setFilterDiwan] = useState(false);
  const [showPast, setShowPast] = useState(false);

  const months = useMemo(() => {
    const set = new Set(bookings.filter(b => b.date >= todayStr).map(b => b.date.slice(0, 7)));
    return Array.from(set).sort();
  }, [bookings, todayStr]);

  const hasActiveFilters = search || filterMonth !== 'all' || filterSlot !== 'all' ||
    filterStatus !== 'all' || filterType !== 'الكل' || filterDiwan;

  const clearFilters = () => {
    setSearch('');
    setFilterMonth('all');
    setFilterSlot('all');
    setFilterStatus('all');
    setFilterType('الكل');
    setFilterDiwan(false);
    setShowPast(false);
  };

  const pastCount = useMemo(() => bookings.filter(b => b.status !== 'cancelled' && b.date < todayStr).length, [bookings, todayStr]);

  const filtered = useMemo(() => {
    return bookings
      .filter(b => {
        if (!showPast && b.date < todayStr) return false;
        const q = search.trim();
        const matchSearch = !q ||
          b.event_name?.includes(q) ||
          b.person_name?.includes(q) ||
          b.date?.includes(q);
        const matchMonth = filterMonth === 'all' || b.date.startsWith(filterMonth);
        const matchSlot = filterSlot === 'all' || b.time_slot === filterSlot || (filterSlot === 'lunch' && b.time_slot === 'morning') || (filterSlot === 'wedding' && b.time_slot === 'evening');
        const matchStatus = filterStatus === 'all' || b.status === filterStatus;
        const matchType = filterType === 'الكل' || detectEventType(b.event_name) === filterType;
        const matchDiwan = !filterDiwan || b.book_diwan === true;
        return matchSearch && matchMonth && matchSlot && matchStatus && matchType && matchDiwan;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [bookings, search, filterMonth, filterSlot, filterStatus, filterType, filterDiwan, showPast, todayStr]);

  return (
    <div className="animate-fade-in">
      <div className="mb-5">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-foreground mb-1">قائمة المناسبات</h1>
        <p className="font-body text-muted-foreground text-sm">
          عرض <span className="font-semibold text-foreground">{filtered.length}</span> من أصل <span className="font-semibold text-foreground">{bookings.length}</span> مناسبة
        </p>
      </div>

      {/* Search + Month + Status row */}
      <div className="flex flex-wrap gap-3 mb-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="🔍 ابحث عن حجز..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pr-9 font-body"
          />
        </div>
        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger className="w-40 font-body">
            <SelectValue placeholder="الشهر" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="font-body">كل الأشهر</SelectItem>
            {months.map(m => (
              <SelectItem key={m} value={m} className="font-body">
                {formatMonthYearStr(m)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36 font-body">
            <SelectValue placeholder="الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="font-body">كل الحالات</SelectItem>
            <SelectItem value="confirmed" className="font-body">مؤكد</SelectItem>
            <SelectItem value="pending" className="font-body">معلّق</SelectItem>
            <SelectItem value="cancelled" className="font-body">ملغي</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Event type pills */}
      <div className="flex flex-wrap gap-2 mb-3">
        {EVENT_TYPE_FILTERS.map(t => (
          <PillButton key={t} active={filterType === t} onClick={() => setFilterType(t)}>{t}</PillButton>
        ))}
      </div>

      {/* Time slot pills */}
      <div className="flex flex-wrap gap-2 mb-3">
        {SLOT_FILTERS.map(s => (
          <PillButton key={s.value} active={filterSlot === s.value} onClick={() => setFilterSlot(s.value)}>{s.label}</PillButton>
        ))}
      </div>

      {/* Diwan + Clear filters row */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filterDiwan}
              onChange={e => setFilterDiwan(e.target.checked)}
              className="w-4 h-4 accent-primary cursor-pointer"
            />
            <span className="font-body text-sm text-muted-foreground">الديوان فقط</span>
          </label>
          {pastCount > 0 && (
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showPast}
                onChange={e => setShowPast(e.target.checked)}
                className="w-4 h-4 accent-primary cursor-pointer"
              />
              <span className="font-body text-sm text-muted-foreground">إظهار المناسبات الماضية ({pastCount})</span>
            </label>
          )}
        </div>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="font-body text-xs gap-1.5 text-muted-foreground hover:text-foreground">
            <X size={13} />
            مسح الفلاتر
          </Button>
        )}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <CalendarDays size={32} className="text-muted-foreground" />
          </div>
          <p className="font-heading font-semibold text-foreground text-lg mb-1">لا توجد نتائج مطابقة</p>
          <p className="font-body text-muted-foreground text-sm">جرّب تغيير معايير البحث أو مسح الفلاتر</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(booking => (
            <div
              key={booking.id}
              className="bg-card border border-border/50 rounded-xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="font-heading font-bold text-base text-foreground">{booking.event_name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-body ${SLOT_BADGE[booking.time_slot]}`}>
                      {TIME_SLOT_LABELS[booking.time_slot]}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-body ${STATUS_BADGE[booking.status]}`}>
                      {STATUS_LABELS[booking.status]}
                    </span>
                    {booking.book_diwan && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-body">✅ الديوان</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-body text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <CalendarDays size={13} className="text-primary/60" />
                      <span>{formatFullDateStr(booking.date)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <User size={13} className="text-primary/60" />
                      <span>{booking.person_name}</span>
                    </div>
                    {booking.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone size={13} className="text-primary/60" />
                        <span dir="ltr">{booking.phone}</span>
                      </div>
                    )}
                  </div>
                  {booking.notes && (
                    <p className="mt-2 text-xs font-body text-muted-foreground/70 border-t border-border/40 pt-2">{booking.notes}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}