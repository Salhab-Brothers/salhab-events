// Stryker disable StringLiteral: the font and colour names are the look of the charts, which the screenshots cover
import { useLayoutEffect, useRef, useState } from 'react';
import { labelStep, yTicks } from '@/lib/chartScale';

const FONT = "'Cairo Variable', sans-serif";
const MUTED = 'hsl(var(--muted-foreground))';
const LEFT = 28;     // room for the whole-number labels of the y axis
const BOTTOM = 26;   // room for the labels under the bars
const TOP = 6;

export interface Segment { value: number; color: string; title: string }
export interface BarDatum { label: string; segments: Segment[] }

/** The width the chart can use, measured from the box it sits in (a phone is narrower than a desktop). */
function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const box = ref.current;
    if (!box) return;
    const measure = () => setWidth(box.clientWidth);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, []);
  return [ref, width || 320] as const;   // 0 before the first layout (and in tests)
}

/** The label under a bar: centred on it, but pulled in so that it is not cut off at the right edge of the chart. */
function BarLabel({ text, centre, right, y }: { text: string; centre: number; right: number; y: number }) {
  const spills = centre + text.length * 0.3 * 13 > right;   // about half the width of the text, at the label size
  return <text x={spills ? right : centre} y={y} textAnchor={spills ? 'end' : 'middle'} fill={MUTED}>{text}</text>;
}

/** Two decimals are plenty for a screen, and keep the paths short and free of floating-point noise. */
const n = (v: number) => Math.round(v * 100) / 100;

/** A bar with rounded top corners, as a path. */
const roundedTop = (x: number, y: number, w: number, h: number, r: number) => {
  const c = Math.min(r, h, w / 2);
  return `M${n(x)} ${n(y + h)}V${n(y + c)}Q${n(x)} ${n(y)} ${n(x + c)} ${n(y)}H${n(x + w - c)}Q${n(x + w)} ${n(y)} ${n(x + w)} ${n(y + c)}V${n(y + h)}Z`;
};

/**
 * Bars (stacked when a bar has several segments) with a whole-number y axis. Each bar has a <title>, which
 * browsers show on hover. Charts are decoration for the page's text summary, so the caller hides them from screen readers.
 */
export function BarChart({ data, height = 200, labelSize = 13, allLabels = false, format = (l: string) => l }: {
  data: BarDatum[];
  height?: number;
  labelSize?: number;
  /** Show every label even if they would be crowded (the caller knows they fit). */
  allLabels?: boolean;
  format?: (label: string) => string;
}) {
  const [ref, width] = useWidth();
  const totals = data.map(d => d.segments.reduce((s, x) => s + x.value, 0));
  const ticks = yTicks(Math.max(0, ...totals));
  const top = ticks[ticks.length - 1] ?? 1;
  const plotW = width - LEFT;
  const plotH = height - TOP - BOTTOM;
  const band = plotW / Math.max(1, data.length);
  const barW = Math.min(band * 0.76, 80);
  const every = allLabels ? 1 : labelStep(data.map(d => format(d.label)), band, labelSize);
  const yOf = (v: number) => TOP + plotH - (v / top) * plotH;

  return (
    <div ref={ref} dir="ltr">
      <svg width={width} height={height} role="presentation" fontFamily={FONT} fontSize={labelSize}>
        {ticks.map(t => (
          <text key={t} x={LEFT - 6} y={yOf(t) + 4} textAnchor="end" fill={MUTED}>{t}</text>
        ))}
        <line x1={LEFT} x2={width} y1={yOf(0)} y2={yOf(0)} stroke={MUTED} strokeOpacity={0.4} />
        {data.map((d, i) => {
          const x = LEFT + band * i + (band - barW) / 2;
          let stacked = 0;
          const filled = d.segments.filter(s => s.value > 0);
          return (
            <g key={d.label} data-bar={d.label}>
              {filled.map((s, j) => {
                const y = yOf(stacked + s.value);
                const h = yOf(stacked) - y;
                stacked += s.value;
                const isTop = j === filled.length - 1;
                return (
                  <path key={j} d={roundedTop(x, y, barW, h, isTop ? 4 : 0)} fill={s.color}>
                    <title>{`${d.label}: ${s.title}`}</title>
                  </path>
                );
              })}
              {i % every === 0 && <BarLabel text={format(d.label)} centre={x + barW / 2} right={width} y={height - 7} />}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export interface Slice { value: number; color: string; title: string }

/** A pie chart, centred in the box and never wider than it. */
export function PieChart({ slices, size = 180 }: { slices: Slice[]; size?: number }) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const r = size / 2 - 15;
  const point = (turn: number): [number, number] => [n(r * Math.sin(turn * 2 * Math.PI)), n(-r * Math.cos(turn * 2 * Math.PI))];
  let done = 0;
  return (
    <svg viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`} width="100%" height={size} role="presentation">
      {slices.length === 1 && slices[0] ? (
        <circle r={r} fill={slices[0].color}><title>{slices[0].title}</title></circle>
      ) : slices.map((s, i) => {
        const from = done / total;
        done += s.value;
        const to = done / total;
        const [x1, y1] = point(from);
        const [x2, y2] = point(to);
        return (
          <path key={i} d={`M0 0L${x1} ${y1}A${r} ${r} 0 ${to - from > 0.5 ? 1 : 0} 1 ${x2} ${y2}Z`} fill={s.color}>
            <title>{s.title}</title>
          </path>
        );
      })}
    </svg>
  );
}
