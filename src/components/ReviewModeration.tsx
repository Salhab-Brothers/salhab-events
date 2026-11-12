import { useEffect, useState, useCallback } from 'react';
import { Check, Trash2, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDialog } from '@/components/useDialog';
import { entities } from '@/api/api';
import type { Review } from '@/types';

export default function ReviewModeration() {
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [error, setError] = useState('');
  const { confirm, dialog } = useDialog();

  const load = useCallback(async () => {
    try {
      setReviews(await entities.Review.list('-created_date', 200));
    } catch (err) {
      console.error('Failed to load reviews', err);
      setError('تعذّر تحميل التقييمات');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const act = async (fn: () => Promise<unknown>) => {
    setError('');
    try { await fn(); } catch (err) {
      console.error('Review action failed', err);
      setError('تعذّر تنفيذ العملية');
    }
    load();
  };

  const remove = async (r: Review) => {
    if (await confirm('حذف هذا التقييم؟')) await act(() => entities.Review.delete(r.id));
  };

  if (error && !reviews) return <p className="text-sm font-body text-destructive">{error}</p>;
  if (!reviews) return null;
  if (reviews.length === 0) return <p className="font-body text-muted-foreground text-sm">لا توجد تقييمات</p>;

  return (
    <div className="space-y-3">
      {error && <p className="text-sm font-body text-destructive">{error}</p>}
      {reviews.map((r) => (
        <div key={r.id} className="bg-card border border-border/50 rounded-xl p-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-body font-semibold text-sm">{r.reviewer_name}</span>
              <span className="flex items-center gap-0.5 text-amber-500 text-xs"><Star size={11} className="fill-amber-400" />{r.rating}</span>
              {!r.approved && (
                <span className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 px-2 py-0.5 rounded-full">بانتظار المراجعة</span>
              )}
            </div>
            {r.event_name && <p className="text-xs text-muted-foreground font-body">{r.event_name}</p>}
            {r.comment && <p className="text-sm font-body mt-1 break-words">{r.comment}</p>}
          </div>
          <div className="flex gap-1.5 shrink-0">
            {!r.approved && (
              <Button size="sm" onClick={() => act(() => entities.Review.update(r.id, { approved: true }))} className="gap-1">
                <Check size={14} /> قبول
              </Button>
            )}
            <Button size="sm" variant="outline" aria-label={`حذف تقييم ${r.reviewer_name}`} onClick={() => remove(r)}>
              <Trash2 size={14} />
            </Button>
          </div>
        </div>
      ))}
      {dialog}
    </div>
  );
}
