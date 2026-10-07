import { useConfig } from "../config";
import { Num, PageHead } from "../components";
import { PERKS } from "../../../shared/perks.ts";
import { DEFAULT_PERK_VALUES, KIT_PERKS, perkSummary, perkValueProblems, withPerkDefaults, type PerkValues } from "../../../shared/kit.ts";

export function PerksPage() {
  const { draft, saved, defaults, edit } = useConfig();
  if (!draft || !saved) return <div className="muted">Loading…</div>;
  const v = withPerkDefaults(draft.perks);
  const before = withPerkDefaults(saved.perks);
  const dflt = defaults ? withPerkDefaults(defaults.perks) : DEFAULT_PERK_VALUES;
  const problems = perkValueProblems(v);
  const set = (p: keyof PerkValues, k: "value" | "value2", n: number) =>
    edit((c) => {
      c.perks = withPerkDefaults(c.perks);
      (c.perks[p] as Record<string, number>)[k] = n;
    });
  const users = (p: string) => draft.units.filter((u) => u.perks?.some((s) => s.perk === p));

  return (
    <>
      <PageHead title="Perks" desc="Default numbers for every perk. A unit's perk can override them on the Units page; the default shown there comes from here." />
      {problems.map((p) => <div key={p} className="error">{p}</div>)}
      <div className="two-col">
        {KIT_PERKS.map((p) => {
          const cur = v[p];
          const old = before[p];
          const d = dflt[p];
          const using = users(p);
          const overridden = using.filter((u) => u.perks.find((s) => s.perk === p && (s.value !== undefined || s.value2 !== undefined)));
          return (
            <section className="panel" key={p}>
              <h2>{PERKS[p].label} <span className="muted small">· {p} · {using.length} units</span></h2>
              <p className="muted small">{PERKS[p].text}</p>
              <table className="kv">
                <tbody>
                  {(["value", "value2"] as const).map((k) =>
                    k === "value2" && d.value2 === undefined && cur.value2 === undefined ? null : (
                      <tr key={k} className={cur[k] !== old[k] ? "changed" : ""}>
                        <td>{k === "value" ? "Value" : "Value 2 (health threshold)"}<div className="id">{k}{d[k] !== cur[k] && ` · default ${d[k]}`}</div></td>
                        <td><Num value={cur[k] ?? 0} step={0.05} min={0} onChange={(n) => set(p, k, n)} /></td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
              <div className="effect-preview">{perkSummary({ perks: [{ perk: p }] }, v)[0]}</div>
              {overridden.length > 0 && <p className="muted small">Overridden by: {overridden.map((u) => u.name).join(", ")}</p>}
            </section>
          );
        })}
      </div>
    </>
  );
}
