import { useConfig } from "../config";
import { Num, Text, Chips, PageHead } from "../components";
import { asset } from "../api";
import type { ArenaDef } from "../../../shared/arenas.ts";

export function ArenasPage() {
  const { draft, saved, edit } = useConfig();
  if (!draft || !saved) return <div className="muted">Loading…</div>;
  const set = <K extends keyof ArenaDef>(i: number, k: K, v: ArenaDef[K]) => edit((c) => void (c.arenas[i][k] = v));
  const monsterNames = Object.fromEntries(draft.monsters.map((m) => [m.id, m.name]));
  const bossNames = Object.fromEntries(draft.bosses.map((b) => [b.id, b.name]));
  const changed = (a: ArenaDef, k: keyof ArenaDef) => {
    const before = saved.arenas.find((s) => s.id === a.id);
    return !before || JSON.stringify(before[k]) !== JSON.stringify(a[k]) ? "changed" : "";
  };
  return (
    <>
      <PageHead
        title="Arenas"
        desc="Players unlock an arena once they have this many trophies. Each arena draws its waves from the monsters picked here; bosses take turns in the order listed."
      />
      <div className="cards">
        {draft.arenas.map((a, i) => (
          <div className="card arena" key={a.id}>
            <img className="arena-img" crossOrigin="anonymous" src={asset("locations", `arena_${a.id}`)} alt="" loading="lazy" />
            <div className="arena-body">
              <div className="row">
                <div className={changed(a, "name")} style={{ flex: 1 }}>
                  <label>Name</label>
                  <Text value={a.name} onChange={(v) => set(i, "name", v)} width="100%" />
                </div>
                <div className={changed(a, "trophies")}>
                  <label>Trophies</label>
                  <Num value={a.trophies} min={0} step={10} onChange={(v) => set(i, "trophies", v)} width={90} />
                </div>
              </div>
              <div className={changed(a, "monsters")}>
                <label>Monsters ({a.monsters.length})</label>
                <Chips value={a.monsters} options={draft.monsters.map((m) => m.id)} labels={monsterNames} onChange={(v) => set(i, "monsters", v)} />
              </div>
              <div className={changed(a, "bosses")}>
                <label>Bosses (in order)</label>
                <Chips value={a.bosses} options={draft.bosses.map((b) => b.id)} labels={bossNames} onChange={(v) => set(i, "bosses", v)} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
