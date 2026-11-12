import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';

interface Pending {
  message: string;
  withCancel: boolean;
  resolve: (ok: boolean) => void;
}

/**
 * In-app replacement for window.confirm and window.alert, built on the native
 * <dialog> element (focus is trapped, Escape closes it, the page behind is inert).
 * Render `dialog` once in the component that uses it.
 */
export function useDialog() {
  const [pending, setPending] = useState<Pending | null>(null);
  const ref = useRef<HTMLDialogElement>(null);
  const messageId = useId();

  const ask = useCallback(
    (message: string, withCancel: boolean) =>
      new Promise<boolean>((resolve) => setPending({ message, withCancel, resolve })),
    [],
  );
  const confirm = useCallback((message: string) => ask(message, true), [ask]);
  const notify = useCallback(async (message: string) => { await ask(message, false); }, [ask]);

  useEffect(() => {
    if (pending && !ref.current?.open) ref.current?.showModal();
  }, [pending]);

  const finish = (ok: boolean) => {
    pending?.resolve(ok);
    setPending(null);
  };

  const dialog = pending && (
    <dialog
      ref={ref}
      aria-labelledby={messageId}
      onCancel={(e) => { e.preventDefault(); finish(false); }}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-border bg-card p-6 text-foreground shadow-2xl backdrop:bg-black/50"
    >
      <p id={messageId} className="font-body text-base leading-relaxed">{pending.message}</p>
      <div className="mt-6 flex gap-3">
        {pending.withCancel && (
          <Button type="button" variant="outline" className="flex-1 font-body" onClick={() => finish(false)}>
            إلغاء
          </Button>
        )}
        <Button type="button" autoFocus className="flex-1 font-body" onClick={() => finish(true)}>
          {pending.withCancel ? 'تأكيد' : 'حسناً'}
        </Button>
      </div>
    </dialog>
  );

  return { confirm, notify, dialog };
}
