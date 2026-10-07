import { Num, Select } from "./components";
import { ARCHETYPES, type Arch, type UnitDef } from "../../shared/units.ts";
import { EFFECT_FIELDS, EFFECT_LABELS, withEffectDefaults, type Effects, type EffectField } from "../../shared/effects.ts";
import { PERKS } from "../../shared/perks.ts";
import { ARCH_KIND, DEFAULT_PERK_VALUES, KIT_ARCHS, KIT_PERKS, kitProblems, kitSummary, perkSummary, withPerkDefaults, type ArchSlot, type KitArch, type PerkSlot, type PerkValues } from "../../shared/kit.ts";

type PerkId = PerkSlot["perk"];

export const archLabel = (a: KitArch): string => (a in ARCHETYPES ? ARCHETYPES[a as keyof typeof ARCHETYPES].label : (EFFECT_LABELS[a] ?? a));
export const hasBlock = (a: KitArch) => a in EFFECT_FIELDS;
/** The unit's primary (first) archetype; "shot" for a unit with no kit yet. */
export const primaryArch = (u: Pick<UnitDef, "kit">): Arch => (u.kit?.[0]?.arch ?? "shot") as Arch;

const KIND_LABEL = { attack: "Attacks", rider: "Riders", signature: "Signatures", solo: "Solo" } as const;
const FIRST_OPTIONS = KIT_ARCHS.filter((a) => ARCH_KIND[a] === "attack" || ARCH_KIND[a] === "solo");
const ARCH_LABELS = Object.fromEntries(KIT_ARCHS.map((a) => [a, `${a} — ${archLabel(a)}`])) as Record<KitArch, string>;
const PERK_LABELS = Object.fromEntries(KIT_PERKS.map((p) => [p, `${PERKS[p].label} — ${PERKS[p].text}`])) as Record<PerkId, string>;

/** Archetypes that may be appended to this kit (valid for the next position, not already present). */
function addable(kit: ArchSlot[]): KitArch[] {
  if (!kit.length) return FIRST_OPTIONS;
  const first = kit[0].arch;
  if (ARCH_KIND[first] === "solo" && first !== "mana") return [];
  return KIT_ARCHS.filter((a) => (ARCH_KIND[a] === "rider" || ARCH_KIND[a] === "signature") && !kit.some((s) => s.arch === a));
}

const fmt = (n: number) => String(Math.round(n * 1e6) / 1e6);

/** Compact one-line text for the Units table cells. */
export const kitLine = (u: UnitDef) => (u.kit ?? []).map((s) => s.arch).join(" + ") || "(none)";
export const perksLine = (u: UnitDef) => (u.perks ?? []).map((p) => p.perk).join(", ") || "none";

export function KitEditor({
  unit,
  rank,
  effects,
  perkValues,
  onKit,
  onPerks,
}: {
  unit: UnitDef;
  rank: number;
  effects: Effects | undefined;
  perkValues: PerkValues | undefined;
  onKit: (kit: ArchSlot[]) => void;
  onPerks: (perks: PerkSlot[]) => void;
}) {
  const e = withEffectDefaults(effects);
  const pv = withPerkDefaults(perkValues);
  const kit = unit.kit ?? [];
  const perks = unit.perks ?? [];
  const problems = kitProblems({ kit, perks }, unit.name);
  const options = addable(kit);
  const usedPerks = KIT_PERKS.filter((p) => !perks.some((s) => s.perk === p));

  const setSlot = (i: number, fn: (s: ArchSlot) => ArchSlot) => onKit(kit.map((s, j) => (j === i ? fn(s) : s)));
  const setTune = (i: number, k: string, v: number | undefined) =>
    setSlot(i, (s) => {
      const tune = { ...s.tune };
      if (v === undefined) delete tune[k];
      else tune[k] = v;
      return Object.keys(tune).length ? { ...s, tune } : { arch: s.arch };
    });
  const move = (i: number, d: -1 | 1) => {
    const next = [...kit];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onKit(next);
  };
  const setPerk = (i: number, fn: (s: PerkSlot) => PerkSlot) => onPerks(perks.map((s, j) => (j === i ? fn(s) : s)));

  return (
    <div className="kit-editor">
      <div className="kit-cols">
        <div>
          <h3>Kit <span className="muted small">· first slot is how it attacks, then riders and signatures</span></h3>
          {kit.map((s, i) => {
            const fields = hasBlock(s.arch) ? (Object.entries(EFFECT_FIELDS[s.arch as keyof typeof EFFECT_FIELDS]) as [string, EffectField][]) : [];
            const base = (hasBlock(s.arch) ? e[s.arch as keyof Effects] : {}) as Record<string, number>;
            const tuned = s.tune ?? {};
            return (
              <details key={s.arch} className="kit-slot" open={i === 0 || undefined}>
                <summary>
                  <strong>{i + 1}. {s.arch}</strong> <span className="badge">{KIND_LABEL[ARCH_KIND[s.arch]]}</span>
                  {Object.keys(tuned).length > 0 && <span className="badge info">{Object.keys(tuned).length} tuned</span>}
                  <span className="muted small"> {archLabel(s.arch)}</span>
                </summary>
                <div className="kit-slot-body">
                  <div className="kit-slot-tools">
                    {i === 0 ? (
                      <Select value={s.arch} options={FIRST_OPTIONS} labels={ARCH_LABELS} onChange={(a) => onKit(kit.map((x, j) => (j === 0 ? { arch: a } : x)))} />
                    ) : (
                      <>
                        <button className="btn small ghost" disabled={i < 2} onClick={() => move(i, -1)} title="Earlier in the kit">↑</button>
                        <button className="btn small ghost" disabled={i === kit.length - 1} onClick={() => move(i, 1)} title="Later in the kit">↓</button>
                        <button className="btn small ghost" onClick={() => onKit(kit.filter((_, j) => j !== i))}>Remove</button>
                      </>
                    )}
                    {Object.keys(tuned).length > 0 && (
                      <button className="btn small ghost" onClick={() => setSlot(i, (x) => ({ arch: x.arch }))}>Reset all</button>
                    )}
                  </div>
                  {fields.length === 0 ? (
                    <p className="muted small">No numbers to tune.</p>
                  ) : (
                    <table className="kv">
                      <tbody>
                        {fields.map(([k, f]) => (
                          <tr key={k} className={tuned[k] !== undefined ? "changed" : ""}>
                            <td>
                              {f.label}
                              <div className="id">{k} · default {fmt(base[k])}</div>
                            </td>
                            <td>
                              <Num value={tuned[k] ?? base[k]} step={f.step} min={f.min ?? 0} onChange={(v) => setTune(i, k, f.int ? Math.round(v) : v)} />{" "}
                              <button className="btn small ghost" disabled={tuned[k] === undefined} onClick={() => setTune(i, k, undefined)} title="Use the default">reset</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </details>
            );
          })}
          {options.length > 0 ? (
            <div className="kit-add">
              <select value="" onChange={(ev) => ev.target.value && onKit([...kit, { arch: ev.target.value as KitArch }])}>
                <option value="">{kit.length ? "+ Add rider or signature…" : "+ Add attack or solo…"}</option>
                {options.map((a) => (
                  <option key={a} value={a}>
                    {a} ({KIND_LABEL[ARCH_KIND[a]]}) — {archLabel(a)}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            kit.length > 0 && <p className="muted small">This solo archetype takes nothing else.</p>
          )}
        </div>

        <div>
          <h3>Perks</h3>
          {perks.length === 0 && <p className="muted small">No perks.</p>}
          {perks.map((s, i) => {
            const d = DEFAULT_PERK_VALUES[s.perk];
            const dv = pv[s.perk] ?? d;
            const two = d?.value2 !== undefined;
            return (
              <div key={s.perk} className="kit-perk">
                <div className="kit-slot-tools">
                  <strong>{PERKS[s.perk]?.label ?? s.perk}</strong>
                  <span className="muted small">{PERKS[s.perk]?.text}</span>
                  <button className="btn small ghost" onClick={() => onPerks(perks.filter((_, j) => j !== i))}>Remove</button>
                </div>
                <table className="kv">
                  <tbody>
                    <tr className={s.value !== undefined ? "changed" : ""}>
                      <td>Value<div className="id">default {fmt(dv.value)}</div></td>
                      <td>
                        <Num value={s.value ?? dv.value} step={0.05} min={0} onChange={(v) => setPerk(i, (x) => ({ ...x, value: v }))} />{" "}
                        <button className="btn small ghost" disabled={s.value === undefined} onClick={() => setPerk(i, ({ value: _v, ...x }) => x)}>reset</button>
                      </td>
                    </tr>
                    {two && (
                      <tr className={s.value2 !== undefined ? "changed" : ""}>
                        <td>Value 2 (health threshold)<div className="id">default {fmt(dv.value2 ?? 0)}</div></td>
                        <td>
                          <Num value={s.value2 ?? dv.value2 ?? 0} step={0.05} min={0} onChange={(v) => setPerk(i, (x) => ({ ...x, value2: v }))} />{" "}
                          <button className="btn small ghost" disabled={s.value2 === undefined} onClick={() => setPerk(i, ({ value2: _v, ...x }) => x)}>reset</button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            );
          })}
          {usedPerks.length > 0 && (
            <div className="kit-add">
              <select value="" onChange={(ev) => ev.target.value && onPerks([...perks, { perk: ev.target.value as PerkId }])}>
                <option value="">+ Add perk…</option>
                {usedPerks.map((p) => (
                  <option key={p} value={p}>{PERK_LABELS[p]}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {problems.map((p) => (
        <div key={p} className="error">{p}</div>
      ))}
      <div className="effect-preview">
        <span className="muted">Rank {rank} summary:</span>
        {kitSummary(unit, rank, 1, e).map((l, i) => <div key={i}>{l}</div>)}
        {perkSummary(unit, pv).map((l, i) => <div key={"p" + i}>{l}</div>)}
      </div>
    </div>
  );
}
