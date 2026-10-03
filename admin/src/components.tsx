import { useEffect, useState, type ReactNode } from "react";

/** Number input that lets you type freely and commits a valid number on blur/enter. */
export function Num({ value, onChange, step = 1, min, width = 80 }: { value: number; onChange: (v: number) => void; step?: number; min?: number; width?: number }) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const commit = () => {
    const v = Number(text);
    if (text.trim() === "" || !Number.isFinite(v) || (min !== undefined && v < min)) setText(String(value));
    else if (v !== value) onChange(v);
  };
  return (
    <input
      className="num"
      style={{ width }}
      type="number"
      step={step}
      min={min}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
    />
  );
}

export function Text({ value, onChange, width, placeholder }: { value: string; onChange: (v: string) => void; width?: number | string; placeholder?: string }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <input
      style={{ width }}
      value={text}
      placeholder={placeholder}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => text !== value && onChange(text)}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
    />
  );
}

export function Select<T extends string>({ value, options, onChange, labels }: { value: T; options: readonly T[]; onChange: (v: T) => void; labels?: Partial<Record<T, string>> }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as T)}>
      {options.map((o) => (
        <option key={o} value={o}>
          {labels?.[o] ?? o}
        </option>
      ))}
    </select>
  );
}

export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
      <span className="slider" />
      {label && <span>{label}</span>}
    </label>
  );
}

/** Pick several values from a list, shown as toggleable chips. */
export function Chips<T extends string>({ value, options, onChange, labels }: { value: T[]; options: readonly T[]; onChange: (v: T[]) => void; labels?: Partial<Record<T, string>> }) {
  return (
    <div className="chips">
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button key={o} type="button" className={on ? "chip on" : "chip"} onClick={() => onChange(on ? value.filter((v) => v !== o) : [...value, o])}>
            {labels?.[o] ?? o}
          </button>
        );
      })}
    </div>
  );
}

/** Number list edited as comma-separated text, e.g. power-up costs. */
export function NumList({ value, onChange }: { value: number[]; onChange: (v: number[]) => void }) {
  const [text, setText] = useState(value.join(", "));
  useEffect(() => setText(value.join(", ")), [value]);
  return (
    <input
      style={{ width: "100%" }}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        const nums = text.split(/[,\s]+/).filter(Boolean).map(Number);
        if (nums.every((n) => Number.isFinite(n) && n >= 0)) onChange(nums);
        else setText(value.join(", "));
      }}
    />
  );
}

export function Thumb({ src, size = 40 }: { src: string; size?: number }) {
  return <img className="thumb" src={src} width={size} height={size} alt="" loading="lazy" onError={(e) => ((e.target as HTMLImageElement).style.visibility = "hidden")} />;
}

export function Modal({ title, onClose, children, actions }: { title: string; onClose: () => void; children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {actions && <div className="modal-actions">{actions}</div>}
      </div>
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export function PageHead({ title, desc, children }: { title: string; desc?: string; children?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {desc && <p>{desc}</p>}
      </div>
      <div className="page-actions">{children}</div>
    </div>
  );
}

export const fmtDate = (ms: number | null | undefined) => (ms ? new Date(ms).toLocaleString() : "—");

export function timeAgo(ms: number) {
  const s = Math.round((Date.now() - ms) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/** Tiny global toast. */
let pushToast: (msg: string, kind?: "ok" | "err") => void = () => {};
export const toast = (msg: string, kind: "ok" | "err" = "ok") => pushToast(msg, kind);

export function Toasts() {
  const [items, setItems] = useState<{ id: number; msg: string; kind: string }[]>([]);
  useEffect(() => {
    pushToast = (msg, kind = "ok") => {
      const id = Math.random();
      setItems((l) => [...l, { id, msg, kind }]);
      setTimeout(() => setItems((l) => l.filter((x) => x.id !== id)), 3500);
    };
  }, []);
  return (
    <div className="toasts">
      {items.map((t) => (
        <div key={t.id} className={`toast ${t.kind}`}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}
