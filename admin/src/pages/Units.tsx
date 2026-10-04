import { useMemo, useState } from "react";
import { useConfig } from "../config";
import { Num, Text, Select, Toggle, Thumb, PageHead } from "../components";
import { asset } from "../api";
import { ARCHETYPES, ARCHS, ELEMENTS, PROJECTILES, RARITIES, STYLES, STYLE_IDS, restyle, unitStats, type Rarity, type Style, type UnitDef } from "../../../shared/units.ts";
import { PERKS, PERK_IDS } from "../../../shared/perks.ts";
import { RACE_IDS, RACES } from "../../../shared/races.ts";

const RACE_LABELS = Object.fromEntries(RACE_IDS.map((r) => [r, RACES[r].label]));

const ARCH_LABELS = Object.fromEntries(ARCHS.map((a) => [a, `${a} — ${ARCHETYPES[a].label}`]));
const STYLE_LABELS = Object.fromEntries(STYLE_IDS.map((s) => [s, `${STYLES[s].label} — ${STYLES[s].text}`]));
const PERK_LABELS = Object.fromEntries(PERK_IDS.map((p) => [p, p === "none" ? "None" : `${PERKS[p].label} — ${PERKS[p].text}`]));

export function UnitsPage() {
  const { draft, saved, edit } = useConfig();
  const [q, setQ] = useState("");
  const [rarity, setRarity] = useState<Rarity | "all">("all");
  const [rank, setRank] = useState(1);

  const rows = useMemo(
    () =>
      (draft?.units ?? [])
        .map((u, i) => ({ u, i }))
        .filter(({ u }) => (rarity === "all" || u.rarity === rarity) && (u.name + u.id).toLowerCase().includes(q.toLowerCase())),
    [draft, q, rarity],
  );
  if (!draft || !saved) return <div className="muted">Loading…</div>;

  const set = <K extends keyof UnitDef>(i: number, k: K, v: UnitDef[K]) => edit((c) => void (c.units[i][k] = v));
  const changed = (u: UnitDef, k: keyof UnitDef) => {
    const before = saved.units.find((s) => s.id === u.id);
    return !before || JSON.stringify(before[k]) !== JSON.stringify(u[k]) ? "changed" : "";
  };
  // Switching style trades hit size for attack speed, keeping damage per second.
  const setStyle = (i: number, style: Style) =>
    edit((c) => {
      const u = c.units[i];
      Object.assign(u, restyle(u, u.style, style), { style });
    });
  const scaleAll = (field: "damage" | "speed", pct: number) =>
    edit((c) => {
      for (const { u } of rows) {
        const t = c.units.find((x) => x.id === u.id)!;
        t[field] = Math.round(t[field] * (1 + pct / 100) * 100) / 100;
      }
    });

  return (
    <>
      <PageHead title="Units" desc="Damage is per hit at rank 1, card level 1. Speed is attacks per second. Style trades hit size for speed; the perk counters a monster trait. Merge rank, card level and power-ups multiply these (see Economy).">
        <input className="search" placeholder="Search units…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={rarity} options={["all", ...RARITIES] as const} onChange={setRarity} />
      </PageHead>

      <div className="toolbar">
        <span className="muted">{rows.length} shown ·</span>
        <span className="muted">Bulk edit shown:</span>
        <button className="btn small ghost" onClick={() => scaleAll("damage", 10)}>Damage +10%</button>
        <button className="btn small ghost" onClick={() => scaleAll("damage", -10)}>Damage −10%</button>
        <button className="btn small ghost" onClick={() => scaleAll("speed", 10)}>Speed +10%</button>
        <button className="btn small ghost" onClick={() => scaleAll("speed", -10)}>Speed −10%</button>
        <span className="spacer" />
        <span className="muted">Preview DPS at rank</span>
        <Select value={String(rank) as "1"} options={["1", "2", "3", "4", "5", "6", "7"] as const} onChange={(v) => setRank(Number(v))} />
      </div>

      <div className="table-wrap">
        <table className="grid">
          <thead>
            <tr>
              <th></th>
              <th title="Awakened form, used at the max merge rank (Economy)">Awak.</th>
              <th>Name</th>
              <th>Rarity</th>
              <th>Element</th>
              <th>Race</th>
              <th>Archetype</th>
              <th title="Heavy: slow, big hits. Rapid: fast, light hits. Changing it rescales damage and speed">Style</th>
              <th title="Buff units hand their perk to the neighbours they buff">Perk</th>
              <th>Projectile</th>
              <th>Damage</th>
              <th>Speed</th>
              <th title="Damage × speed at the chosen rank, card level 1">DPS @R{rank}</th>
              <th>On</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ u, i }) => {
              const s = unitStats(u, rank, 1, 0);
              return (
                <tr key={u.id} className={u.enabled ? "" : "disabled"}>
                  <td><Thumb src={asset("portraits", u.id)} /></td>
                  <td><Thumb src={asset("portraits_awakened", u.id)} /></td>
                  <td className={changed(u, "name")}>
                    <Text value={u.name} onChange={(v) => set(i, "name", v)} width={150} />
                    <div className="id">{u.id}</div>
                  </td>
                  <td className={changed(u, "rarity")}><Select value={u.rarity} options={RARITIES} onChange={(v) => set(i, "rarity", v)} /></td>
                  <td className={changed(u, "element")}><Select value={u.element} options={ELEMENTS} onChange={(v) => set(i, "element", v)} /></td>
                  <td className={changed(u, "race")}><Select value={u.race} options={RACE_IDS} labels={RACE_LABELS} onChange={(v) => set(i, "race", v)} /></td>
                  <td className={changed(u, "arch")}><Select value={u.arch} options={ARCHS} onChange={(v) => set(i, "arch", v)} labels={ARCH_LABELS} /></td>
                  <td className={changed(u, "style")}><Select value={u.style} options={STYLE_IDS} labels={STYLE_LABELS} onChange={(v) => setStyle(i, v)} /></td>
                  <td className={changed(u, "perk")}><Select value={u.perk} options={PERK_IDS} labels={PERK_LABELS} onChange={(v) => set(i, "perk", v)} /></td>
                  <td className={changed(u, "proj")}><Select value={u.proj} options={PROJECTILES} onChange={(v) => set(i, "proj", v)} /></td>
                  <td className={changed(u, "damage")}><Num value={u.damage} step={0.5} min={0} onChange={(v) => set(i, "damage", v)} /></td>
                  <td className={changed(u, "speed")}><Num value={u.speed} step={0.05} min={0} onChange={(v) => set(i, "speed", v)} /></td>
                  <td className="num-cell">{u.arch === "buff" ? "—" : (s.damage * s.speed).toFixed(1)}</td>
                  <td className={changed(u, "enabled")}><Toggle value={u.enabled} onChange={(v) => set(i, "enabled", v)} /></td>
                  <td className={changed(u, "blurb")}><Text value={u.blurb} onChange={(v) => set(i, "blurb", v)} width={220} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="muted small">Units with an awakened portrait awaken when merged to the max rank (that and the numbers on the Economy page). Turning a unit off removes it from chests and decks; players keep their copies.</p>
    </>
  );
}
