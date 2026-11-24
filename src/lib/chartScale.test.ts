import { describe, it, expect } from 'vitest';
import { yTicks, labelStep } from './chartScale';

describe('yTicks', () => {
  it.each([
    [0, [0, 1]], [1, [0, 1]], [3, [0, 1, 2, 3]], [4, [0, 1, 2, 3, 4]], [5, [0, 2, 4, 6]],
    [8, [0, 2, 4, 6, 8]], [9, [0, 5, 10]], [12, [0, 5, 10, 15]], [32, [0, 10, 20, 30, 40]], [101, [0, 50, 100, 150]],
  ])('for a highest bar of %i', (max, ticks) => expect(yTicks(max)).toEqual(ticks));

  it('rounds a fractional maximum up and never gives more than five ticks', () => {
    expect(yTicks(2.2)).toEqual([0, 1, 2, 3]);
    for (let max = 0; max < 3000; max += 7) expect(yTicks(max).length).toBeLessThanOrEqual(5);
  });

  it('always reaches the highest bar', () => {
    for (const max of [1, 2, 7, 13, 99, 250, 1234, 5000]) expect(yTicks(max).at(-1)!).toBeGreaterThanOrEqual(max);
  });

  it('copes with a huge maximum by widening the step', () => {
    const ticks = yTicks(25000);
    expect(ticks.length).toBeLessThanOrEqual(5);
    expect(ticks.at(-1)!).toBeGreaterThanOrEqual(25000);
  });
});

describe('labelStep', () => {
  it('shows every label when they fit and thins them when they do not', () => {
    expect(labelStep(['آذار', 'نيسان'], 100, 13)).toBe(1);
    expect(labelStep(['كانون الأول 2026', 'كانون الثاني 2027'], 60, 13)).toBeGreaterThan(1);
  });
  it('goes by the longest label', () => {
    expect(labelStep(['ا', 'ا'.repeat(30)], 50, 13)).toBeGreaterThan(labelStep(['ا', 'ا'], 50, 13));
  });
  it('never returns less than one, even without labels', () => expect(labelStep([], 10, 13)).toBe(1));
});
