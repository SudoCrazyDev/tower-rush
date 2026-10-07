import { useConfig } from "../config";
import { Num, PageHead } from "../components";
import { ARCHETYPES, RARITIES } from "../../../shared/units.ts";
import { EFFECT_ARCHS, EFFECT_FIELDS, EFFECT_LABELS, effectSummary, withEffectDefaults, type EffectArch, type EffectField } from "../../../shared/effects.ts";
import type { Arch } from "../../../shared/units.ts";

/** Effect blocks are archetypes, except the v1.2 Knight and Mercenary effects (EFFECT_LABELS). */
const isArch = (a: EffectArch): a is EffectArch & Arch => a in ARCHETYPES;

/** Ranks and rarities the preview shows: as summoned, mid-merge and fully merged. */
const PREVIEW: [number, number][] = [
  [1, 0],
  [4, 2],
  [7, 4],
];

export function EffectsPage() {
  const { draft, saved, defaults, edit } = useConfig();
  if (!draft || !saved) return <div className="muted">Loading…</div>;
  // A config saved before effects existed comes back filled in by the server; this covers a stale draft too.
  const e = withEffectDefaults(draft.effects);
  const before = withEffectDefaults(saved.effects);
  const set = (a: EffectArch, k: string, v: number) =>
    edit((c) => {
      c.effects = withEffectDefaults(c.effects);
      (c.effects[a] as Record<string, number>)[k] = v;
    });
  const usedBy = (a: EffectArch) => draft.units.filter((u) => u.kit?.some((s) => s.arch === a)).length;
  const overriddenBy = (a: EffectArch) =>
    draft.units.flatMap((u) => {
      const t = u.kit?.find((s) => s.arch === a)?.tune;
      return t && Object.keys(t).length ? [{ name: u.name, fields: Object.keys(t).join(", ") }] : [];
    });

  return (
    <>
      <PageHead
        title="Effects"
        desc="What each archetype's special effect does, shared by every unit with that archetype. Each unit's own damage and attack speed are on the Units page. Ranks go 1-7 (merges); rarity steps go common 0 to mythic 4."
      />
      <div className="two-col">
        {EFFECT_ARCHS.map((a) => {
          const fields = Object.entries(EFFECT_FIELDS[a]) as [string, EffectField][];
          const values = e[a] as Record<string, number>;
          const old = before[a] as Record<string, number>;
          const dflt = (defaults ? withEffectDefaults(defaults.effects)[a] : undefined) as Record<string, number> | undefined;
          return (
            <section className="panel" key={a}>
              <h2>
                {a} <span className="muted small">· {usedBy(a)} units</span>
              </h2>
              <p className="muted small">{isArch(a) ? ARCHETYPES[a].label : EFFECT_LABELS[a]}</p>
              {(() => {
                const ov = overriddenBy(a);
                return ov.length > 0 && <p className="muted small">Overridden by: {ov.map((o) => `${o.name} (${o.fields})`).join("; ")}</p>;
              })()}
              <table className="kv">
                <tbody>
                  {fields.map(([k, f]) => (
                    <tr key={k} className={values[k] !== old[k] ? "changed" : ""}>
                      <td>
                        {f.label}
                        <div className="id">
                          {k}
                          {dflt && dflt[k] !== values[k] && ` · default ${dflt[k]}`}
                        </div>
                      </td>
                      <td>
                        <Num value={values[k]} step={f.step} min={f.min ?? 0} onChange={(v) => set(a, k, f.int ? Math.round(v) : v)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {isArch(a) && effectSummary(a, 1, 0, e) && (
                <div className="effect-preview">
                  {PREVIEW.map(([rank, rarity]) => (
                    <div key={rank}>
                      <span className="muted">
                        Rank {rank}, <span className={`rarity ${RARITIES[rarity]}`}>{RARITIES[rarity]}</span>:
                      </span>{" "}
                      {isArch(a) && effectSummary(a, rank, rarity, e)}
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
