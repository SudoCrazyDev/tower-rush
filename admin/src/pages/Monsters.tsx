import { useState } from "react";
import { useConfig } from "../config";
import { Num, Text, Select, Chips, Thumb, PageHead } from "../components";
import { asset } from "../api";
import { TRAITS, BOSS_POWERS, type MonsterDef, type BossDef } from "../../../shared/monsters.ts";

const TRAIT_HELP: Record<string, string> = {
  fast: "moves quickly",
  tank: "shows up more in later waves",
  armored: "takes 30% less damage",
  healer: "heals nearby monsters",
  splitter: "splits in two on death",
  rich: "bonus mana",
  dodge: "15% chance to dodge shots",
  frostproof: "immune to freeze and ice slows",
};

const POWER_HELP: Record<string, string> = {
  summon: "summons 3 minions",
  heal: "heals 8% of max HP",
  haste: "speeds up for 3s",
  shield: "immune to damage for 2.5s",
  freeze_units: "freezes 3 of the player's units",
  teleport: "jumps forward along the path",
};

export function MonstersPage() {
  const { draft, saved, edit } = useConfig();
  const [q, setQ] = useState("");
  if (!draft || !saved) return <div className="muted">Loading…</div>;
  const set = <K extends keyof MonsterDef>(i: number, k: K, v: MonsterDef[K]) => edit((c) => void (c.monsters[i][k] = v));
  const changed = (m: MonsterDef, k: keyof MonsterDef) => {
    const before = saved.monsters.find((s) => s.id === m.id);
    return !before || JSON.stringify(before[k]) !== JSON.stringify(m[k]) ? "changed" : "";
  };
  return (
    <>
      <PageHead
        title="Monsters"
        desc="HP is a multiplier on the wave's base HP (Economy → waves). Speed is pixels per second; the path is roughly 1,500px long."
      >
        <input className="search" placeholder="Search monsters…" value={q} onChange={(e) => setQ(e.target.value)} />
      </PageHead>
      <div className="table-wrap">
        <table className="grid">
          <thead>
            <tr>
              <th></th>
              <th>Name</th>
              <th>HP ×</th>
              <th>Speed</th>
              <th>Mana on kill</th>
              <th>Size px</th>
              <th>Traits</th>
            </tr>
          </thead>
          <tbody>
            {draft.monsters.map((m, i) =>
              (m.name + m.id).toLowerCase().includes(q.toLowerCase()) ? (
                <tr key={m.id}>
                  <td><Thumb src={asset("monsters", m.id)} /></td>
                  <td className={changed(m, "name")}>
                    <Text value={m.name} onChange={(v) => set(i, "name", v)} width={150} />
                    <div className="id">{m.id}</div>
                  </td>
                  <td className={changed(m, "hp")}><Num value={m.hp} step={0.1} min={0.01} onChange={(v) => set(i, "hp", v)} /></td>
                  <td className={changed(m, "speed")}><Num value={m.speed} step={5} min={0} onChange={(v) => set(i, "speed", v)} /></td>
                  <td className={changed(m, "mana")}><Num value={m.mana} min={0} onChange={(v) => set(i, "mana", v)} /></td>
                  <td className={changed(m, "size")}><Num value={m.size} min={20} onChange={(v) => set(i, "size", v)} /></td>
                  <td className={changed(m, "traits")}>
                    <Chips value={m.traits} options={TRAITS} onChange={(v) => set(i, "traits", v)} />
                  </td>
                </tr>
              ) : null,
            )}
          </tbody>
        </table>
      </div>
      <ul className="legend">
        {Object.entries(TRAIT_HELP).map(([k, v]) => (
          <li key={k}>
            <b>{k}</b> {v}
          </li>
        ))}
      </ul>
    </>
  );
}

export function BossesPage() {
  const { draft, saved, edit } = useConfig();
  if (!draft || !saved) return <div className="muted">Loading…</div>;
  const set = <K extends keyof BossDef>(i: number, k: K, v: BossDef[K]) => edit((c) => void (c.bosses[i][k] = v));
  const changed = (b: BossDef, k: keyof BossDef) => {
    const before = saved.bosses.find((s) => s.id === b.id);
    return !before || JSON.stringify(before[k]) !== JSON.stringify(b[k]) ? "changed" : "";
  };
  const monsterIds = draft.monsters.map((m) => m.id);
  const monsterNames = Object.fromEntries(draft.monsters.map((m) => [m.id, m.name]));
  return (
    <>
      <PageHead
        title="Bosses"
        desc="A boss shows up every few waves (Economy → bossEvery). Its HP = wave base HP × boss HP multiplier (Economy) × the value here. Bosses use their power every 6 seconds."
      />
      <div className="table-wrap">
        <table className="grid">
          <thead>
            <tr>
              <th></th>
              <th>Name</th>
              <th>HP ×</th>
              <th>Speed</th>
              <th>Power</th>
              <th>Minion (for summon)</th>
            </tr>
          </thead>
          <tbody>
            {draft.bosses.map((b, i) => (
              <tr key={b.id}>
                <td><Thumb src={asset("bosses", b.id)} size={48} /></td>
                <td className={changed(b, "name")}>
                  <Text value={b.name} onChange={(v) => set(i, "name", v)} width={180} />
                  <div className="id">{b.id}</div>
                </td>
                <td className={changed(b, "hp")}><Num value={b.hp} step={0.1} min={0.01} onChange={(v) => set(i, "hp", v)} /></td>
                <td className={changed(b, "speed")}><Num value={b.speed} step={2} min={0} onChange={(v) => set(i, "speed", v)} /></td>
                <td className={changed(b, "power")}>
                  <Select value={b.power} options={BOSS_POWERS} onChange={(v) => set(i, "power", v)} labels={Object.fromEntries(BOSS_POWERS.map((p) => [p, `${p} — ${POWER_HELP[p]}`]))} />
                </td>
                <td className={changed(b, "minion")}>
                  {b.power === "summon" ? (
                    <Select value={b.minion ?? monsterIds[0]} options={monsterIds} labels={monsterNames} onChange={(v) => set(i, "minion", v)} />
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
