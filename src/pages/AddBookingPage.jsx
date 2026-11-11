import { useState } from 'react';
import { format } from 'date-fns';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { entities } from '@/api/api';
import IslamicDateWarning from '@/components/IslamicDateWarning';
import ConflictDialog from '@/components/ConflictDialog';

const TIME_SLOTS = [
  { value: 'lunch',     label: 'ظهراً' },
  { value: 'afternoon', label: 'عصراً' },
  { value: 'wedding',   label: 'مساءً' },
  { value: 'full',      label: 'اليوم كاملاً' },
];

// Normalize legacy slot values
const normalizeSlot = (s) => s === 'morning' ? 'lunch' : s === 'evening' ? 'wedding' : s;

export default function AddBookingPage({ bookings, onBookingAdded, editingBooking, onCancel }) {
  const [form, setForm] = useState(() => {
    if (editingBooking) {
      return { ...editingBooking, time_slot: normalizeSlot(editingBooking.time_slot) };
    }
    return { date: '', event_name: '', time_slot: 'lunch', person_name: '', phone: '', notes: '', book_diwan: false };
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [conflicts, setConflicts] = useState(null); // null = no modal, [] = modal shown

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const findConflicts = () => {
    if (!form.date || !form.time_slot) return [];
    const newSlot = normalizeSlot(form.time_slot);
    return bookings.filter(b => {
      if (b.status === 'cancelled') return false;
      if (editingBooking && b.id === editingBooking.id) return false;
      if (b.date !== form.date) return false;
      const bSlot = normalizeSlot(b.time_slot);
      // full conflicts with everything; same slot conflicts with itself
      if (bSlot === 'full' || newSlot === 'full') return true;
      return bSlot === newSlot;
    });
  };

  const saveBooking = async () => {
    setLoading(true);
    setError('');
    try {
      if (editingBooking) {
        await entities.Booking.update(editingBooking.id, { ...form, status: 'confirmed' });
      } else {
        await entities.Booking.create({ ...form, status: 'confirmed' });
      }
    } catch (err) {
      console.error('Save booking failed', err);
      setError('تعذّر حفظ الحجز. حاول مرة أخرى.');
      setLoading(false);
      setConflicts(null);
      return;
    }
    setLoading(false);
    setConflicts(null);
    setSuccess(true);
    onBookingAdded();
    if (!editingBooking) {
      setForm({ date: '', event_name: '', time_slot: 'lunch', person_name: '', phone: '', notes: '', book_diwan: false });
      setTimeout(() => setSuccess(false), 3000);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = findConflicts();
    if (found.length > 0) {
      setConflicts(found);
      return;
    }
    await saveBooking();
  };

  return (
    <div className="animate-fade-in max-w-2xl">
      <div className="mb-6">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-foreground mb-1">
          {editingBooking ? 'تعديل الحجز' : 'إضافة حجز جديد'}
        </h1>
        <p className="font-body text-muted-foreground text-sm">أدخل تفاصيل المناسبة للحجز</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <Label className="font-body text-sm font-medium">التاريخ *</Label>
            <Input
              type="date"
              required
              value={form.date}
              onChange={e => { set('date', e.target.value); setConflicts(null); }}
              className="font-body"
              min={format(new Date(), 'yyyy-MM-dd')}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="font-body text-sm font-medium">الوقت *</Label>
            <div className="flex gap-2 flex-wrap">
              {TIME_SLOTS.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => { set('time_slot', s.value); setConflicts(null); }}
                  className={`flex-1 min-w-[80px] text-xs sm:text-sm py-2 px-3 rounded-lg border font-body font-medium transition-all
                    ${form.time_slot === s.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                    }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="font-body text-sm font-medium">اسم المناسبة *</Label>
          <Input
            required
            placeholder="مثال: عرس أبو محمد، تجمع آل سلهب"
            value={form.event_name}
            onChange={e => set('event_name', e.target.value)}
            className="font-body"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <Label className="font-body text-sm font-medium">اسم الشخص المسؤول *</Label>
            <Input
              required
              placeholder="الاسم الكامل"
              value={form.person_name}
              onChange={e => set('person_name', e.target.value)}
              className="font-body"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="font-body text-sm font-medium">رقم الهاتف *</Label>
            <Input
              required
              placeholder="05xxxxxxxx"
              value={form.phone}
              onChange={e => set('phone', e.target.value)}
              className="font-body"
              dir="ltr"
            />
          </div>
        </div>

        {/* Book Diwan checkbox */}
        <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30">
          <input
            type="checkbox"
            id="book_diwan"
            checked={!!form.book_diwan}
            onChange={e => set('book_diwan', e.target.checked)}
            className="w-5 h-5 accent-primary cursor-pointer"
          />
          <label htmlFor="book_diwan" className="font-body text-sm font-medium cursor-pointer select-none">
            ✅ احجز الديوان — <span className="text-muted-foreground font-normal">يشمل الحجز ديوان آل سلهب</span>
          </label>
        </div>

        <div className="space-y-1.5">
          <Label className="font-body text-sm font-medium">ملاحظات (اختياري)</Label>
          <Textarea
            placeholder="أي تفاصيل إضافية..."
            value={form.notes}
            onChange={e => set('notes', e.target.value)}
            className="font-body resize-none"
            rows={3}
          />
        </div>

        {/* Islamic date warning */}
        <IslamicDateWarning dateStr={form.date} />

        {/* Conflict dialog */}
        {conflicts && conflicts.length > 0 && (
          <ConflictDialog
            conflicts={conflicts}
            onOverride={saveBooking}
            onCancel={() => setConflicts(null)}
          />
        )}

        {/* Success */}
        {success && (
          <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
            <CheckCircle size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <p className="text-sm font-body font-medium text-emerald-700 dark:text-emerald-300">
              تم {editingBooking ? 'تعديل' : 'إضافة'} الحجز بنجاح!
            </p>
          </div>
        )}

        <div className="flex gap-3 pt-1">
          {editingBooking && (
            <Button type="button" variant="outline" onClick={onCancel} className="font-body flex-1">
              إلغاء
            </Button>
          )}
          <Button type="submit" disabled={loading} className="font-body flex-1">
            {loading ? 'جارٍ الحفظ...' : editingBooking ? 'حفظ التعديلات' : 'إضافة الحجز'}
          </Button>
        </div>
      </form>
    </div>
  );
}