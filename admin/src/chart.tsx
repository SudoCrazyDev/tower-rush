/** A small SVG time chart (bars and/or lines over days) with a hover readout. No chart library. */
import { useEffect, useRef, useState } from "react";

export interface Series {
  label: string;
  color: string;
  kind: "bar" | "line";
  /** One value per x label; null leaves a gap. */
  values: (number | null)[];
}

const PAD = { top: 12, right: 12, bottom: 26, left: 44 };

/** Round axis steps: 1, 2, 5 x 10^n. */
function niceMax(max: number, ticks = 4) {
  if (max <= 0) return { top: ticks, step: 1 };
  const raw = max / ticks;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw)!;
  return { top: Math.ceil(max / step) * step, step };
}

const shortDay = (d: string) => {
  const [, m, day] = d.split("-");
  return `${Number(day)} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(m) - 1]}`;
};

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(600);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(240, Math.floor(e.contentRect.width))));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

export function TimeChart({ x, series, height = 220, format = (v) => v.toLocaleString(), tipPrefix = "" }: { x: string[]; series: Series[]; height?: number; format?: (v: number) => string; tipPrefix?: string }) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState<number | null>(null);
  const plotW = width - PAD.left - PAD.right;
  const plotH = height - PAD.top - PAD.bottom;
  const all = series.flatMap((s) => s.values.filter((v): v is number => v !== null));
  const { top, step } = niceMax(Math.max(0, ...all));
  const n = Math.max(1, x.length);
  const slot = plotW / n;
  const cx = (i: number) => PAD.left + slot * (i + 0.5);
  const cy = (v: number) => PAD.top + plotH - (v / top) * plotH;
  const bars = series.filter((s) => s.kind === "bar");
  const barW = Math.max(1, (slot * 0.75) / Math.max(1, bars.length));
  // Show about one x label per 70px.
  const every = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(plotW / 70))));

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.floor((e.clientX - r.left - PAD.left) / slot);
    setHover(i >= 0 && i < n ? i : null);
  };

  return (
    <div className="chart" ref={ref}>
      <svg width={width} height={height} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        {Array.from({ length: Math.round(top / step) + 1 }, (_, k) => k * step).map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={width - PAD.right} y1={cy(v)} y2={cy(v)} className="chart-grid" />
            <text x={PAD.left - 6} y={cy(v) + 4} textAnchor="end" className="chart-axis">
              {format(v)}
            </text>
          </g>
        ))}
        {x.map((d, i) =>
          i % every === 0 ? (
            <text key={d} x={cx(i)} y={height - 8} textAnchor="middle" className="chart-axis">
              {d.length === 10 ? shortDay(d) : d}
            </text>
          ) : null,
        )}
        {hover !== null && <rect x={PAD.left + slot * hover} y={PAD.top} width={slot} height={plotH} className="chart-hover" />}
        {bars.map((s, b) =>
          s.values.map((v, i) =>
            v ? <rect key={`${s.label}${i}`} x={cx(i) - (barW * bars.length) / 2 + b * barW} y={cy(v)} width={barW - 1} height={cy(0) - cy(v)} fill={s.color} rx={1.5} /> : null,
          ),
        )}
        {series
          .filter((s) => s.kind === "line")
          .map((s) => {
            // Break the line where there's no value.
            const parts: string[] = [];
            let path = "";
            s.values.forEach((v, i) => {
              if (v === null) {
                if (path) parts.push(path);
                path = "";
              } else path += `${path ? "L" : "M"}${cx(i).toFixed(1)},${cy(v).toFixed(1)}`;
            });
            if (path) parts.push(path);
            return (
              <g key={s.label}>
                {parts.map((p) => (
                  <path key={p} d={p} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" />
                ))}
                {s.values.map((v, i) => (v !== null && (n <= 40 || hover === i) ? <circle key={i} cx={cx(i)} cy={cy(v)} r={hover === i ? 4 : 2.5} fill={s.color} /> : null))}
              </g>
            );
          })}
      </svg>
      {hover !== null && (
        <div className="chart-tip" style={{ left: Math.min(cx(hover) + 12, width - 190) }}>
          <strong>{tipPrefix}{x[hover].length === 10 ? shortDay(x[hover]) : x[hover]}</strong>
          {series.map((s) => (
            <div key={s.label}>
              <span className="dot" style={{ background: s.color }} />
              {s.label}: <b>{s.values[hover] === null ? "—" : format(s.values[hover]!)}</b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Legend({ series }: { series: { label: string; color: string }[] }) {
  return (
    <div className="chart-legend">
      {series.map((s) => (
        <span key={s.label}>
          <span className="dot" style={{ background: s.color }} />
          {s.label}
        </span>
      ))}
    </div>
  );
}
