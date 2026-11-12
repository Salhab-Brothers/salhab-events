import { useState, type FormEvent } from 'react';
import { format } from 'date-fns';
import { CheckCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { entities } from '@/api/api';
import IslamicDateWarning from '@/components/IslamicDateWarning';
import Captcha from '@/components/Captcha';
import { honeypotTripped } from '@/lib/honeypot';
import { isValidPhone, PHONE_ERROR } from '@/lib/phone';
import { captchaSiteKey, sendPublic } from '@/lib/publicSubmit';
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
  const [phoneError, setPhoneError] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [captchaRound, setCaptchaRound] = useState(0);

  const set = <K extends keyof RequestForm>(k: K, v: RequestForm[K]) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    // Honeypot: real visitors never see or fill this field; bots do.
    if (honeypotTripped(e.currentTarget)) { setSubmitted(true); return; }
    if (!isValidPhone(form.phone)) { setPhoneError(true); return; }
    setLoading(true);
    try {
      await sendPublic('request', {
        ...form,
        status: 'pending' as const,
        submitted_at: new Date().toISOString(),
      }, token, row => entities.BookingRequest.create(row));
      setSubmitted(true);
    } catch (err) {
      console.error('Request submit failed', err);
      setError('تعذّر إرسال الطلب. حاول مرة أخرى أو تواصل معنا مباشرة.');
    } finally {
      setLoading(false);
      // A captcha token works once; ask for a fresh one.
      setToken(null);
      setCaptchaRound(n => n + 1);
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
        <div role="group" aria-labelledby="req-name-heading">
          <p id="req-name-heading" className="font-body text-sm font-medium mb-3">الاسم الرباعي *</p>
          <div className="grid grid-cols-2 gap-3">
            {NAME_FIELDS.map(({ key, label }) => (
              <div key={key} className="space-y-1">
                <Label htmlFor={`req-${key}`} className="font-body text-xs text-muted-foreground">{label}</Label>
                <Input
                  id={`req-${key}`}
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
          <Label htmlFor="req-phone" className="font-body text-sm font-medium">رقم الهاتف *</Label>
          <Input
            id="req-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            placeholder="05xxxxxxxx"
            value={form.phone}
            onChange={e => { set('phone', e.target.value); setPhoneError(false); }}
            aria-invalid={phoneError}
            aria-describedby={phoneError ? 'req-phone-error' : undefined}
            className="font-body"
            dir="ltr"
          />
          {phoneError && <p id="req-phone-error" role="alert" className="text-sm font-body text-destructive">{PHONE_ERROR}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <Label htmlFor="req-date" className="font-body text-sm font-medium">التاريخ المطلوب *</Label>
            <Input
              id="req-date"
              type="date"
              required
              value={form.date}
              onChange={e => set('date', e.target.value)}
              className="font-body"
              min={format(new Date(), 'yyyy-MM-dd')}
            />
          </div>
          <div className="space-y-1.5">
            <p id="req-slot-heading" className="font-body text-sm font-medium">الوقت المطلوب *</p>
            <div role="group" aria-labelledby="req-slot-heading" className="flex gap-2">
              {BOOKABLE_SLOTS.map(s => (
                <button
                  key={s.value}
                  type="button"
                  aria-pressed={form.time_slot === s.value}
                  onClick={() => set('time_slot', s.value)}
                  className={`flex-1 text-xs py-2 px-2 rounded-lg border font-body font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
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
          <Label htmlFor="req-event" className="font-body text-sm font-medium">اسم المناسبة *</Label>
          <Input
            id="req-event"
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
            ✅ احجز الديوان - <span className="text-muted-foreground font-normal">يشمل الطلب ديوان آل سلهب</span>
          </label>
        </div>

        {/* Islamic date warning */}
        <IslamicDateWarning dateStr={form.date} />

        <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
        <Captcha key={captchaRound} onToken={setToken} />
        {error && <p className="text-sm font-body text-destructive">{error}</p>}
        <Button type="submit" disabled={loading || (!!captchaSiteKey() && !token)} className="w-full font-body gap-2">
          <Send size={16} />
          {loading ? 'جارٍ الإرسال...' : 'إرسال الطلب'}
        </Button>
      </form>
    </div>
  );
}