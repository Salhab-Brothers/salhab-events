import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TIME_SLOT_LABELS } from '@/lib/data';
import { formatFullDateStr } from '@/lib/levantineMonths';
import type { Booking } from '@/types';

interface ConflictDialogProps {
  conflicts: Booking[];
  onOverride: () => void;
  onCancel: () => void;
}

export default function ConflictDialog({ conflicts, onOverride, onCancel }: ConflictDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div role="alertdialog" aria-modal="true" aria-labelledby="conflict-title" className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-border">
          <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} className="text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h2 id="conflict-title" className="font-heading font-bold text-lg text-foreground">⚠️ تعارض في الحجز</h2>
            <p className="font-body text-sm text-muted-foreground">يوجد حجز مسبق في هذا اليوم والوقت:</p>
          </div>
        </div>

        {/* Conflicting events */}
        <div className="px-6 py-4 space-y-2.5">
          {conflicts.map((c, i) => (
            <div key={i} className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/50 rounded-xl p-3.5">
              <p className="font-heading font-bold text-foreground text-sm">{c.event_name}</p>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 font-body text-xs text-muted-foreground">
                <span>{c.date && formatFullDateStr(c.date)}</span>
                <span>{TIME_SLOT_LABELS[c.time_slot]}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 pb-5">
          <Button
            type="button"
            variant="outline"
            autoFocus
            className="flex-1 font-body"
            onClick={onCancel}
          >
            إلغاء
          </Button>
          <Button
            type="button"
            className="flex-1 font-body bg-orange-600 hover:bg-orange-700 text-white"
            onClick={onOverride}
          >
            تجاهل والحفظ
          </Button>
        </div>
      </div>
    </div>
  );
}