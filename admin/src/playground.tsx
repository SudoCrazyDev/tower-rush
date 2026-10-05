/**
 * Shared pieces of the Playground page: remembered settings, the board editor, the
 * awakened-art lookup and a debounced simulation hook.
 */
import { useEffect, useState } from "react";
import { Modal, Select, Thumb } from "./components";
import { ASSETS, asset } from "./api";
import { ARCHETYPES, maxRank, RARITIES, STYLES, UNITS, UNIT_BY_ID, type UnitDef } from "../../shared/units.ts";
import { noAttack } from "../../shared/support.ts";
import { PERKS } from "../../shared/perks.ts";
import { ECONOMY } from "../../shared/economy.ts";
import { boardUnitStats, type BoardUnit, type SimSetup } from "../../shared/sim.ts";

// ---------------------------------------------------------------- settings

export interface PlaySettings {
  arena: string;
  wave: number;
  cardLevel: number;
  powerUp: number;
  runs: number;
  /** 15 tiles; `awakened` is filled in from the art when simulating. */
  board: (BoardUnit | null)[];
  // Units tab
  unit: string;
  rank: number;
  growthStart: number;
  // Bosses tab
  boss: string;
  escort: boolean;
  // Heroes tab
  hero: string;
  heroCharged: boolean;
}

const KEY = "tower-rush-playground";

function starterBoard(rank = 3): (BoardUnit | null)[] {
  const deck = ECONOMY.starterDeck.length ? ECONOMY.starterDeck : UNITS.slice(0, 5).map((u) => u.id);
  return Array.from({ length: 15 }, (_, i) => ({ id: deck[i % deck.length], rank }));
}

function defaults(): PlaySettings {
  return {
    arena: "meadow",
    wave: 10,
    cardLevel: 1,
    powerUp: 0,
    runs: 20,
    board: starterBoard(),
    unit: UNITS[0]?.id ?? "",
    rank: 1,
    growthStart: 0,
    boss: "treant_king",
    escort: true,
    hero: "young_king",
    heroCharged: true,
  };
}

/** Playground settings, remembered in this browser. */
export function usePlaySettings() {
  const [s, setS] = useState<PlaySettings>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? "null");
      if (saved && typeof saved === "object") return { ...defaults(), ...saved };
    } catch {
      // Fall back to defaults.
    }
    return defaults();
  });
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {
      // Not remembered.
    }
  }, [s]);
  const set = <K extends keyof PlaySettings>(k: K, v: PlaySettings[K]) => setS((p) => ({ ...p, [k]: v }));
  return [s, set] as const;
}

// ---------------------------------------------------------------- awakened art

let awakenable: Set<string> | null = null;
let awakenLoad: Promise<Set<string>> | null = null;

/** Unit ids with awakened art (they awaken at max rank), read from the game's asset index. */
export function useAwakenable() {
  const [set, setSet] = useState<Set<string>>(awakenable ?? new Set());
  useEffect(() => {
    awakenLoad ??= fetch(`${ASSETS}index.json`)
      .then((r) => r.json())
      .then((idx: { anims?: Record<string, string[]>; hazy?: string[] }) => {
        const hazy = new Set(idx.hazy ?? []);
        const ids = (idx.anims?.units_awakened ?? []).filter((n) => n.endsWith("_idle") && !hazy.has(`units_awakened/${n}`)).map((n) => n.slice(0, -5));
        return (awakenable = new Set(ids));
      })
      .catch(() => new Set<string>());
    awakenLoad.then(setSet);
  }, []);
  return set;
}

/** The board as the simulation wants it: unknown units dropped, awakening decided by the art. */
export function simBoard(board: (BoardUnit | null)[], canAwaken: Set<string>) {
  return Array.from({ length: 15 }, (_, i) => {
    const b = board[i];
    if (!b || !UNIT_BY_ID[b.id]) return null;
    return { id: b.id, rank: b.rank, awakened: b.rank >= maxRank() && canAwaken.has(b.id) };
  });
}

/** Rough board damage per second: every unit's damage × attack speed, with buff neighbours. */
export function boardDps(board: (BoardUnit | null)[], cardLevel: number, powerUp: number) {
  let total = 0;
  for (const b of board) {
    if (!b || !UNIT_BY_ID[b.id] || noAttack(UNIT_BY_ID[b.id].arch)) continue;
    const s = boardUnitStats(b, cardLevel, powerUp);
    total += s.damage * s.speed;
  }
  return total;
}

// ---------------------------------------------------------------- async compute

/**
 * Run `compute` shortly after its inputs settle (so typing doesn't run dozens of sims) and
 * keep showing the last result meanwhile.
 */
export function useSimulation<T>(compute: () => T, deps: unknown[], delay = 120) {
  const [value, setValue] = useState<T | null>(null);
  const [busy, setBusy] = useState(true);
  useEffect(() => {
    setBusy(true);
    const t = setTimeout(() => {
      try {
        setValue(compute());
      } finally {
        setBusy(false);
      }
    }, delay);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { value, busy };
}

/** A complete setup with sensible defaults. */
export function makeSetup(p: Partial<SimSetup> & Pick<SimSetup, "scenario" | "board">): SimSetup {
  return { arena: "meadow", cardLevel: 1, powerUp: 0, hero: null, seed: 1, ...p };
}

// ---------------------------------------------------------------- formatting

export const f0 = (v: number) => Math.round(v).toLocaleString();
export const f1 = (v: number) => (Math.abs(v) >= 100 ? f0(v) : v.toFixed(1));
export const pct = (v: number) => `${Math.round(v * 100)}%`;
export const secs = (v: number) => `${v.toFixed(1)}s`;
export const short = (v: number) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e4 ? `${(v / 1e3).toFixed(1)}k` : f0(v));

// ---------------------------------------------------------------- controls

/** Unit picker grouped by rarity. */
export function UnitSelect({ value, onChange, units }: { value: string; onChange: (id: string) => void; units: UnitDef[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {!value && <option value="">Choose a unit…</option>}
      {RARITIES.map((r) => (
        <optgroup key={r} label={r}>
          {units
            .filter((u) => u.rarity === r)
            .map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} · {u.arch}
                {u.enabled ? "" : " (off)"}
              </option>
            ))}
        </optgroup>
      ))}
    </select>
  );
}

export function RankPicker({ value, onChange }: { value: number; onChange: (r: number) => void }) {
  return (
    <div className="seg">
      {Array.from({ length: maxRank() }, (_, i) => i + 1).map((r) => (
        <button key={r} type="button" className={r === value ? "on" : ""} onClick={() => onChange(r)}>
          {r}
        </button>
      ))}
    </div>
  );
}

/** Number field with − / + steppers, clamped. */
export function Stepper({ value, onChange, min, max, step = 1 }: { value: number; onChange: (v: number) => void; min: number; max: number; step?: number }) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <div className="stepper">
      <button type="button" className="btn small ghost" onClick={() => onChange(clamp(value - step))} disabled={value <= min}>
        −
      </button>
      <input
        className="num"
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v)) onChange(clamp(v));
        }}
      />
      <button type="button" className="btn small ghost" onClick={() => onChange(clamp(value + step))} disabled={value >= max}>
        +
      </button>
    </div>
  );
}

// ---------------------------------------------------------------- board editor

export function BoardEditor({
  board,
  onChange,
  canAwaken,
  damage,
}: {
  board: (BoardUnit | null)[];
  onChange: (b: (BoardUnit | null)[]) => void;
  canAwaken: Set<string>;
  /** Optional damage dealt per tile in the last simulation, shown under each tile. */
  damage?: number[];
}) {
  const [editing, setEditing] = useState<number | null>(null);
  const [fillRank, setFillRank] = useState(3);
  const enabled = UNITS.filter((u) => u.enabled);
  const tiles = Array.from({ length: 15 }, (_, i) => board[i] ?? null);
  const totalDmg = damage?.reduce((a, b) => a + b, 0) ?? 0;

  const setTile = (i: number, v: BoardUnit | null) => onChange(tiles.map((t, j) => (j === i ? v : t)));
  const randomDeck = () => {
    const pool = [...enabled];
    const deck: string[] = [];
    while (deck.length < 5 && pool.length) deck.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0].id);
    onChange(Array.from({ length: 15 }, () => ({ id: deck[Math.floor(Math.random() * deck.length)], rank: fillRank })));
  };
  const shiftRanks = (d: number) => onChange(tiles.map((t) => (t ? { ...t, rank: Math.min(maxRank(), Math.max(1, t.rank + d)) } : t)));
  const edit = editing !== null ? tiles[editing] : null;

  return (
    <div>
      <div className="toolbar">
        <span className="muted small">Fill at rank</span>
        <Select value={String(fillRank) as "1"} options={["1", "2", "3", "4", "5", "6", "7"] as const} onChange={(v) => setFillRank(Number(v))} />
        <button className="btn small ghost" onClick={() => onChange(starterBoard(fillRank))}>Starter deck</button>
        <button className="btn small ghost" onClick={randomDeck}>Random deck</button>
        <button className="btn small ghost" onClick={() => onChange(Array(15).fill(null))}>Clear</button>
        <span className="spacer" />
        <button className="btn small ghost" onClick={() => shiftRanks(-1)}>Ranks −1</button>
        <button className="btn small ghost" onClick={() => shiftRanks(1)}>Ranks +1</button>
      </div>
      <div className="board">
        {tiles.map((t, i) => {
          const def = t ? UNIT_BY_ID[t.id] : null;
          const awakened = !!t && t.rank >= maxRank() && canAwaken.has(t.id);
          return (
            <button key={i} type="button" className={`tile ${def ? `r-${def.rarity}` : "empty"}`} onClick={() => setEditing(i)} title={def ? `${def.name} · rank ${t!.rank}` : "Empty tile"}>
              {def ? (
                <>
                  <Thumb src={asset(awakened ? "portraits_awakened" : "portraits", def.id)} size={46} />
                  <span className="tile-rank">{awakened ? "★" : ""}R{t!.rank}</span>
                  {damage && totalDmg > 0 && <span className="tile-dmg">{pct(damage[i] / totalDmg)}</span>}
                </>
              ) : (
                <span className="muted">+</span>
              )}
            </button>
          );
        })}
      </div>
      {editing !== null && (
        <Modal
          title={`Tile ${editing + 1}`}
          onClose={() => setEditing(null)}
          actions={
            <>
              {edit && (
                <button className="btn danger" onClick={() => (setTile(editing, null), setEditing(null))}>
                  Empty tile
                </button>
              )}
              <span className="spacer" />
              <button className="btn primary" onClick={() => setEditing(null)}>
                Done
              </button>
            </>
          }
        >
          <div className="form">
            <label>
              Unit
              <UnitSelect units={UNITS} value={edit?.id ?? ""} onChange={(id) => setTile(editing, { id, rank: edit?.rank ?? fillRank })} />
            </label>
            {!edit && <p className="muted small">Pick a unit to place it here.</p>}
            {edit && (
              <>
                <div>
                  <label>Merge rank</label>
                  <RankPicker value={edit.rank} onChange={(rank) => setTile(editing, { ...edit, rank })} />
                </div>
                <p className="muted small">
                  {ARCHETYPES[UNIT_BY_ID[edit.id]?.arch ?? "shot"].label}.{" "}
                  {UNIT_BY_ID[edit.id] && !noAttack(UNIT_BY_ID[edit.id].arch) && `${STYLES[UNIT_BY_ID[edit.id].style].label} style. `}
                  {UNIT_BY_ID[edit.id] && UNIT_BY_ID[edit.id].perk !== "none" && `${PERKS[UNIT_BY_ID[edit.id].perk].label}: ${PERKS[UNIT_BY_ID[edit.id].perk].text}. `}
                  {canAwaken.has(edit.id) ? `Awakens at rank ${maxRank()}.` : "No awakened art, so it doesn't awaken."}
                </p>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
