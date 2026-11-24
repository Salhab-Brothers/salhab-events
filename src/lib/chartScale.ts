/** Whole-number ticks from 0 up to a round top value, never more than five of them (0 5 10 15 20). */
export function yTicks(max: number): number[] {
  const top = Math.max(1, Math.ceil(max));
  const step = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000].find(s => top / s <= 4) ?? Math.ceil(top / 4);
  const last = Math.ceil(top / step) * step;
  return Array.from({ length: last / step + 1 }, (_, i) => i * step);
}

/** Show every n-th label so that neighbours do not overlap (the width of a label is estimated from its length). */
export function labelStep(labels: string[], band: number, fontSize: number): number {
  const widest = Math.max(0, ...labels.map(l => l.length)) * fontSize * 0.55 + 8;
  return Math.max(1, Math.ceil(widest / band));
}
