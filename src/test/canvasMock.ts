import { vi } from 'vitest';

/** A 2D context stub: records nothing, accepts everything (jsdom has no canvas). */
export function installCanvasMock() {
  const gradient = { addColorStop: vi.fn() };
  const ctx = new Proxy({} as Record<string, unknown>, {
    get(target, prop: string) {
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return () => gradient;
      if (prop === 'measureText') return (text: string) => ({ width: text.length * 20 });
      if (!(prop in target)) target[prop] = vi.fn();
      return target[prop];
    },
    set(target, prop: string, value) {
      target[prop] = value;
      return true;
    },
  });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/jpeg;base64,AAA');
  return ctx;
}
