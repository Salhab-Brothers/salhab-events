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

  it('pulls the last label in from the right edge when it would be cut off', () => {
    const { container } = render(<BarChart data={[one('أ', 1), one('ب', 1), one('ج', 1), one('د', 1), one('هـ', 1), one('كانون الأول 2027', 1)]} allLabels />);
    const texts = [...container.querySelectorAll('svg > g text')];
    const [first, last] = [texts[0], texts[5]];
    expect(first!.getAttribute('text-anchor')).toBe('middle');
    expect(last!.getAttribute('text-anchor')).toBe('end');
    expect(Number(last!.getAttribute('x'))).toBe(320);   // the right edge of a chart that is 320 wide
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

describe('BarChart geometry (a 320 x 200 chart: 28 left, 6 top and 26 bottom margin, so the bars stand on y 174)', () => {
  const path = (c: HTMLElement, i = 0, label?: string) => [...c.querySelectorAll(label ? `[data-bar="${label}"] path` : '[data-bar] path')][i]!.getAttribute('d');

  it('puts a single bar in the middle, 80 wide, from the axis to the top tick', () => {
    const { container } = render(<BarChart data={[one('a', 2)]} />);
    expect(path(container)).toBe('M134 174V10Q134 6 138 6H210Q214 6 214 10V174Z');
  });

  it('puts the y labels right-aligned at the axis, level with their ticks', () => {
    const { container } = render(<BarChart data={[one('a', 2)]} />);
    const ticks = [...container.querySelectorAll('svg > text')];
    expect(ticks.map(t => [t.textContent, t.getAttribute('x'), t.getAttribute('y'), t.getAttribute('text-anchor')])).toEqual([
      ['0', '22', '178', 'end'], ['1', '22', '94', 'end'], ['2', '22', '10', 'end'],
    ]);
    const axis = container.querySelector('line')!;
    expect([axis.getAttribute('x1'), axis.getAttribute('x2'), axis.getAttribute('y1'), axis.getAttribute('y2')]).toEqual(['28', '320', '174', '174']);
  });

  it('centres the label under the bar, near the bottom', () => {
    const { container } = render(<BarChart data={[one('a', 2)]} />);
    const label = container.querySelector('svg > g text')!;
    expect([label.getAttribute('x'), label.getAttribute('y'), label.getAttribute('text-anchor')]).toEqual(['174', '193', 'middle']);
  });

  it('spaces several bars evenly across the width', () => {
    const { container } = render(<BarChart data={[one('a', 2), one('b', 2)]} />);
    expect(path(container, 0, 'a')).toBe('M61 174V10Q61 6 65 6H137Q141 6 141 10V174Z');
    expect(path(container, 0, 'b')).toBe('M207 174V10Q207 6 211 6H283Q287 6 287 10V174Z');
  });

  it('makes bars narrower than 80 when there are many, leaving a gap between them', () => {
    const { container } = render(<BarChart data={Array.from({ length: 10 }, (_, i) => one(`m${i}`, 2))} />);
    expect(path(container, 0, 'm0')).toBe('M31.5 174V10Q31.5 6 35.5 6H49.7Q53.7 6 53.7 10V174Z');   // 29.2 wide band, 76% of it is bar
  });

  it('stacks one segment on the next, and rounds only the corners of the top one', () => {
    const { container } = render(<BarChart data={[{ label: 'm', segments: [
      { value: 1, color: 'a', title: 'a' }, { value: 1, color: 'b', title: 'b' },
    ] }]} />);
    expect(path(container, 0)).toBe('M134 174V90Q134 90 134 90H214Q214 90 214 90V174Z');
    expect(path(container, 1)).toBe('M134 90V10Q134 6 138 6H210Q214 6 214 10V90Z');
  });

  it('never rounds a corner by more than the bar is tall', () => {
    const { container } = render(<BarChart data={[one('a', 1), one('b', 100)]} />);
    expect(path(container, 0, 'a')).toBe('M61 174V174Q61 172.32 62.68 172.32H139.32Q141 172.32 141 174V174Z');
  });

  it('rounds a bar that is narrower than 8 wide by half its width at most', () => {
    const { container } = render(<BarChart data={Array.from({ length: 50 }, (_, i) => one(`m${i}`, 2))} />);
    expect(path(container, 0, 'm0')).toBe('M28.7 174V8.22Q28.7 6 30.92 6H30.92Q33.14 6 33.14 8.22V174Z');
  });

  it('pulls a label in from the right edge only when it would spill over it', () => {
    const at = (length: number) => {
      const { container, unmount } = render(<BarChart data={[one('ا'.repeat(length), 1)]} />);
      const label = container.querySelector('svg > g text')!;
      const out = [label.getAttribute('text-anchor'), label.getAttribute('x')];
      unmount();
      return out;
    };
    expect(at(37)).toEqual(['middle', '174']);   // 174 + 37 * 3.9 = 318 fits in 320
    expect(at(38)).toEqual(['end', '320']);      // 174 + 38 * 3.9 = 322 does not
  });

  it('starts watching the box it sits in, and stops when it goes away', () => {
    const observe = vi.fn();
    const disconnect = vi.fn();
    vi.stubGlobal('ResizeObserver', class { observe = observe; disconnect = disconnect; });
    const { container, unmount } = render(<BarChart data={[one('a', 1)]} />);
    expect(observe).toHaveBeenCalledWith(container.firstElementChild);
    expect(disconnect).not.toHaveBeenCalled();
    unmount();
    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});

describe('PieChart geometry (radius 75 in a 180 box)', () => {
  it('starts at the top and goes clockwise, a quarter turn per quarter of the total', () => {
    const { container } = render(<PieChart slices={[
      { value: 1, color: 'a', title: 'a' }, { value: 1, color: 'b', title: 'b' }, { value: 2, color: 'c', title: 'c' },
    ]} />);
    expect([...container.querySelectorAll('path')].map(p => p.getAttribute('d'))).toEqual([
      'M0 0L0 -75A75 75 0 0 1 75 0Z',
      'M0 0L75 0A75 75 0 0 1 0 75Z',
      'M0 0L0 75A75 75 0 0 1 0 -75Z',
    ]);
  });

  it('shrinks the pie with its box', () => {
    const { container } = render(<PieChart slices={[{ value: 1, color: 'a', title: 'a' }, { value: 3, color: 'b', title: 'b' }]} size={100} />);
    expect(container.querySelector('path')!.getAttribute('d')).toBe('M0 0L0 -35A35 35 0 0 1 35 0Z');
    expect(container.querySelector('path:nth-of-type(2)')!.getAttribute('d')).toBe('M0 0L35 0A35 35 0 1 1 0 -35Z');
  });

  it('sizes a full circle by the same radius', () => {
    const { container } = render(<PieChart slices={[{ value: 9, color: 'a', title: 'a' }]} />);
    expect(container.querySelector('circle')!.getAttribute('r')).toBe('75');
  });
});
