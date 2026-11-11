import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, Send, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { entities } from '@/api/api';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

function StarRating({ value, onChange, readonly = false }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(s => (
        <button
          key={s}
          type="button"
          onClick={() => !readonly && onChange && onChange(s)}
          className={`transition-all ${readonly ? 'cursor-default' : 'hover:scale-110 cursor-pointer'}`}
        >
          <Star
            size={readonly ? 16 : 28}
            className={s <= value
              ? 'fill-amber-400 text-amber-400'
              : 'text-muted-foreground/40'
            }
          />
        </button>
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ reviewer_name: '', event_name: '', rating: 0, comment: '', event_date: '' });
  const [submitted, setSubmitted] = useState(false);

  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews'],
    queryFn: () => entities.Review.list('-created_date', 50),
  });

  const createMutation = useMutation({
    mutationFn: (data) => entities.Review.create({ ...data, event_date: data.event_date || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reviews'] });
      setSubmitted(true);
      setForm({ reviewer_name: '', event_name: '', rating: 0, comment: '', event_date: '' });
      setTimeout(() => setSubmitted(false), 4000);
    },
  });

  const avgRating = reviews.length
    ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.rating) return;
    // Honeypot: bots fill the hidden field; pretend success and drop it.
    if (e.target.elements.website?.value) { setSubmitted(true); return; }
    createMutation.mutate(form);
  };

  return (
    <div className="animate-fade-in max-w-3xl">
      <div className="mb-6">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-foreground mb-1">التقييمات والمراجعات</h1>
        <p className="font-body text-muted-foreground text-sm">شاركنا رأيك في تجربتك مع نظام حجوزات آل سلهب</p>
      </div>

      {/* Summary */}
      {reviews.length > 0 && (
        <div className="bg-card border border-border/50 rounded-2xl p-5 mb-6 flex items-center gap-6 shadow-sm">
          <div className="text-center">
            <p className="font-heading font-bold text-4xl text-amber-500">{avgRating}</p>
            <StarRating value={Math.round(avgRating)} readonly />
            <p className="text-xs font-body text-muted-foreground mt-1">{reviews.length} تقييم</p>
          </div>
          <div className="flex-1 space-y-1.5">
            {[5, 4, 3, 2, 1].map(s => {
              const count = reviews.filter(r => r.rating === s).length;
              const pct = reviews.length ? (count / reviews.length) * 100 : 0;
              return (
                <div key={s} className="flex items-center gap-2">
                  <span className="text-xs font-body text-muted-foreground w-4 text-center">{s}</span>
                  <Star size={10} className="fill-amber-400 text-amber-400 shrink-0" />
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-body text-muted-foreground w-4 text-center">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Form */}
      <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-sm mb-6">
        <h2 className="font-heading font-bold text-base text-foreground mb-4 flex items-center gap-2">
          <MessageSquare size={18} className="text-primary" />
          أضف تقييمك
        </h2>
        {submitted && (
          <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 mb-4">
            <p className="text-sm font-body font-medium text-emerald-700 dark:text-emerald-300">✓ شكراً! تم إرسال تقييمك وسيظهر بعد مراجعة الإدارة</p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="font-body text-sm font-medium">اسمك *</Label>
              <Input
                required
                placeholder="الاسم الكامل"
                value={form.reviewer_name}
                onChange={e => setForm(f => ({ ...f, reviewer_name: e.target.value }))}
                className="font-body"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="font-body text-sm font-medium">اسم المناسبة</Label>
              <Input
                placeholder="اختياري"
                value={form.event_name}
                onChange={e => setForm(f => ({ ...f, event_name: e.target.value }))}
                className="font-body"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="font-body text-sm font-medium">التقييم *</Label>
            <StarRating value={form.rating} onChange={v => setForm(f => ({ ...f, rating: v }))} />
            {!form.rating && <p className="text-xs text-muted-foreground font-body">اختر عدد النجوم</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="font-body text-sm font-medium">تعليقك (اختياري)</Label>
            <Textarea
              placeholder="شاركنا تجربتك..."
              value={form.comment}
              onChange={e => setForm(f => ({ ...f, comment: e.target.value }))}
              className="font-body resize-none"
              rows={3}
            />
          </div>

          <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
          {createMutation.isError && (
            <p className="text-sm font-body text-destructive">تعذّر إرسال التقييم. حاول مرة أخرى.</p>
          )}
          <Button type="submit" disabled={!form.rating || createMutation.isPending} className="font-body gap-2">
            <Send size={15} />
            {createMutation.isPending ? 'جارٍ الإرسال...' : 'إرسال التقييم'}
          </Button>
        </form>
      </div>

      {/* Reviews list */}
      <div className="space-y-3">
        {reviews.map(r => (
          <div key={r.id} className="bg-card border border-border/50 rounded-xl p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <p className="font-heading font-bold text-sm text-foreground">{r.reviewer_name}</p>
                {r.event_name && <p className="text-xs font-body text-muted-foreground">{r.event_name}</p>}
              </div>
              <div className="flex flex-col items-end gap-1">
                <StarRating value={r.rating} readonly />
                <p className="text-xs font-body text-muted-foreground/60">
                  {r.created_date ? format(new Date(r.created_date), 'd MMM yyyy', { locale: ar }) : ''}
                </p>
              </div>
            </div>
            {r.comment && <p className="text-sm font-body text-muted-foreground leading-relaxed">{r.comment}</p>}
          </div>
        ))}
        {reviews.length === 0 && (
          <p className="text-center font-body text-muted-foreground py-10">لا توجد تقييمات بعد — كن أول من يقيّم!</p>
        )}
      </div>
    </div>
  );
}