import { useEffect, useRef } from 'react';
import { captchaSiteKey } from '@/lib/publicSubmit';

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      remove: (id: string) => void;
    };
  }
}

// The normal widget is 300px wide; the narrowest phones get the 150px compact one instead.
const NORMAL_WIDTH = 300;
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let scriptPromise: Promise<void> | null = null;
const loadScript = () => {
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { scriptPromise = null; reject(new Error('captcha script failed')); };
    document.head.appendChild(s);
  });
  return scriptPromise;
};

/** Turnstile challenge. Renders nothing when no site key is configured. */
export default function Captcha({ onToken }: { onToken: (token: string | null) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const siteKey = captchaSiteKey();

  useEffect(() => {
    if (!siteKey) return;
    let widget: string | undefined;
    let cancelled = false;
    loadScript().then(() => {
      if (cancelled || !box.current || !window.turnstile) return;
      widget = window.turnstile.render(box.current, {
        sitekey: siteKey,
        size: box.current.clientWidth >= NORMAL_WIDTH ? 'normal' : 'compact',
        callback: (t: string) => onToken(t),
        'expired-callback': () => onToken(null),
        'error-callback': () => onToken(null),
      });
    }).catch(() => onToken(null));
    return () => {
      cancelled = true;
      if (widget) window.turnstile?.remove(widget);
    };
  }, [siteKey, onToken]);

  return siteKey ? <div ref={box} data-testid="captcha" className="-mx-3 flex justify-center sm:mx-0" /> : null;
}
