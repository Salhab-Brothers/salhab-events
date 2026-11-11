import { useRef, useState } from 'react';
import { format, parseISO, isAfter, startOfToday } from 'date-fns';
import { LEVANTINE_MONTHS } from '@/lib/levantineMonths';
import { Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TIME_SLOT_LABELS } from '@/lib/data';
import html2canvas from 'html2canvas';

const WEEKDAY_AR = { 0: 'الأحد', 1: 'الإثنين', 2: 'الثلاثاء', 3: 'الأربعاء', 4: 'الخميس', 5: 'الجمعة', 6: 'السبت' };
const MONTH_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

const TIMESTAMP_KEY = 'salhab_image_timestamp';

function formatTimestampAr(date) {
  const d = new Date(date);
  const day = WEEKDAY_AR[d.getDay()];
  const dateNum = d.getDate();
  const month = MONTH_AR[d.getMonth()];
  const year = d.getFullYear();
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'م' : 'ص';
  h = h % 12 || 12;
  return `آخر تحديث: ${day}، ${dateNum} ${month} ${year} الساعة ${h}:${m} ${ampm}`;
}

// Safe web font for canvas rendering
const CANVAS_FONT = "'Tahoma', 'Arial', sans-serif";

export default function DownloadEventsImage({ bookings, onRefresh }) {
  const ref = useRef();
  const [loading, setLoading] = useState(false);
  const [timestamp, setTimestamp] = useState(() => localStorage.getItem(TIMESTAMP_KEY) || null);
  const today = startOfToday();

  const upcoming = bookings
    .filter(b => b.status !== 'cancelled' && (isAfter(parseISO(b.date), today) || b.date === format(today, 'yyyy-MM-dd')))
    .sort((a, b) => a.date.localeCompare(b.date));

  const updateTimestamp = () => {
    const now = new Date().toISOString();
    localStorage.setItem(TIMESTAMP_KEY, now);
    setTimestamp(now);
  };

  const handleDownload = async () => {
    setLoading(true);
    await document.fonts.ready;
    const canvas = await html2canvas(ref.current, {
      scale: 4,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#fdf8f0',
      imageTimeout: 0,
      onclone: (doc) => {
        const el = doc.querySelector('[data-printable]');
        if (el) {
          el.style.maxWidth = 'none';
          el.style.width = '960px';
        }
        const headers = doc.querySelectorAll('[data-canvas-font]');
        headers.forEach(h => { h.style.fontFamily = CANVAS_FONT; });
      },
    });
    const link = document.createElement('a');
    link.download = `افراح-ال-سلهب-${format(today, 'yyyy-MM-dd')}.jpg`;
    link.href = canvas.toDataURL('image/jpeg', 1.0);
    link.click();
    updateTimestamp();
    setLoading(false);
  };

  const handleRefresh = async () => {
    setLoading(true);
    if (onRefresh) await onRefresh();
    updateTimestamp();
    setLoading(false);
  };

  return (
    <div className="animate-fade-in">
      {/* Controls */}
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-heading font-bold text-xl text-foreground">تحميل صورة المناسبات القادمة</h2>
          <p className="font-body text-muted-foreground text-sm mt-0.5">{upcoming.length} مناسبة قادمة</p>
          {timestamp && (
            <p className="font-body text-xs text-primary/70 mt-1">{formatTimestampAr(timestamp)}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={loading}
            className="gap-2 font-body"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
            تحديث الصورة
          </Button>
          <Button onClick={handleDownload} disabled={loading || upcoming.length === 0} className="gap-2 font-body">
            <Download size={16} />
            {loading ? 'جارٍ التحميل...' : '📥 تحميل الصورة'}
          </Button>
        </div>
      </div>

      {/* Printable card */}
      <div
        ref={ref}
        data-printable="1"
        dir="rtl"
        style={{
          fontFamily: "'Tahoma', 'Arial', sans-serif",
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          background: 'linear-gradient(135deg, #fdf8f0 0%, #f5ede0 100%)',
          padding: '56px 48px',
          borderRadius: '16px',
          maxWidth: '960px',
          width: '960px',
          border: '2px solid #e8d8c0',
          boxSizing: 'border-box',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '36px', borderBottom: '3px solid #c8a96e', paddingBottom: '28px' }}>
          <p data-canvas-font="1" style={{ fontFamily: CANVAS_FONT, fontSize: '16px', color: '#8a7060', marginBottom: '8px' }}>
            نظام حجوزات
          </p>
          <h1 data-canvas-font="1" style={{ fontFamily: CANVAS_FONT, fontSize: '42px', fontWeight: '800', color: '#1a3a3a', margin: '0 0 8px' }}>
            أفراح آل سلهب
          </h1>
          <p style={{ fontSize: '18px', color: '#8a7060', margin: 0 }}>
            جدول المناسبات القادمة — {today.getDate()} {LEVANTINE_MONTHS[today.getMonth()]}، {today.getMonth() + 1} / {today.getFullYear()}
          </p>
        </div>

        {/* Events list */}
        {upcoming.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#8a7060', fontSize: '20px', padding: '48px 0' }}>لا توجد مناسبات قادمة</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#e8d8c0' }}>
                {['اليوم', 'التاريخ', 'المناسبة', 'وقت', 'الديوان'].map(h => (
                  <th key={h} style={{
                    padding: '14px 16px',
                    fontSize: '16px',
                    fontWeight: '700',
                    color: '#5a3e2a',
                    textAlign: 'right',
                    borderBottom: '2px solid #c8a96e',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {upcoming.map((b, i) => {
                const d = parseISO(b.date);
                const dow = d.getDay();
                const isFriSat = dow === 5 || dow === 6;
                return (
                  <tr key={b.id} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(200,169,110,0.08)' }}>
                    <td style={{ padding: '12px 16px', fontSize: '17px', color: isFriSat ? '#0d5555' : '#3a2a1a', fontWeight: isFriSat ? '700' : '500', borderBottom: '2px solid #e8d8c0', whiteSpace: 'nowrap' }}>{WEEKDAY_AR[dow]}</td>
                    <td style={{ padding: '12px 16px', fontSize: '17px', color: '#5a3e2a', borderBottom: '2px solid #e8d8c0', whiteSpace: 'nowrap', direction: 'ltr', textAlign: 'right' }}>{format(d, 'dd/MM/yyyy')}</td>
                    <td style={{ padding: '12px 16px', fontSize: '18px', fontWeight: '700', color: '#1a2a2a', borderBottom: '2px solid #e8d8c0' }}>{b.event_name}</td>
                    <td style={{ padding: '12px 16px', fontSize: '16px', color: ['lunch','morning'].includes(b.time_slot) ? '#a05a00' : b.time_slot === 'afternoon' ? '#1e40af' : b.time_slot === 'full' ? '#991b1b' : '#5b21b6', borderBottom: '2px solid #e8d8c0', whiteSpace: 'nowrap', fontWeight: '600' }}>{TIME_SLOT_LABELS[b.time_slot]}</td>
                    <td style={{ padding: '12px 16px', fontSize: '18px', textAlign: 'center', borderBottom: '2px solid #e8d8c0' }}>{b.book_diwan ? '✅' : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '32px', paddingTop: '20px', borderTop: '2px solid #c8a96e' }}>
          <p style={{ fontSize: '14px', color: '#a08060', margin: 0 }}>
            نظام حجوزات آل سلهب — تم الإنشاء بتاريخ {format(today, 'yyyy/MM/dd')}
          </p>
        </div>
      </div>
    </div>
  );
}