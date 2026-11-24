import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { BarChart, PieChart } from './charts';

const one = (label: string, value: number, color = 'red') => ({ label, segments: [{ value, color, title: `${value} x` }] });
const bars = (c: HTMLElement) => [...c.querySelectorAll('[data-bar]')];
/** The path starts at the bottom (M x y+h), goes up, and its first curve control point (Q x y) is the top. */
const heightOf = (path: Element) => {
  const nums = path.getAttribute('d')!.match(/-?\d+(\.\d+)?/g)!.map(Number);
  return nums[1]! - nums[4]!;
};

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('BarChart', () => {
  it('draws a bar and a label for each item, with its hover text', () => {
    const { container } = render(<BarChart data={[one('آذار', 2), one('نيسان', 4)]} allLabels />);
    expect(bars(container).map(b => b.getAttribute('data-bar'))).toEqual(['آذار', 'نيسان']);
    expect([...container.querySelectorAll('title')].map(t => t.textContent)).toEqual(['آذار: 2 x', 'نيسان: 4 x']);
    expect([...container.querySelectorAll('svg > g text')].map(t => t.textContent)).toEqual(['آذار', 'نيسان']);
  });

  it('labels the y axis with whole numbers up to the highest bar', () => {
    const { container } = render(<BarChart data={[one('a', 7)]} />);
    const ticks = [...container.querySelectorAll('svg > text')].map(t => t.textContent);
    expect(ticks).toEqual(['0', '2', '4', '6', '8']);
  });

  it('scales bar heights to their values', () => {
    const { container } = render(<BarChart data={[one('a', 2), one('b', 4)]} height={200} />);
    const [a, b] = bars(container).map(g => heightOf(g.querySelector('path')!));
    expect(b! / a!).toBeCloseTo(2, 1);
    expect(b!).toBeLessThanOrEqual(200);
  });

  it('stacks segments, in the colours given, and skips an empty one', () => {
    const { container } = render(<BarChart data={[{ label: 'm', segments: [
      { value: 3, color: 'teal', title: '3 booked' }, { value: 0, color: 'grey', title: '0 free' }, { value: 1, color: 'blue', title: '1 other' },
    ] }]} />);
    const paths = [...container.querySelectorAll('[data-bar="m"] path')];
    expect(paths.map(p => p.getAttribute('fill'))).toEqual(['teal', 'blue']);
    expect(heightOf(paths[0]!)).toBeGreaterThan(heightOf(paths[1]!));
  });

  it('formats labels with the function given', () => {
    const { container } = render(<BarChart data={[one('تشرين الأول', 1)]} format={l => l.replace(' الأول', ' 1')} />);
    expect(container.querySelector('svg > g text')!.textContent).toBe('تشرين 1');
  });

  it('shows every n-th label when they would be crowded, unless asked to show all', () => {
    const data = Array.from({ length: 12 }, (_, i) => one(`شهر طويل جداً ${i}`, 1));
    const crowded = render(<BarChart data={data} />);
    const shown = crowded.container.querySelectorAll('svg > g text').length;
    expect(shown).toBeGreaterThan(0);
    expect(shown).toBeLessThan(12);
    crowded.unmount();
    const all = render(<BarChart data={data} allLabels />);
    expect(all.container.querySelectorAll('svg > g text')).toHaveLength(12);
  });

  it('draws an empty chart for no data and for all zeros', () => {
    expect(bars(render(<BarChart data={[]} />).container)).toHaveLength(0);
    const zeros = render(<BarChart data={[one('a', 0)]} />);
    expect(zeros.container.querySelectorAll('[data-bar] path')).toHaveLength(0);
    expect(zeros.container.querySelector('svg > text')!.textContent).toBe('0');
  });

  it('is as wide as the box it sits in and follows when the box changes', () => {
    let notify: () => void = () => {};
    vi.stubGlobal('ResizeObserver', class { constructor(cb: () => void) { notify = cb; } observe() {} disconnect() {} });
    let width = 500;
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => width);
    const { container } = render(<BarChart data={[one('a', 1)]} />);
    expect(container.querySelector('svg')!.getAttribute('width')).toBe('500');
    width = 300;
    act(() => notify());
    expect(container.querySelector('svg')!.getAttribute('width')).toBe('300');
  });

  it('works without ResizeObserver and uses a default width before it can measure', () => {
    vi.stubGlobal('ResizeObserver', undefined);
    const { container } = render(<BarChart data={[one('a', 1)]} />);
    expect(container.querySelector('svg')!.getAttribute('width')).toBe('320');
  });

  it('keeps the chart left to right and out of the reading order', () => {
    const { container } = render(<BarChart data={[one('a', 1)]} />);
    expect(container.firstElementChild).toHaveAttribute('dir', 'ltr');
    expect(container.querySelector('svg')).toHaveAttribute('role', 'presentation');
  });
});

describe('PieChart', () => {
  it('draws one slice per item, in its colour, with its hover text', () => {
    const { container } = render(<PieChart slices={[
      { value: 1, color: 'red', title: 'one' }, { value: 3, color: 'blue', title: 'three' },
    ]} />);
    const paths = [...container.querySelectorAll('path')];
    expect(paths.map(p => p.getAttribute('fill'))).toEqual(['red', 'blue']);
    expect([...container.querySelectorAll('title')].map(t => t.textContent)).toEqual(['one', 'three']);
  });

  it('uses the large-arc flag only for a slice of more than half', () => {
    const { container } = render(<PieChart slices={[{ value: 1, color: 'a', title: 'a' }, { value: 3, color: 'b', title: 'b' }]} />);
    const [small, big] = [...container.querySelectorAll('path')].map(p => p.getAttribute('d')!);
    expect(small).toMatch(/A\S+ \S+ 0 0 1/);
    expect(big).toMatch(/A\S+ \S+ 0 1 1/);
  });

  it('draws a single slice as a full circle', () => {
    const { container } = render(<PieChart slices={[{ value: 5, color: 'gold', title: 'all' }]} />);
    expect(container.querySelector('path')).toBeNull();
    expect(container.querySelector('circle')).toHaveAttribute('fill', 'gold');
  });

  it('has its centre in the middle of its box and fits the size asked for', () => {
    const { container } = render(<PieChart slices={[{ value: 1, color: 'a', title: 'a' }, { value: 1, color: 'b', title: 'b' }]} size={200} />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('viewBox')).toBe('-100 -100 200 200');
    expect(svg.getAttribute('height')).toBe('200');
  });
});
