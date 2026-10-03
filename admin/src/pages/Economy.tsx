import { useConfig } from "../config";
import { Num, NumList, Chips, PageHead } from "../components";
import { RARITIES } from "../../../shared/units.ts";
import type { Economy } from "../../../shared/economy.ts";

type NumKey = { [K in keyof Economy]: Economy[K] extends number ? K : never }[keyof Economy];
type ListKey = "powerUpCosts" | "upgradeCopies" | "upgradeCoins";

const GROUPS: { title: string; desc?: string; fields: [NumKey | ListKey, string, number?][] }[] = [
  {
    title: "Battle",
    fields: [
      ["startMana", "Mana at the start of a battle", 10],
      ["lives", "Lives (a boss leak costs all of them)", 1],
      ["summonCostStart", "First summon cost", 5],
      ["summonCostStep", "Summon cost increase per summon", 5],
      ["waveManaBase", "Mana bonus at each new wave", 5],
      ["waveManaPerWave", "…plus this × wave number", 1],
      ["powerUpCosts", "In-battle power-up costs (one per level)"],
      ["powerUpBonus", "Damage bonus per power-up level (0.15 = +15%)", 0.01],
      ["rankDamageStep", "Damage per merge rank (1 = rank 7 does 7×)", 0.1],
      ["rankSpeedStep", "Attack speed per merge rank (0.08 = +8%)", 0.01],
    ],
  },
  {
    title: "Awakening",
    desc: "A unit merged to rank 7 awakens (if it has awakened art): it gets these multipliers and fires an ultimate every few seconds, hitting every monster around its target with its own effect.",
    fields: [
      ["awakenDamageMult", "Damage multiplier when awakened", 0.05],
      ["awakenSpeedMult", "Attack speed multiplier when awakened", 0.05],
      ["ultimateCooldown", "Seconds between ultimates", 0.5],
      ["ultimateDamageMult", "Ultimate damage (× the unit's hit)", 0.25],
      ["ultimateRadius", "Ultimate radius in pixels", 10],
    ],
  },
  {
    title: "Waves & difficulty",
    desc: "Monster HP = waveHpBase × waveHpGrowth^(wave−1) × (1 + arena number × arenaHpStep) × monster HP multiplier.",
    fields: [
      ["waveHpBase", "Base HP at wave 1", 5],
      ["waveHpGrowth", "HP growth per wave (1.19 = +19%)", 0.01],
      ["arenaHpStep", "Extra HP per arena number", 0.01],
      ["waveSizeBase", "Monsters in wave 0", 1],
      ["waveSizePerWave", "Extra monsters per wave", 0.1],
      ["waveSizeMax", "Max monsters per wave", 1],
      ["spawnIntervalStart", "Seconds between spawns at wave 0", 0.05],
      ["spawnIntervalStep", "Spawn interval decrease per wave", 0.005],
      ["spawnIntervalMin", "Fastest spawn interval", 0.05],
      ["bossEvery", "Boss every N waves", 1],
      ["bossHpMult", "Boss HP multiplier", 1],
    ],
  },
  {
    title: "Card upgrades",
    desc: "Level N → N+1 needs upgradeCopies[N−1] copies and upgradeCoins[N−1] gold. Rarer cards need fewer copies and more gold.",
    fields: [
      ["levelBonus", "Damage per card level (0.08 = +8%)", 0.01],
      ["upgradeCopies", "Copies needed per level"],
      ["upgradeCoins", "Gold needed per level"],
      ["rarityCopyDiscount", "Fewer copies per rarity step", 0.1],
      ["rarityCoinMarkup", "More gold per rarity step", 0.1],
    ],
  },
  {
    title: "Battle rewards",
    desc: "Gold = wave × coinsPerWave × (1 + arena number × arenaCoinBonus) + bosses × coinsPerBoss. Trophies = wave × trophiesPerWave − trophyOffset (never below −trophyMaxLoss).",
    fields: [
      ["coinsPerWave", "Gold per wave reached", 1],
      ["arenaCoinBonus", "Extra gold per arena number", 0.01],
      ["coinsPerBoss", "Gold per boss killed", 5],
      ["gemsPerBoss", "Gems per boss killed", 1],
      ["trophiesPerWave", "Trophies per wave reached", 1],
      ["trophyOffset", "Trophies subtracted", 1],
      ["trophyMaxLoss", "Max trophies lost in one run", 1],
    ],
  },
  {
    title: "New players",
    fields: [
      ["startingCoins", "Starting gold", 10],
      ["startingGems", "Starting gems", 10],
    ],
  },
];

export function EconomyPage() {
  const { draft, saved, edit } = useConfig();
  if (!draft || !saved) return <div className="muted">Loading…</div>;
  const e = draft.economy;
  const names = Object.fromEntries(draft.units.map((u) => [u.id, u.name]));
  const unitIds = draft.units.map((u) => u.id);
  const changed = (k: keyof Economy) => (JSON.stringify(saved.economy[k]) !== JSON.stringify(e[k]) ? "changed" : "");

  return (
    <>
      <PageHead title="Economy" desc="Every number that isn't tied to a single unit, monster or arena." />
      <div className="two-col">
        {GROUPS.map((g) => (
          <section className="panel" key={g.title}>
            <h2>{g.title}</h2>
            {g.desc && <p className="muted small">{g.desc}</p>}
            <table className="kv">
              <tbody>
                {g.fields.map(([k, label, step]) => (
                  <tr key={k} className={changed(k)}>
                    <td>
                      {label}
                      <div className="id">{k}</div>
                    </td>
                    <td style={{ width: Array.isArray(e[k]) ? "55%" : undefined }}>
                      {Array.isArray(e[k]) ? (
                        <NumList value={e[k] as number[]} onChange={(v) => edit((c) => void ((c.economy[k as ListKey] as number[]) = v))} />
                      ) : (
                        <Num value={e[k] as number} step={step ?? 1} min={0} onChange={(v) => edit((c) => void ((c.economy[k as NumKey] as number) = v))} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
        <section className="panel">
          <h2>Upgrade cost preview</h2>
          <p className="muted small">Copies / gold for each level, by rarity.</p>
          <div className="table-wrap">
            <table className="grid compact">
              <thead>
                <tr>
                  <th>Lv</th>
                  {RARITIES.map((r) => (
                    <th key={r} className={`rarity ${r}`}>{r}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {e.upgradeCopies.map((copies, i) => (
                  <tr key={i}>
                    <td>{i + 1}→{i + 2}</td>
                    {RARITIES.map((r, ri) => (
                      <td key={r} className="num-cell">
                        {Math.max(1, Math.ceil(copies / (1 + ri * e.rarityCopyDiscount)))} / {Math.round((e.upgradeCoins[i] ?? 0) * (1 + ri * e.rarityCoinMarkup)).toLocaleString()}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="panel">
        <h2>Starter cards</h2>
        <div className={changed("starterDeck")}>
          <label>Starting deck (exactly 5)</label>
          <Chips value={e.starterDeck} options={unitIds} labels={names} onChange={(v) => edit((c) => void (c.economy.starterDeck = v))} />
        </div>
        <div className={changed("starterCards")} style={{ marginTop: 12 }}>
          <label>Cards new players own (must include the deck)</label>
          <Chips value={e.starterCards} options={unitIds} labels={names} onChange={(v) => edit((c) => void (c.economy.starterCards = v))} />
        </div>
      </section>
    </>
  );
}
