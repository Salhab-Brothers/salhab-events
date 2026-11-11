import { useState, type FormEvent } from 'react';
import { format } from 'date-fns';
import { CheckCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { entities } from '@/api/api';
import IslamicDateWarning from '@/components/IslamicDateWarning';
import { honeypotTripped } from '@/lib/honeypot';
import { BOOKABLE_SLOTS } from '@/lib/data';
import type { BookingRequest } from '@/types';


type RequestForm = Pick<BookingRequest,
  'first_name' | 'second_name' | 'third_name' | 'last_name' | 'phone' | 'date' | 'time_slot' | 'event_name' | 'book_diwan'>;

const EMPTY_FORM: RequestForm = {
  first_name: '',
  second_name: '',
  third_name: '',
  last_name: '',
  phone: '',
  date: '',
  time_slot: 'lunch',
  event_name: '',
  book_diwan: false,
};

const NAME_FIELDS: { key: 'first_name' | 'second_name' | 'third_name' | 'last_name'; label: string }[] = [
  { key: 'first_name', label: 'الاسم الأول' },
  { key: 'second_name', label: 'الاسم الثاني' },
  { key: 'third_name', label: 'الاسم الثالث' },
  { key: 'last_name', label: 'اسم العائلة' },
];

export default function RequestPage() {
  const [form, setForm] = useState<RequestForm>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const set = <K extends keyof RequestForm>(k: K, v: RequestForm[K]) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    // Honeypot: real visitors never see or fill this field; bots do.
    if (honeypotTripped(e.currentTarget)) { setSubmitted(true); return; }
    setLoading(true);
    try {
      await entities.BookingRequest.create({
        ...form,
        status: 'pending',
        submitted_at: new Date().toISOString(),
      });
      setSubmitted(true);
    } catch (err) {
      console.error('Request submit failed', err);
      setError('تعذّر إرسال الطلب. حاول مرة أخرى أو تواصل معنا مباشرة.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="animate-fade-in flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
        <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-6">
          <CheckCircle size={44} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <h2 className="font-heading font-bold text-2xl text-foreground mb-3">تم إرسال طلبك بنجاح</h2>
        <p className="font-body text-muted-foreground max-w-sm">
          طلب الحجز الخاص بك قيد المراجعة من قِبل الإدارة. سيتم التواصل معك قريباً على رقم الهاتف المدخل.
        </p>
        <Button
          className="mt-8 font-body"
          variant="outline"
          onClick={() => { setSubmitted(false); setForm(EMPTY_FORM); }}
        >
          تقديم طلب آخر
        </Button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in max-w-2xl">
      <div className="mb-6">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-foreground mb-1">طلب حجز</h1>
        <p className="font-body text-muted-foreground text-sm">
          أرسل طلب الحجز وستتلقى رداً من الإدارة قريباً
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm space-y-5">
        {/* Name fields */}
        <div>
          <Label className="font-body text-sm font-medium mb-3 block">الاسم الرباعي *</Label>
          <div className="grid grid-cols-2 gap-3">
            {NAME_FIELDS.map(({ key, label }) => (
              <div key={key} className="space-y-1">
                <Label className="font-body text-xs text-muted-foreground">{label}</Label>
                <Input
                  required={key === 'first_name' || key === 'last_name'}
                  placeholder={label}
                  value={form[key]}
                  onChange={e => set(key, e.target.value)}
                  className="font-body text-sm"
                />
              </div>
            ))}
          </div>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <Label className="font-body text-sm font-medium">التاريخ المطلوب *</Label>
            <Input
              type="date"
              required
              value={form.date}
              onChange={e => set('date', e.target.value)}
              className="font-body"
              min={format(new Date(), 'yyyy-MM-dd')}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="font-body text-sm font-medium">الوقت المطلوب *</Label>
            <div className="flex gap-2">
              {BOOKABLE_SLOTS.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => set('time_slot', s.value)}
                  className={`flex-1 text-xs py-2 px-2 rounded-lg border font-body font-medium transition-all
                    ${form.time_slot === s.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50'
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
            placeholder="مثال: عرس، خطبة، تجمع عائلي"
            value={form.event_name}
            onChange={e => set('event_name', e.target.value)}
            className="font-body"
          />
        </div>

        {/* Book Diwan checkbox */}
        <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30">
          <input
            type="checkbox"
            id="book_diwan_req"
            checked={!!form.book_diwan}
            onChange={e => set('book_diwan', e.target.checked)}
            className="w-5 h-5 accent-primary cursor-pointer"
          />
          <label htmlFor="book_diwan_req" className="font-body text-sm font-medium cursor-pointer select-none">
            ✅ احجز الديوان — <span className="text-muted-foreground font-normal">يشمل الطلب ديوان آل سلهب</span>
          </label>
        </div>

        {/* Islamic date warning */}
        <IslamicDateWarning dateStr={form.date} />

        {/* Future placeholder */}
        <div className="bg-muted/50 border border-border/50 rounded-xl p-4 text-center">
          <p className="text-xs font-body text-muted-foreground">
            🔒 التحقق عبر رمز OTP — <span className="font-medium">قريباً</span>
          </p>
        </div>

        <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
        {error && <p className="text-sm font-body text-destructive">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full font-body gap-2">
          <Send size={16} />
          {loading ? 'جارٍ الإرسال...' : 'إرسال الطلب'}
        </Button>
      </form>
    </div>
  );
}