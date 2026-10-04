import { useConfig } from "../config";
import { Num, Text, Select, Toggle, Thumb, PageHead } from "../components";
import { asset } from "../api";
import { HERO_POWERS, HERO_POWER_IDS, heroAbilityText, type HeroDef } from "../../../shared/heroes.ts";
import { RACE_IDS, RACES } from "../../../shared/races.ts";

const RACE_LABELS = Object.fromEntries(RACE_IDS.map((r) => [r, RACES[r].label]));

const POWER_LABELS = Object.fromEntries(HERO_POWER_IDS.map((p) => [p, `${p} — ${HERO_POWERS[p].label}`]));

export function HeroesPage() {
  const { draft, saved, edit } = useConfig();
  if (!draft || !saved) return <div className="muted">Loading…</div>;
  const set = <K extends keyof HeroDef>(i: number, k: K, v: HeroDef[K]) => edit((c) => void (c.heroes[i][k] = v));
  const changed = (h: HeroDef, k: keyof HeroDef) => {
    const before = saved.heroes.find((s) => s.id === h.id);
    return !before || JSON.stringify(before[k]) !== JSON.stringify(h[k]) ? "changed" : "";
  };

  return (
    <>
      <PageHead
        title="Heroes"
        desc="Each player takes one hero into battle. Its ability is fired by the player and then recharges. Heroes with price 0 are owned by everyone; the rest are bought with gems once the player has enough trophies."
      />

      <div className="table-wrap">
        <table className="grid">
          <thead>
            <tr>
              <th></th>
              <th>Name</th>
              <th>Race</th>
              <th>Ability</th>
              <th>Power</th>
              <th title="Seconds between uses">Recharge (s)</th>
              <th>Amount</th>
              <th>Duration</th>
              <th>Price (gems)</th>
              <th>Trophies</th>
              <th>On</th>
              <th>Players see</th>
            </tr>
          </thead>
          <tbody>
            {draft.heroes.map((h, i) => {
              const meaning = HERO_POWERS[h.power] ?? { amount: "", duration: "" };
              return (
                <tr key={h.id} className={h.enabled ? "" : "disabled"}>
                  <td><Thumb src={asset("portraits_heroes", h.id)} size={48} /></td>
                  <td className={changed(h, "name")}>
                    <Text value={h.name} onChange={(v) => set(i, "name", v)} width={150} />
                    <div className="id">{h.id}</div>
                  </td>
                  <td className={changed(h, "race")}><Select value={h.race} options={RACE_IDS} labels={RACE_LABELS} onChange={(v) => set(i, "race", v)} /></td>
                  <td className={changed(h, "ability")}>
                    <Text value={h.ability} onChange={(v) => set(i, "ability", v)} width={140} />
                  </td>
                  <td className={changed(h, "power")}><Select value={h.power} options={HERO_POWER_IDS} labels={POWER_LABELS} onChange={(v) => set(i, "power", v)} /></td>
                  <td className={changed(h, "cooldown")}><Num value={h.cooldown} min={1} onChange={(v) => set(i, "cooldown", v)} /></td>
                  <td className={changed(h, "amount")} title={meaning.amount}>
                    <Num value={h.amount} min={0} step={0.05} onChange={(v) => set(i, "amount", v)} />
                    <div className="muted small">{meaning.amount}</div>
                  </td>
                  <td className={changed(h, "duration")} title={meaning.duration}>
                    <Num value={h.duration} min={0} step={0.5} onChange={(v) => set(i, "duration", v)} />
                    <div className="muted small">{meaning.duration}</div>
                  </td>
                  <td className={changed(h, "price")}><Num value={h.price} min={0} step={10} onChange={(v) => set(i, "price", v)} /></td>
                  <td className={changed(h, "trophies")}><Num value={h.trophies} min={0} step={50} onChange={(v) => set(i, "trophies", v)} /></td>
                  <td className={changed(h, "enabled")}><Toggle value={h.enabled} onChange={(v) => set(i, "enabled", v)} /></td>
                  <td className="muted small" style={{ maxWidth: 260 }}>{HERO_POWERS[h.power] ? heroAbilityText(h) : ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="muted small">
        "Normal-monster HPs" scale with the wave, so damage abilities stay useful late in a run. Turning a hero off hides it
        from the shop and players using it go back to the free hero; players who bought it keep it.
      </p>
    </>
  );
}
