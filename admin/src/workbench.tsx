/**
 * The catalog workbench: the layout shared by the Units, Monsters, Bosses, Effects and Perks
 * pages. A rail lists every entry (search, filters, keyboard ↑/↓); the selected entry gets a
 * header and two columns: a tabbed preview (what the player sees, a live simulation, how it
 * compares) and the editor, where every field shows its saved value and can be reset.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useConfig } from "./config";
import { applyConfig, type GameConfig } from "../../shared/config.ts";
import "./workbench.css";

// ---------------------------------------------------------------- config helpers

/** Point the shared live tables at the draft, so simulations and summaries use it. */
export function useAppliedDraft() {
  const { draft } = useConfig();
  return useMemo(() => (draft ? (applyConfig(draft), draft) : null), [draft]);
}

/**
 * Run `fn` with the shared tables pointed at `cfg`, then put the draft back. Lets a page
 * measure the saved config and the draft side by side.
 */
export function withConfig<T>(cfg: GameConfig, draft: GameConfig, fn: () => T): T {
  applyConfig(cfg);
  try {
    return fn();
  } finally {
    applyConfig(draft);
  }
}

/** Remembered per browser: the selected entry and tab on each workbench page. */
export function useRemembered<T>(key: string, initial: T) {
  const full = `tower-rush-wb-${key}`;
  const [v, setV] = useState<T>(() => {
    try {
      const s = localStorage.getItem(full);
      return s === null ? initial : (JSON.parse(s) as T);
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(full, JSON.stringify(v));
    } catch {
      // Not remembered.
    }
  }, [full, v]);
  return [v, setV] as const;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Fields of `cur` that differ from `before` (all of them when there is no `before`). */
export function changedKeys<T extends object>(cur: T, before: T | undefined): string[] {
  if (!before) return ["(new)"];
  const keys = new Set([...Object.keys(cur), ...Object.keys(before)]);
  return [...keys].filter((k) => !same((cur as Record<string, unknown>)[k], (before as Record<string, unknown>)[k]));
}

// ---------------------------------------------------------------- formatting

export const fmt = (n: number | undefined) => (n === undefined ? "—" : String(Math.round(n * 1000) / 1000));

/** "+12%" / "−8%" between a saved and a draft number; null when equal or not comparable. */
export function deltaPct(before: number | undefined | null, after: number | undefined | null) {
  if (before == null || after == null || before === after) return null;
  if (before === 0) return after > 0 ? "new" : null;
  const p = ((after - before) / Math.abs(before)) * 100;
  if (Math.abs(p) < 0.5) return null;
  return `${p > 0 ? "+" : "−"}${Math.abs(p) < 10 ? Math.abs(p).toFixed(1) : Math.round(Math.abs(p))}%`;
}

/** A coloured change badge. `goodWhenUp` false flips the colours (e.g. monster HP). */
export function Delta({ before, after, goodWhenUp = true }: { before: number | undefined | null; after: number | undefined | null; goodWhenUp?: boolean }) {
  const d = deltaPct(before, after);
  if (!d) return null;
  const up = (after ?? 0) > (before ?? 0);
  return <span className={`delta ${up === goodWhenUp ? "up" : "down"}`}>{d}</span>;
}

// ---------------------------------------------------------------- rail

export interface RailItem {
  id: string;
  title: string;
  sub?: ReactNode;
  thumb?: string;
  /** Rarity or other tag used for the coloured edge. */
  tone?: string;
  changed?: boolean;
  off?: boolean;
  /** Extra text the search matches. */
  search?: string;
  /** Right-aligned figure (e.g. DPS). */
  figure?: ReactNode;
}

export function Rail({
  items,
  selected,
  onSelect,
  placeholder = "Search…",
  filters,
  footer,
}: {
  items: RailItem[];
  selected: string;
  onSelect: (id: string) => void;
  placeholder?: string;
  /** Filter controls shown under the search box. */
  filters?: ReactNode;
  footer?: ReactNode;
}) {
  const [q, setQ] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? items.filter((i) => `${i.title} ${i.id} ${i.search ?? ""}`.toLowerCase().includes(s)) : items;
  }, [items, q]);

  // Keep the selected row in view when it changes from the keyboard or the header arrows.
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(".rail-item.on")?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  const step = (d: 1 | -1) => {
    if (!shown.length) return;
    const i = shown.findIndex((x) => x.id === selected);
    onSelect(shown[Math.min(shown.length - 1, Math.max(0, i < 0 ? 0 : i + d))].id);
  };

  return (
    <aside className="rail" onKeyDown={(e) => {
      if (e.target instanceof HTMLInputElement && e.target.type !== "search") return;
      if (e.key === "ArrowDown") (e.preventDefault(), step(1));
      if (e.key === "ArrowUp") (e.preventDefault(), step(-1));
    }}>
      <div className="rail-top">
        <input type="search" className="rail-search" placeholder={placeholder} value={q} onChange={(e) => setQ(e.target.value)} />
        {filters}
        <div className="muted small">{shown.length} of {items.length} · ↑/↓ to move</div>
      </div>
      <div className="rail-list" ref={listRef} tabIndex={0}>
        {shown.map((i) => (
          <button key={i.id} type="button" className={`rail-item ${i.id === selected ? "on" : ""} ${i.off ? "off" : ""} ${i.tone ? `t-${i.tone}` : ""}`} onClick={() => onSelect(i.id)}>
            {i.thumb && <img className="thumb" crossOrigin="anonymous" src={i.thumb} width={34} height={34} alt="" loading="lazy" onError={(e) => ((e.target as HTMLImageElement).style.visibility = "hidden")} />}
            <span className="rail-text">
              <span className="rail-title">{i.title}</span>
              {i.sub && <span className="rail-sub">{i.sub}</span>}
            </span>
            {i.figure !== undefined && <span className="rail-fig">{i.figure}</span>}
            {i.changed && <span className="dot" title="Unsaved changes" />}
          </button>
        ))}
        {shown.length === 0 && <div className="muted small" style={{ padding: 12 }}>Nothing matches.</div>}
      </div>
      {footer && <div className="rail-foot">{footer}</div>}
    </aside>
  );
}

// ---------------------------------------------------------------- page frame

export function Workbench({ rail, children }: { rail: ReactNode; children: ReactNode }) {
  return (
    <div className="wb">
      {rail}
      <div className="wb-main">{children}</div>
    </div>
  );
}

/** Header over both columns: art, name, badges, prev/next and revert. */
export function EntryHead({
  thumb,
  title,
  sub,
  badges,
  changes,
  onRevert,
  onPrev,
  onNext,
  actions,
}: {
  thumb?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  badges?: ReactNode;
  /** Names of fields with unsaved changes. */
  changes: string[];
  onRevert?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  actions?: ReactNode;
}) {
  return (
    <div className="entry-head">
      {thumb}
      <div className="entry-title">
        <h1>
          {title} {badges}
        </h1>
        {sub && <div className="muted">{sub}</div>}
      </div>
      <span className="spacer" />
      {changes.length > 0 && (
        <span className="badge warn" title={changes.join(", ")}>
          {changes.length} unsaved {changes.length === 1 ? "change" : "changes"}
        </span>
      )}
      {onRevert && changes.length > 0 && (
        <button className="btn small ghost" onClick={onRevert} title="Put this entry back to the saved version">
          Revert
        </button>
      )}
      {actions}
      {(onPrev || onNext) && (
        <div className="seg small">
          <button onClick={onPrev} disabled={!onPrev} title="Previous (↑ in the list)">‹</button>
          <button onClick={onNext} disabled={!onNext} title="Next (↓ in the list)">›</button>
        </div>
      )}
    </div>
  );
}

/** The two columns under the header: the tabbed preview and the editor. */
export function Columns({ preview, editor }: { preview: ReactNode; editor: ReactNode }) {
  return (
    <div className="wb-cols">
      <div className="wb-preview">{preview}</div>
      <div className="wb-editor">{editor}</div>
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange, labels, right }: { tabs: readonly T[]; value: T; onChange: (t: T) => void; labels: Record<T, string>; right?: ReactNode }) {
  return (
    <div className="wb-tabs">
      {tabs.map((t) => (
        <button key={t} type="button" className={t === value ? "on" : ""} onClick={() => onChange(t)}>
          {labels[t]}
        </button>
      ))}
      <span className="spacer" />
      {right}
    </div>
  );
}

// ---------------------------------------------------------------- editor

/** A titled group of fields in the editor column. Collapsible; remembers nothing. */
export function Section({ title, hint, children, open = true, right }: { title: string; hint?: string; children: ReactNode; open?: boolean; right?: ReactNode }) {
  return (
    <details className="wb-section" open={open}>
      <summary>
        <span className="wb-section-title">{title}</span>
        {hint && <span className="muted small"> {hint}</span>}
        <span className="spacer" />
        {right}
      </summary>
      <div className="wb-section-body">{children}</div>
    </details>
  );
}

/**
 * One editable field: label and help on the left, the control on the right. When it differs
 * from the saved value it is highlighted, shows what was saved and offers a reset.
 */
export function Field({
  label,
  help,
  changed,
  saved,
  onReset,
  extra,
  children,
  wide,
}: {
  label: string;
  help?: ReactNode;
  changed?: boolean;
  /** The saved value, shown when changed. */
  saved?: ReactNode;
  onReset?: () => void;
  /** Shown after the control, e.g. a derived figure or a delta. */
  extra?: ReactNode;
  children: ReactNode;
  /** Control on its own line under the label (long text, chips). */
  wide?: boolean;
}) {
  return (
    <div className={`field ${changed ? "is-changed" : ""} ${wide ? "wide" : ""}`}>
      <div className="field-label">
        <span>{label}</span>
        {help && <span className="field-help">{help}</span>}
      </div>
      <div className="field-control">
        {children}
        {extra}
      </div>
      {changed && (
        <div className="field-saved">
          <span>saved: {saved ?? "—"}</span>
          {onReset && (
            <button type="button" className="linkish" onClick={onReset}>
              reset
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** A slider bound to a number input: quick to sweep, exact to type. */
export function SliderNum({ value, onChange, min, max, step }: { value: number; onChange: (v: number) => void; min: number; max: number; step: number }) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const commit = () => {
    const v = Number(text);
    if (text.trim() === "" || !Number.isFinite(v) || v < min) setText(String(value));
    else if (v !== value) onChange(v);
  };
  return (
    <span className="slider-num">
      <input type="range" min={min} max={Math.max(max, value)} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
      <input
        className="num"
        type="number"
        step={step}
        min={min}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      />
    </span>
  );
}

// ---------------------------------------------------------------- compare widgets

/** Saved vs draft figure with a delta badge. */
export function Versus({ label, before, after, format = fmt, goodWhenUp = true, sub }: { label: string; before: number | null | undefined; after: number | null | undefined; format?: (n: number) => string; goodWhenUp?: boolean; sub?: ReactNode }) {
  const differs = before != null && after != null && deltaPct(before, after) !== null;
  return (
    <div className="versus">
      <div className="stat-label">{label}</div>
      <div className="versus-row">
        <span className="stat-value">{after == null ? "—" : format(after)}</span>
        <Delta before={before} after={after} goodWhenUp={goodWhenUp} />
      </div>
      <div className="stat-sub">{differs ? <>saved {format(before!)}</> : (sub ?? "same as saved")}</div>
    </div>
  );
}

/**
 * Where a value sits among its peers: a strip with every peer as a tick, the median marked,
 * and a verdict when it is far from the middle.
 */
export function PeerMeter({
  value,
  saved,
  peers,
  label,
  higherIsStronger = true,
  format = fmt,
}: {
  value: number;
  saved?: number | null;
  peers: { id: string; name: string; value: number }[];
  label: string;
  higherIsStronger?: boolean;
  format?: (n: number) => string;
}) {
  const vals = peers.map((p) => p.value).filter((v) => Number.isFinite(v));
  if (vals.length === 0) return null;
  const sorted = [...vals].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] || 0;
  const lo = Math.min(...sorted, value, saved ?? value);
  const hi = Math.max(...sorted, value, saved ?? value);
  const x = (v: number) => (hi === lo ? 50 : ((v - lo) / (hi - lo)) * 100);
  const ratio = median > 0 ? value / median : 1;
  const strong = higherIsStronger ? ratio : 1 / ratio;
  const verdict =
    strong >= 1.35 ? { cls: "err", text: "Far above its peers: likely overpowered" } :
    strong >= 1.15 ? { cls: "warn", text: "Above its peers" } :
    strong <= 0.65 ? { cls: "err", text: "Far below its peers: likely underpowered" } :
    strong <= 0.85 ? { cls: "warn", text: "Below its peers" } :
    { cls: "ok", text: "In line with its peers" };
  const better = vals.filter((v) => (higherIsStronger ? v < value : v > value)).length;
  return (
    <div className="peer-meter">
      <div className="peer-meter-head">
        <span className="stat-label">{label}</span>
        <span className={`badge ${verdict.cls}`}>{verdict.text}</span>
      </div>
      <div className="peer-strip">
        {peers.map((p) => (
          <span key={p.id} className="peer-tick" style={{ left: `${x(p.value)}%` }} title={`${p.name}: ${format(p.value)}`} />
        ))}
        <span className="peer-median" style={{ left: `${x(median)}%` }} title={`Median ${format(median)}`} />
        {saved != null && saved !== value && <span className="peer-saved" style={{ left: `${x(saved)}%` }} title={`Saved ${format(saved)}`} />}
        <span className="peer-me" style={{ left: `${x(value)}%` }} title={`This one: ${format(value)}`} />
      </div>
      <div className="peer-foot muted small">
        <span>{format(lo)}</span>
        <span>
          {format(value)} · {Math.round(ratio * 100)}% of median {format(median)} · {higherIsStronger ? "stronger" : "weaker"} than {better} of {vals.length}
        </span>
        <span>{format(hi)}</span>
      </div>
    </div>
  );
}

/** Small horizontal bar list, e.g. a ranking. The highlighted row is the current entry. */
export function BarList({ rows, highlight, format = fmt, onPick }: { rows: { id: string; name: ReactNode; value: number; sub?: ReactNode }[]; highlight?: string; format?: (n: number) => string; onPick?: (id: string) => void }) {
  const max = Math.max(1e-9, ...rows.map((r) => r.value));
  return (
    <div className="rank-list">
      {rows.map((r, i) => (
        <button key={r.id} type="button" className={`rank-row ${r.id === highlight ? "on" : ""}`} onClick={() => onPick?.(r.id)} disabled={!onPick}>
          <span className="rank-n">{i + 1}</span>
          <span className="rank-name">{r.name}</span>
          <span className="rank-track">
            <span style={{ width: `${(100 * Math.max(0, r.value)) / max}%` }} />
          </span>
          <span className="rank-val">{format(r.value)}</span>
          {r.sub !== undefined && <span className="rank-sub muted small">{r.sub}</span>}
        </button>
      ))}
    </div>
  );
}

/** A tiny line chart of saved vs draft across a range (e.g. DPS by rank). */
export function MiniLines({ xs, series, format = fmt, xLabel }: { xs: (number | string)[]; series: { name: string; values: number[]; cls: string }[]; format?: (n: number) => string; xLabel?: string }) {
  const W = 320;
  const H = 120;
  const P = 22;
  const all = series.flatMap((s) => s.values).filter(Number.isFinite);
  const max = Math.max(1e-9, ...all);
  const px = (i: number) => P + (i * (W - P * 2)) / Math.max(1, xs.length - 1);
  const py = (v: number) => H - P - (v / max) * (H - P * 2);
  return (
    <div className="mini-lines">
      <svg viewBox={`0 0 ${W} ${H}`} role="img">
        <line x1={P} x2={W - P} y1={H - P} y2={H - P} className="axis" />
        {xs.map((x, i) => (
          <text key={i} x={px(i)} y={H - 6} className="tick" textAnchor="middle">{x}</text>
        ))}
        <text x={P} y={12} className="tick">{format(max)}</text>
        {series.map((s) => (
          <g key={s.name} className={s.cls}>
            <polyline fill="none" points={s.values.map((v, i) => `${px(i)},${py(v)}`).join(" ")} />
            {s.values.map((v, i) => (
              <circle key={i} cx={px(i)} cy={py(v)} r={2.6}>
                <title>{`${s.name} @ ${xs[i]}: ${format(v)}`}</title>
              </circle>
            ))}
          </g>
        ))}
      </svg>
      <div className="mini-legend small">
        {series.map((s) => (
          <span key={s.name} className={s.cls}><i /> {s.name}</span>
        ))}
        {xLabel && <span className="muted">{xLabel}</span>}
      </div>
    </div>
  );
}

/** Multi-line text that commits on blur, so typing doesn't re-run every preview. */
export function TextArea({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return <textarea value={text} placeholder={placeholder} onChange={(e) => setText(e.target.value)} onBlur={() => text !== value && onChange(text)} />;
}
