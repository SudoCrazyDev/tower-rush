/**
 * Playground: try units, bosses and heroes in a simulated battle (shared/sim.ts) with the
 * balance being edited, unpublished changes included. Nothing here is saved to the server.
 */
import { useMemo, useState } from "react";
import { useConfig } from "../config";
import { PageHead, Select, Stat, Thumb, Toggle } from "../components";
import { asset } from "../api";
import { TimeChart, Legend } from "../chart";
import { ArenaView } from "../arenaView";
import {
  BoardEditor,
  RankPicker,
  Stepper,
  UnitSelect,
  boardDps,
  f0,
  f1,
  makeSetup,
  pct,
  secs,
  short,
  simBoard,
  useAwakenable,
  usePlaySettings,
  useSimulation,
  starterDeck,
  type DeckPick,
  type PlaySettings,
} from "../playground";
import { applyConfig, type GameConfig } from "../../../shared/config.ts";
import { ARENAS, ARENA_BY_ID } from "../../../shared/arenas.ts";
import { ECONOMY } from "../../../shared/economy.ts";
import { EFFECTS, effectSummary } from "../../../shared/effects.ts";
import { HEROES, HERO_BY_ID, HERO_POWERS, heroAbilityText, type HeroDef } from "../../../shared/heroes.ts";
import { BOSSES, BOSS_BY_ID, MONSTER_BY_ID, type BossDef } from "../../../shared/monsters.ts";
import { ARCHETYPES, maxRank, RARITY_ORDER, STYLES, UNITS, UNIT_BY_ID, boostMult, deckable, maxCardLevel, maxPowerUp } from "../../../shared/units.ts";
import { PVP } from "../../../shared/pvp.ts";
import { deckProblem, runDecks, type DeckSide, type SideStats } from "../deckSim";
import { noAttack } from "../../../shared/support.ts";
import { PERKS } from "../../../shared/perks.ts";
import { arenaGeometry, boardUnitStats, bossAppearances, simulate, simulateMany, waveBaseHp, type SimSetup, type SimSummary } from "../../../shared/sim.ts";

type Tab = "units" | "bosses" | "heroes" | "deck";
type Setter = <K extends keyof PlaySettings>(k: K, v: PlaySettings[K]) => void;

export function PlaygroundPage() {
  const { draft, dirty } = useConfig();
  // The simulation reads the live tables, so point them at the draft being edited.
  const applied = useMemo(() => (draft ? (applyConfig(draft), draft) : null), [draft]);
  const [s, set] = usePlaySettings();
  const [tab, setTab] = useState<Tab>(() => (location.hash.split("/")[2] as Tab) || "units");
  if (!applied) return <div className="muted">Loading…</div>;

  const go = (t: Tab) => {
    setTab(t);
    history.replaceState(null, "", `#/playground/${t}`);
  };
  return (
    <>
      <PageHead
        title="Playground"
        desc="Test units, bosses, heroes and whole decks in a simulated battle. It uses the balance you're editing, unpublished changes included, so tweak a number on another page and come back to compare. Nothing here is saved."
      >
        <div className="seg">
          {(["units", "bosses", "heroes", "deck"] as const).map((t) => (
            <button key={t} className={tab === t ? "on" : ""} onClick={() => go(t)}>
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </PageHead>
      {dirty && <p className="note">Simulating your unpublished changes.</p>}
      {tab === "units" && <UnitsTab s={s} set={set} cfg={applied} />}
      {tab === "bosses" && <BossesTab s={s} set={set} cfg={applied} />}
      {tab === "heroes" && <HeroesTab s={s} set={set} cfg={applied} />}
      {tab === "deck" && <DeckTab s={s} set={set} cfg={applied} />}
    </>
  );
}

// ---------------------------------------------------------------- shared controls

function CommonControls({ s, set, wave = true }: { s: PlaySettings; set: Setter; wave?: boolean }) {
  return (
    <>
      <div>
        <label>Arena</label>
        <Select value={ARENA_BY_ID[s.arena] ? s.arena : ARENAS[0].id} options={ARENAS.map((a) => a.id)} labels={Object.fromEntries(ARENAS.map((a, i) => [a.id, `${i + 1}. ${a.name}`]))} onChange={(v) => set("arena", v)} />
      </div>
      {wave && (
        <div>
          <label>Wave</label>
          <Stepper value={s.wave} min={1} max={200} onChange={(v) => set("wave", v)} />
        </div>
      )}
      <div>
        <label>Card level</label>
        <Stepper value={Math.min(s.cardLevel, maxCardLevel())} min={1} max={maxCardLevel()} onChange={(v) => set("cardLevel", v)} />
      </div>
      <div>
        <label>Power-ups</label>
        <Stepper value={Math.min(s.powerUp, maxPowerUp())} min={0} max={maxPowerUp()} onChange={(v) => set("powerUp", v)} />
      </div>
    </>
  );
}

function RunsControl({ s, set }: { s: PlaySettings; set: Setter }) {
  return (
    <div>
      <label title="Each run has different luck (crits, dodges, which path monsters take...)">Runs</label>
      <Select value={String(s.runs) as "20"} options={["1", "5", "10", "20", "50", "100"] as const} onChange={(v) => set("runs", Number(v))} />
    </div>
  );
}

function arenaOf(s: PlaySettings) {
  return ARENA_BY_ID[s.arena] ?? ARENAS[0];
}

/** Bars of how much of the damage each board tile did. */
function DamageShare({ board, damage, kills }: { board: PlaySettings["board"]; damage: number[]; kills: number[] }) {
  const total = damage.reduce((a, b) => a + b, 0);
  const rows = damage
    .map((d, i) => ({ d, i, k: kills[i], b: board[i] }))
    .filter((r) => r.b && UNIT_BY_ID[r.b.id])
    .sort((a, b) => b.d - a.d);
  if (!rows.length) return <p className="muted small">No units on the board.</p>;
  return (
    <div>
      {rows.map(({ d, i, k, b }) => (
        <div key={i} className="bar-row share">
          <Thumb src={asset("portraits", b!.id)} size={24} />
          <span className="small">
            {UNIT_BY_ID[b!.id].name} <span className="muted">R{b!.rank}</span>
          </span>
          <div className="bar">
            <div style={{ width: `${total ? (100 * d) / total : 0}%` }} />
          </div>
          <span className="small num-cell" title={`${f0(d)} damage, ${f1(k)} kills`}>
            {pct(total ? d / total : 0)}
          </span>
        </div>
      ))}
    </div>
  );
}

function EventLog({ events }: { events: SimSummary["results"][number]["events"] }) {
  const list = events.filter((e) => e.kind !== "wave");
  if (!list.length) return <p className="muted small">Nothing notable happened.</p>;
  return (
    <div className="event-log">
      {list.slice(0, 60).map((e, i) => (
        <div key={i} className={`ev ${e.kind}`}>
          <span className="muted">{e.t.toFixed(1)}s</span> {e.text}
        </div>
      ))}
    </div>
  );
}

/** One sample per second for the charts. */
function perSecond<T extends { t: number }>(samples: T[]) {
  const out: T[] = [];
  let next = 0;
  for (const p of samples) {
    if (p.t >= next) {
      out.push(p);
      next = Math.floor(p.t) + 1;
    }
  }
  return out;
}

function Busy({ busy }: { busy: boolean }) {
  return busy ? <span className="badge info">Simulating…</span> : null;
}

// ---------------------------------------------------------------- units

const DUMMY_TIME = 30;
const PACK = 5;

function UnitsTab({ s, set, cfg }: { s: PlaySettings; set: Setter; cfg: GameConfig }) {
  const canAwaken = useAwakenable();
  const def = UNIT_BY_ID[s.unit] ?? UNITS[0];
  const arena = arenaOf(s);
  const awakened = s.rank >= maxRank() && canAwaken.has(def.id);
  const level = Math.min(s.cardLevel, maxCardLevel());
  const powerUp = Math.min(s.powerUp, maxPowerUp());
  const stats = boardUnitStats({ id: def.id, rank: s.rank, awakened }, level, powerUp);
  const rarityIdx = RARITY_ORDER.indexOf(def.rarity);
  const hp = waveBaseHp(arena, s.wave);
  const [watch, setWatch] = useState<"one" | "pack" | "wave">("pack");
  const [sort, setSort] = useState<"pack" | "one" | "raw" | "name">("pack");

  const dummySetup = (id: string, count: number, seed = 1): SimSetup => {
    const board = Array(15).fill(null);
    board[7] = { id, rank: s.rank, awakened: s.rank >= maxRank() && canAwaken.has(id) };
    return makeSetup({ arena: arena.id, board, cardLevel: level, powerUp, growthStart: s.growthStart, seed, scenario: { kind: "dummies", count, wave: s.wave, duration: DUMMY_TIME } });
  };
  const measure = (id: string, count: number, runs: number) => {
    let dmg = 0;
    let kills = 0;
    for (let i = 0; i < runs; i++) {
      const r = simulate(dummySetup(id, count, 1 + i));
      dmg += r.totalDamage;
      kills += r.kills;
    }
    return { dps: dmg / runs / DUMMY_TIME, kpm: ((kills / runs) * 60) / DUMMY_TIME };
  };

  const deps = [cfg, arena.id, s.wave, s.rank, level, powerUp, s.growthStart, canAwaken];
  const mine = useSimulation(() => ({ one: measure(def.id, 1, 5), pack: measure(def.id, PACK, 5) }), [...deps, def.id]);
  const all = useSimulation(
    () =>
      UNITS.map((u) => {
        const st = boardUnitStats({ id: u.id, rank: s.rank, awakened: s.rank >= maxRank() && canAwaken.has(u.id) }, level, powerUp);
        return { u, raw: noAttack(u.arch) ? 0 : st.damage * st.speed, one: measure(u.id, 1, 2), pack: measure(u.id, PACK, 2) };
      }),
    deps,
    250,
  );
  const rows = [...(all.value ?? [])].sort((a, b) =>
    sort === "name" ? a.u.name.localeCompare(b.u.name) : sort === "raw" ? b.raw - a.raw : sort === "one" ? b.one.dps - a.one.dps : b.pack.dps - a.pack.dps,
  );
  const best = rows.length ? Math.max(...rows.map((r) => Math.max(r.pack.dps, r.one.dps))) : 1;

  const watchSetup =
    watch === "wave"
      ? makeSetup({ arena: arena.id, board: simBoard(Array.from({ length: 15 }, () => ({ id: def.id, rank: s.rank })), canAwaken), cardLevel: level, powerUp, growthStart: s.growthStart, scenario: { kind: "wave", wave: s.wave } })
      : dummySetup(def.id, watch === "one" ? 1 : PACK);

  return (
    <>
      <div className="panel controls">
        <div>
          <label>Unit</label>
          <UnitSelect units={UNITS} value={def.id} onChange={(v) => set("unit", v)} />
        </div>
        <div>
          <label>Merge rank</label>
          <RankPicker value={s.rank} onChange={(v) => set("rank", v)} />
        </div>
        <CommonControls s={s} set={set} />
        <div>
          <label title="Growth units get stronger the longer they've been on the board">Growth head start (s)</label>
          <Stepper value={s.growthStart} min={0} max={600} step={10} onChange={(v) => set("growthStart", v)} />
        </div>
      </div>

      <div className="two-col">
        <div className="panel">
          <div className="unit-head">
            <Thumb src={asset(awakened ? "portraits_awakened" : "portraits", def.id)} size={84} />
            <div>
              <h2>
                {def.name} {awakened && <span className="badge ok">Awakened</span>} {!def.enabled && <span className="badge err">Off</span>}
              </h2>
              <div>
                <span className={`rarity ${def.rarity}`}>{def.rarity}</span> · {def.element} · <strong>{def.arch}</strong>
              </div>
              <div className="muted small">{ARCHETYPES[def.arch].label}</div>
            </div>
          </div>
          <table className="kv">
            <tbody>
              <tr><td>Damage per hit</td><td>{noAttack(def.arch) ? "—" : f1(stats.damage)}</td></tr>
              <tr><td>Attacks per second</td><td>{noAttack(def.arch) ? "—" : stats.speed.toFixed(2)}</td></tr>
              <tr><td>Damage per second (on paper)</td><td><strong>{noAttack(def.arch) ? "—" : f1(stats.damage * stats.speed)}</strong></td></tr>
              <tr><td>Effect</td><td>{effectSummary(def.arch, s.rank, rarityIdx, EFFECTS, boostMult(level, powerUp) * (awakened ? ECONOMY.awakenDamageMult : 1)) ?? "—"}</td></tr>
              <tr><td>Style</td><td>{noAttack(def.arch) ? "—" : `${STYLES[def.style].label} — ${STYLES[def.style].text}`}</td></tr>
              <tr><td>Perk</td><td>{def.perk === "none" ? "—" : `${noAttack(def.arch) ? "Neighbours get " : ""}${PERKS[def.perk].label}: ${PERKS[def.perk].text}`}</td></tr>
              {awakened && (
                <tr>
                  <td>Ultimate</td>
                  <td>
                    {def.arch === "mana"
                      ? `+${f0(cfg.effects.mana.ultimateBase + cfg.effects.mana.ultimatePerWave * s.wave)} mana`
                      : `${f0(stats.damage * ECONOMY.ultimateDamageMult)} in ${ECONOMY.ultimateRadius}px`}{" "}
                    every {ECONOMY.ultimateCooldown}s
                  </td>
                </tr>
              )}
              <tr><td>Normal monster on wave {s.wave}</td><td>{f0(hp)} HP</td></tr>
              {!noAttack(def.arch) && stats.damage > 0 && (
                <tr><td>Hits to kill one</td><td>{Math.ceil(hp / stats.damage)} ({secs(hp / (stats.damage * stats.speed))})</td></tr>
              )}
            </tbody>
          </table>

          <div className="panel-head" style={{ marginTop: 18 }}>
            <h2>Simulated over {DUMMY_TIME}s</h2>
            <Busy busy={mine.busy} />
          </div>
          {mine.value && (
            <div className="stats tight">
              <Stat label="1 target: damage/s" value={f1(mine.value.one.dps)} sub={`${f1(mine.value.one.kpm)} kills a minute`} />
              <Stat label={`Pack of ${PACK}: damage/s`} value={f1(mine.value.pack.dps)} sub={`${f1(mine.value.pack.kpm)} kills a minute`} />
            </div>
          )}
          <p className="muted small">
            Against training dummies that stand on the ring with a wave-{s.wave} monster's health and come back when killed, so overkill, crits, damage over time,
            splash, chains and executes all count. Slows, freezes and stuns don't help against dummies: watch a wave to see those.
          </p>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>Watch</h2>
            <div className="seg small">
              <button className={watch === "one" ? "on" : ""} onClick={() => setWatch("one")}>1 dummy</button>
              <button className={watch === "pack" ? "on" : ""} onClick={() => setWatch("pack")}>{PACK} dummies</button>
              <button className={watch === "wave" ? "on" : ""} onClick={() => setWatch("wave")} title="A full board of this unit against the real wave">Wave {s.wave}</button>
            </div>
          </div>
          <ArenaView setup={watchSetup} height={560} />
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>All units at rank {s.rank}, card level {level}{powerUp ? `, ${powerUp} power-ups` : ""}</h2>
          <Busy busy={all.busy} />
        </div>
        <div className="table-wrap">
          <table className="grid compact clickable">
            <thead>
              <tr>
                <th></th>
                <th className="sortable" onClick={() => setSort("name")}>Unit {sort === "name" && "▾"}</th>
                <th>Archetype</th>
                <th className="sortable num-cell" onClick={() => setSort("raw")} title="Damage × attack speed">On paper {sort === "raw" && "▾"}</th>
                <th className="sortable num-cell" onClick={() => setSort("one")}>1 target {sort === "one" && "▾"}</th>
                <th className="sortable num-cell" onClick={() => setSort("pack")}>Pack of {PACK} {sort === "pack" && "▾"}</th>
                <th style={{ width: "28%" }}></th>
                <th>Effect</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ u, raw, one, pack }) => (
                <tr key={u.id} className={`${u.id === def.id ? "selected" : ""} ${u.enabled ? "" : "disabled"}`} onClick={() => set("unit", u.id)}>
                  <td><Thumb src={asset("portraits", u.id)} size={30} /></td>
                  <td>
                    {u.name} <span className={`rarity ${u.rarity} small`}>{u.rarity}</span>
                  </td>
                  <td>{u.arch}</td>
                  <td className="num-cell">{noAttack(u.arch) ? "—" : f1(raw)}</td>
                  <td className="num-cell">{f1(one.dps)}</td>
                  <td className="num-cell"><strong>{f1(pack.dps)}</strong></td>
                  <td>
                    <div className="dual-bar">
                      <div style={{ width: `${(100 * pack.dps) / best}%` }} />
                      <div style={{ width: `${(100 * one.dps) / best}%` }} />
                    </div>
                  </td>
                  <td className="muted small">{effectSummary(u.arch, s.rank, RARITY_ORDER.indexOf(u.rarity)) ?? (noAttack(u.arch) ? "Speeds up neighbours" : "")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small">Damage per second against training dummies (2 runs each). Buff units don't attack: their value is the speed they give their neighbours. Click a row to inspect it.</p>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- bosses

const BOSS_POWER_TEXT: Record<BossDef["power"], string> = {
  summon: "Every 6s: calls 3 minions behind it (80% health)",
  heal: "Every 6s: heals 8% of its max health",
  haste: "Every 6s: runs 1.8× faster for 3s",
  shield: "Every 6s: blocks all damage for 2.5s",
  freeze_units: "Every 6s: freezes 3 random units for 3s",
  teleport: "Every 6s: jumps 160px ahead",
  charm: "Every 6s: a few units get Irritation (their attacks can miss)",
  roar: "Below half health: one roar stuns a few units, then it rages every 6s",
  split: "Each quarter of its health lost: 3 minions burst out",
  layers: "4 layers: each break stuns units, speeds it up and releases minions; the core gives every unit Irritation",
  portal: "Every 6s: opens a portal ahead that minions step out of; blinks forward each third of its health",
};

function BossesTab({ s, set, cfg }: { s: PlaySettings; set: Setter; cfg: GameConfig }) {
  const canAwaken = useAwakenable();
  const boss = BOSS_BY_ID[s.boss] ?? BOSSES[0];
  const arena = arenaOf(s);
  const level = Math.min(s.cardLevel, maxCardLevel());
  const powerUp = Math.min(s.powerUp, maxPowerUp());
  const board = simBoard(s.board, canAwaken);
  const geo = arenaGeometry(arena);
  const hpOf = (b: BossDef) => waveBaseHp(arena, s.wave) * ECONOMY.bossHpMult * b.hp;
  const walk = (b: BossDef) => 1.4 + geo.length / Math.max(1, b.speed);
  const hp = hpOf(boss);
  const dps = boardDps(board, level, powerUp);
  const hero = s.hero && HERO_BY_ID[s.hero] ? s.hero : null;
  const [withHero, setWithHero] = useState(false);

  const setupFor = (b: BossDef, seed = 1) =>
    makeSetup({ arena: arena.id, board, cardLevel: level, powerUp, hero: withHero ? hero : null, heroCharged: s.heroCharged, seed, scenario: { kind: "boss", boss: b.id, wave: s.wave, escort: s.escort } });
  const deps = [cfg, arena.id, s.wave, level, powerUp, JSON.stringify(board), s.escort, withHero, hero, s.heroCharged];
  const mine = useSimulation(() => simulateMany(setupFor(boss), s.runs), [...deps, boss.id, s.runs]);
  const all = useSimulation(() => BOSSES.map((b) => ({ b, r: simulateMany(setupFor(b), Math.min(s.runs, 10)) })), deps, 300);
  const sum = mine.value;
  const first = sum?.results[0];
  const timeline = first ? perSecond(first.timeline) : [];

  return (
    <>
      <div className="panel controls">
        <div>
          <label>Boss</label>
          <Select value={boss.id} options={BOSSES.map((b) => b.id)} labels={Object.fromEntries(BOSSES.map((b) => [b.id, b.name]))} onChange={(v) => set("boss", v)} />
        </div>
        <CommonControls s={s} set={set} />
        <div>
          <label>Escort</label>
          <Toggle value={s.escort} onChange={(v) => set("escort", v)} label={s.escort ? "With monsters" : "Boss alone"} />
        </div>
        <div>
          <label>Hero</label>
          <Toggle value={withHero} onChange={setWithHero} label={withHero && hero ? HERO_BY_ID[hero].name : "None"} />
        </div>
        <RunsControl s={s} set={set} />
      </div>

      <div className="two-col">
        <div className="panel">
          <div className="unit-head">
            <Thumb src={asset("bosses", boss.id)} size={84} />
            <div>
              <h2>{boss.name}</h2>
              <div>
                <strong>{boss.power}</strong>
                {boss.minion && ` (${MONSTER_BY_ID[boss.minion]?.name ?? boss.minion})`}
              </div>
              <div className="muted small">{BOSS_POWER_TEXT[boss.power]}</div>
            </div>
          </div>
          <table className="kv">
            <tbody>
              <tr><td>Health on wave {s.wave} in {arena.name}</td><td><strong>{f0(hp)}</strong></td></tr>
              <tr><td>Speed</td><td>{boss.speed}px/s</td></tr>
              <tr><td>Time to walk the whole path</td><td>{secs(walk(boss))} <span className="muted">(unslowed)</span></td></tr>
              <tr><td>Damage per second needed</td><td>{f0(hp / walk(boss))}</td></tr>
              <tr><td>Your board on paper</td><td className={dps * walk(boss) >= hp ? "good" : "bad"}>{f0(dps)}/s</td></tr>
              <tr>
                <td>Shows up</td>
                <td className="small">
                  {bossAppearances(boss.id).map(({ arena: a, wave }) => (
                    <button key={a.id} className="link" onClick={() => (set("arena", a.id), set("wave", wave))}>
                      {a.name} w{wave}
                    </button>
                  ))}
                  {!bossAppearances(boss.id).length && "In no arena"}
                </td>
              </tr>
            </tbody>
          </table>
          <h2 style={{ marginTop: 18 }}>Board</h2>
          <BoardEditor board={s.board} onChange={(b) => set("board", b)} canAwaken={canAwaken} damage={sum?.damageBySlot} />
          <p className="muted small">Units stay put for the whole fight: no summoning, merging or power-ups mid-fight.</p>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>Result over {s.runs} runs</h2>
            <Busy busy={mine.busy} />
          </div>
          {sum && (
            <>
              <div className="stats tight">
                <Stat label="Boss killed" value={pct(sum.bossKillRate ?? 0)} sub={sum.avgBossTime !== null ? `in ${secs(sum.avgBossTime)} on average` : "never"} />
                <Stat label="Health left" value={pct(sum.avgBossHpLeft ?? 0)} sub="when it reaches the gate (avg.)" />
                <Stat label="Lives lost" value={f1(sum.avgLivesLost)} sub={`of ${ECONOMY.lives} · ${f1(sum.avgLeaks)} got through`} />
                {boss.power === "shield" && <Stat label="Blocked by shield" value={short(sum.avgBlocked)} sub="damage per fight" />}
              </div>
              <h2>Boss health, run 1</h2>
              <TimeChart
                x={timeline.map((p) => `${Math.round(p.t)}s`)}
                series={[
                  { label: "Boss health %", color: "#e53935", kind: "line", values: timeline.map((p) => (p.boss === null ? null : Math.round(p.boss * 100))) },
                  { label: "Monsters on the field", color: "#3d8bff", kind: "bar", values: timeline.map((p) => p.alive) },
                ]}
                height={180}
              />
              <Legend series={[{ label: "Boss health %", color: "#e53935" }, { label: "Monsters on the field", color: "#3d8bff" }]} />
              <div className="two-inner">
                <div>
                  <h2>Damage share</h2>
                  <DamageShare board={board} damage={sum.damageBySlot} kills={sum.killsBySlot} />
                </div>
                <div>
                  <h2>Run 1</h2>
                  {first && <EventLog events={first.events} />}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="two-col">
        <div className="panel">
          <h2>Watch</h2>
          <ArenaView setup={setupFor(boss)} height={560} />
        </div>
        <div className="panel">
          <div className="panel-head">
            <h2>Every boss against this board</h2>
            <Busy busy={all.busy} />
          </div>
          <div className="table-wrap">
            <table className="grid compact clickable">
              <thead>
                <tr>
                  <th></th>
                  <th>Boss</th>
                  <th>Power</th>
                  <th className="num-cell">Health</th>
                  <th className="num-cell">Walk</th>
                  <th className="num-cell">Killed</th>
                  <th className="num-cell">Kill time</th>
                  <th className="num-cell">Health left</th>
                </tr>
              </thead>
              <tbody>
                {(all.value ?? []).map(({ b, r }) => (
                  <tr key={b.id} className={b.id === boss.id ? "selected" : ""} onClick={() => set("boss", b.id)}>
                    <td><Thumb src={asset("bosses", b.id)} size={30} /></td>
                    <td>{b.name}</td>
                    <td className="small">{b.power}</td>
                    <td className="num-cell">{short(hpOf(b))}</td>
                    <td className="num-cell">{secs(walk(b))}</td>
                    <td className={`num-cell ${(r.bossKillRate ?? 0) >= 0.9 ? "good" : (r.bossKillRate ?? 0) < 0.5 ? "bad" : ""}`}>{pct(r.bossKillRate ?? 0)}</td>
                    <td className="num-cell">{r.avgBossTime !== null ? secs(r.avgBossTime) : "—"}</td>
                    <td className="num-cell">{pct(r.avgBossHpLeft ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted small">Same arena, wave and board; up to 10 runs each. A boss that gets through costs every life.</p>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- heroes

function abilityNumbers(h: HeroDef, hpUnit: number, bossHp: number, pathLen: number, dps: number, wave: number): [string, string][] {
  const rows: [string, string][] = [];
  switch (h.power) {
    case "meteor":
      rows.push(["Damage to every monster", f0(h.amount * hpUnit)], ["= normal monsters' health", pct(h.amount)], ["= of a boss's health", pct((h.amount * hpUnit) / bossHp)]);
      break;
    case "storm": {
      const bolts = Math.round(h.duration * 4);
      rows.push(["Bolts", String(bolts)], ["Damage per bolt", f0(h.amount * hpUnit)], ["Total per cast", f0(bolts * h.amount * hpUnit)], ["= of a boss's health", pct((bolts * h.amount * hpUnit) / bossHp)]);
      break;
    }
    case "freeze":
      rows.push(["Frozen for", `${secs(h.duration)} (bosses ${secs(h.duration / 3)})`], ["Damage on cast", f0(h.amount * hpUnit)]);
      break;
    case "slow":
      rows.push(["Slow", `${pct(h.amount)} (bosses ${pct(h.amount / 2)})`], ["For", secs(h.duration)]);
      break;
    case "mana":
      rows.push(["Mana per cast", f0(Math.round(h.amount * (1 + 0.1 * wave)))]);
      break;
    case "haste":
    case "rage":
      rows.push(["Board bonus", `+${pct(h.amount)} ${h.power === "haste" ? "attack speed" : "damage"} for ${secs(h.duration)}`], ["≈ extra damage per cast", f0(dps * h.amount * h.duration)]);
      break;
    case "knockback":
      rows.push(["Pushed back", `${f0(h.amount)}px = ${pct(h.amount / pathLen)} of the path (bosses a third)`], ["Then stunned for", secs(h.duration)]);
      break;
  }
  rows.push(["Recharge", `${secs(h.cooldown)} · ${(60 / h.cooldown).toFixed(1)} casts a minute`]);
  if (h.duration > 0 && h.power !== "knockback") rows.push(["Uptime", pct(Math.min(1, h.duration / h.cooldown))]);
  return rows;
}

function HeroesTab({ s, set, cfg }: { s: PlaySettings; set: Setter; cfg: GameConfig }) {
  const canAwaken = useAwakenable();
  const hero = HERO_BY_ID[s.hero] ?? HEROES[0];
  const arena = arenaOf(s);
  const level = Math.min(s.cardLevel, maxCardLevel());
  const powerUp = Math.min(s.powerUp, maxPowerUp());
  const board = simBoard(s.board, canAwaken);
  const geo = arenaGeometry(arena);
  const hpUnit = waveBaseHp(arena, Math.max(1, s.wave));
  const dps = boardDps(board, level, powerUp);
  const bossWave = s.wave % ECONOMY.bossEvery === 0;
  const waveBoss = bossWave ? BOSS_BY_ID[arena.bosses[(s.wave / ECONOMY.bossEvery - 1) % arena.bosses.length]] : null;
  const bossHp = hpUnit * ECONOMY.bossHpMult * (waveBoss?.hp ?? 1);

  const setupFor = (h: string | null, seed = 1) =>
    makeSetup({ arena: arena.id, board, cardLevel: level, powerUp, hero: h, heroCharged: s.heroCharged, seed, scenario: { kind: "wave", wave: s.wave } });
  const deps = [cfg, arena.id, s.wave, level, powerUp, JSON.stringify(board), s.heroCharged];
  const mine = useSimulation(() => ({ on: simulateMany(setupFor(hero.id), s.runs), off: simulateMany(setupFor(null), s.runs) }), [...deps, hero.id, s.runs]);
  const all = useSimulation(
    () => [{ h: null as HeroDef | null, r: simulateMany(setupFor(null), Math.min(s.runs, 10)) }, ...HEROES.map((h) => ({ h, r: simulateMany(setupFor(h.id), Math.min(s.runs, 10)) }))],
    deps,
    300,
  );
  const on = mine.value?.on;
  const off = mine.value?.off;
  const tOn = on ? perSecond(on.results[0].timeline) : [];
  const tOff = off ? perSecond(off.results[0].timeline) : [];
  const len = Math.max(tOn.length, tOff.length);

  type Row = [string, (r: SimSummary) => number, (v: number) => string, boolean];
  const cmp: Row[] = [
    ["Cleared", (r) => r.clearRate, pct, true],
    ["No leaks", (r) => r.perfectRate, pct, true],
    ["Got through", (r) => r.avgLeaks, f1, false],
    ["Lives lost", (r) => r.avgLivesLost, f1, false],
    ["Time to clear", (r) => r.avgTime, secs, false],
    ["Hero casts", (r) => r.avgHeroCasts, f1, true],
    ["Hero damage", (r) => r.avgHeroDamage, short, true],
    ["Mana gained", (r) => r.avgMana, f0, true],
  ];
  if (bossWave) cmp.splice(5, 0, ["Boss killed", (r) => r.bossKillRate ?? 0, pct, true]);

  return (
    <>
      <div className="panel controls">
        <div>
          <label>Hero</label>
          <Select value={hero.id} options={HEROES.map((h) => h.id)} labels={Object.fromEntries(HEROES.map((h) => [h.id, `${h.name} · ${h.power}`]))} onChange={(v) => set("hero", v)} />
        </div>
        <CommonControls s={s} set={set} />
        <div>
          <label>First cast</label>
          <Toggle value={s.heroCharged} onChange={(v) => set("heroCharged", v)} label={s.heroCharged ? "Ready at start" : `After ${secs(hero.cooldown * 0.4)}`} />
        </div>
        <RunsControl s={s} set={set} />
      </div>

      <div className="two-col">
        <div className="panel">
          <div className="unit-head">
            <Thumb src={asset("portraits_heroes", hero.id)} size={84} />
            <div>
              <h2>
                {hero.name} {!hero.enabled && <span className="badge err">Off</span>}
              </h2>
              <div>
                <strong>{hero.ability}</strong> · {hero.power}
              </div>
              <div className="muted small">{heroAbilityText(hero)}</div>
            </div>
          </div>
          <table className="kv">
            <tbody>
              {abilityNumbers(hero, hpUnit, bossHp, geo.length, dps, s.wave).map(([k, v]) => (
                <tr key={k}><td>{k}</td><td>{v}</td></tr>
              ))}
              <tr><td className="muted">Normal monster on wave {s.wave}</td><td className="muted">{f0(hpUnit)} HP</td></tr>
            </tbody>
          </table>
          <p className="muted small">{HERO_POWERS[hero.power].amount}. Casts itself whenever it's ready and there's something to hit, like auto-cast in battle.</p>
          <h2 style={{ marginTop: 18 }}>Board</h2>
          <BoardEditor board={s.board} onChange={(b) => set("board", b)} canAwaken={canAwaken} damage={on?.damageBySlot} />
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>
              Wave {s.wave}
              {waveBoss && ` (boss: ${waveBoss.name})`}, with and without {hero.name}
            </h2>
            <Busy busy={mine.busy} />
          </div>
          {on && off && (
            <>
              <table className="grid compact">
                <thead>
                  <tr>
                    <th></th>
                    <th className="num-cell">No hero</th>
                    <th className="num-cell">{hero.name}</th>
                    <th className="num-cell">Difference</th>
                  </tr>
                </thead>
                <tbody>
                  {cmp.map(([label, get, fmt, higherBetter]) => {
                    const a = get(off);
                    const b = get(on);
                    const d = b - a;
                    const better = Math.abs(d) < 1e-9 ? "" : d > 0 === higherBetter ? "good" : "bad";
                    return (
                      <tr key={label}>
                        <td>{label}</td>
                        <td className="num-cell">{fmt(a)}</td>
                        <td className="num-cell"><strong>{fmt(b)}</strong></td>
                        <td className={`num-cell ${better}`}>{Math.abs(d) < 1e-9 ? "—" : `${d > 0 ? "+" : "−"}${fmt(Math.abs(d))}`}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="muted small">
                Hero share of all damage: <strong>{pct(on.avgDamage ? on.avgHeroDamage / on.avgDamage : 0)}</strong>. Board on paper: {f0(dps)}/s.
              </p>
              <h2 style={{ marginTop: 14 }}>Monsters on the field, run 1</h2>
              <TimeChart
                x={Array.from({ length: len }, (_, i) => `${i}s`)}
                series={[
                  { label: "No hero", color: "#8a93a8", kind: "line", values: Array.from({ length: len }, (_, i) => tOff[i]?.alive ?? null) },
                  { label: hero.name, color: "#f2b630", kind: "line", values: Array.from({ length: len }, (_, i) => tOn[i]?.alive ?? null) },
                ]}
                height={180}
              />
              <Legend series={[{ label: "No hero", color: "#8a93a8" }, { label: hero.name, color: "#f2b630" }]} />
            </>
          )}
        </div>
      </div>

      <div className="two-col">
        <div className="panel">
          <h2>Watch</h2>
          <ArenaView setup={setupFor(hero.id)} height={560} />
        </div>
        <div className="panel">
          <div className="panel-head">
            <h2>Every hero on this wave</h2>
            <Busy busy={all.busy} />
          </div>
          <div className="table-wrap">
            <table className="grid compact clickable">
              <thead>
                <tr>
                  <th></th>
                  <th>Hero</th>
                  <th className="num-cell">Cleared</th>
                  <th className="num-cell">Got through</th>
                  <th className="num-cell">Time</th>
                  <th className="num-cell">Hero damage</th>
                  <th className="num-cell">Mana</th>
                </tr>
              </thead>
              <tbody>
                {(all.value ?? []).map(({ h, r }) => (
                  <tr key={h?.id ?? "none"} className={h?.id === hero.id ? "selected" : h ? "" : "baseline"} onClick={() => h && set("hero", h.id)}>
                    <td>{h && <Thumb src={asset("portraits_heroes", h.id)} size={30} />}</td>
                    <td>{h ? `${h.name} · ${h.power}` : "No hero"}</td>
                    <td className="num-cell">{pct(r.clearRate)}</td>
                    <td className="num-cell">{f1(r.avgLeaks)}</td>
                    <td className="num-cell">{secs(r.avgTime)}</td>
                    <td className="num-cell">{h ? `${short(r.avgHeroDamage)} (${pct(r.avgDamage ? r.avgHeroDamage / r.avgDamage : 0)})` : "—"}</td>
                    <td className="num-cell">{f0(r.avgMana)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted small">Same arena, wave and board; up to 10 runs each. Mana heroes don't change the fight here because the board can't grow mid-fight; their value is the mana column.</p>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------- deck tab

const SIDE_COLORS = ["#f2b630", "#5aa9ff"];
const DECK_RUNS = 50;

function DeckPicker({ title, color, pick, onChange, problem }: { title: string; color: string; pick: DeckPick; onChange: (p: DeckPick) => void; problem: string | null }) {
  const pool = UNITS.filter((u) => deckable(u));
  const cards = Array.from({ length: 5 }, (_, i) => pick.cards[i] ?? "");
  const setCard = (i: number, id: string) => onChange({ ...pick, cards: cards.map((c, j) => (j === i ? id : c)) });
  const random = () => {
    const left = [...pool];
    const deck: string[] = [];
    while (deck.length < 5 && left.length) deck.push(left.splice(Math.floor(Math.random() * left.length), 1)[0].id);
    onChange({ ...pick, cards: deck });
  };
  return (
    <div className="panel">
      <div className="panel-head">
        <h2>
          <span style={{ background: color, display: "inline-block", width: 10, height: 10, borderRadius: 5, marginRight: 8 }} />
          {title}
        </h2>
        <div className="row" style={{ gap: 6 }}>
          <button className="btn small ghost" onClick={() => onChange({ ...pick, cards: starterDeck() })}>Starter deck</button>
          <button className="btn small ghost" onClick={random}>Random deck</button>
        </div>
      </div>
      {cards.map((id, i) => (
        <div key={i} className="row" style={{ gap: 8, alignItems: "center", marginBottom: 6 }}>
          {UNIT_BY_ID[id] ? <Thumb src={asset("portraits", id)} size={30} /> : <span style={{ width: 30 }} />}
          <UnitSelect value={id} units={pool} onChange={(v) => setCard(i, v)} />
        </div>
      ))}
      <div className="controls" style={{ marginTop: 10 }}>
        <div>
          <label>Hero</label>
          <Select
            value={HERO_BY_ID[pick.hero] ? pick.hero : ""}
            options={["", ...HEROES.map((h) => h.id)]}
            labels={{ "": "No hero", ...Object.fromEntries(HEROES.map((h) => [h.id, `${h.name} · ${h.power}${h.enabled ? "" : " (off)"}`])) }}
            onChange={(v) => onChange({ ...pick, hero: v })}
          />
        </div>
        <div>
          <label>Card level</label>
          <Stepper value={Math.min(pick.level, maxCardLevel())} min={1} max={maxCardLevel()} onChange={(v) => onChange({ ...pick, level: v })} />
        </div>
      </div>
      {problem && <p className="note">{problem}</p>}
    </div>
  );
}

/** Each card's share of the side's damage and the rank it got to. */
function DeckCards({ title, pick, stats }: { title: string; pick: DeckPick; stats: SideStats }) {
  const hero = HERO_BY_ID[pick.hero];
  const total = Object.values(stats.damage).reduce((a, b) => a + b, 0) + stats.heroDamage;
  const rows = Object.entries(stats.damage).sort((a, b) => b[1] - a[1]);
  return (
    <div style={{ marginBottom: 14 }}>
      <h2>{title}</h2>
      {rows.map(([id, d]) => (
        <div key={id} className="bar-row share">
          <Thumb src={asset("portraits", id)} size={24} />
          <span className="small">
            {UNIT_BY_ID[id]?.name ?? id} <span className="muted" title="Highest rank reached, average">R{(stats.topRank[id] ?? 0).toFixed(1)}</span>
          </span>
          <div className="bar">
            <div style={{ width: `${total ? (100 * d) / total : 0}%` }} />
          </div>
          <span className="small num-cell" title={`${f0(d)} damage per match`}>{pct(total ? d / total : 0)}</span>
        </div>
      ))}
      {hero && stats.heroDamage > 0 && (
        <div className="bar-row share">
          <Thumb src={asset("portraits_heroes", hero.id)} size={24} />
          <span className="small">{hero.name}</span>
          <div className="bar">
            <div style={{ width: `${(100 * stats.heroDamage) / total}%` }} />
          </div>
          <span className="small num-cell" title={`${f0(stats.heroDamage)} damage per match`}>{pct(stats.heroDamage / total)}</span>
        </div>
      )}
      <p className="muted small">
        Per match: {f1(stats.summons)} summons, {f1(stats.merges)} merges, {f1(stats.sends)} sends, {short(total)} damage.
      </p>
    </div>
  );
}

function DeckTab({ s, set, cfg }: { s: PlaySettings; set: Setter; cfg: GameConfig }) {
  const canAwaken = useAwakenable();
  const vs = s.deckMode === "vs";
  const ok = (id: string) => deckable(UNIT_BY_ID[id]);
  const probA = deckProblem(s.deckA.cards, ok);
  const probB = vs ? deckProblem(s.deckB.cards, ok) : null;
  const runs = Math.min(s.runs, DECK_RUNS);
  const side = (p: DeckPick): DeckSide => ({ cards: p.cards, hero: HERO_BY_ID[p.hero] ? p.hero : null, level: Math.min(p.level, maxCardLevel()) });
  const sim = useSimulation(
    () =>
      probA || probB
        ? null
        : runDecks({ a: side(s.deckA), b: vs ? side(s.deckB) : null, arena: ARENA_BY_ID[s.deckArena] ? s.deckArena : null, skill: s.deckSkill, runs, awakens: (id) => canAwaken.has(id) }),
    [cfg, canAwaken, runs, s.deckMode, s.deckArena, s.deckSkill, JSON.stringify([s.deckA, s.deckB])],
    300,
  );
  const r = sim.value;
  const rules = PVP.rules;
  const lastWave = r ? Math.max(...r.waves) : 0;
  const avgWave = r ? r.waves.reduce((a, b) => a + b, 0) / r.runs : 0;

  return (
    <>
      <div className="panel controls">
        <div>
          <label>Mode</label>
          <Select value={s.deckMode} options={["vs", "solo"] as const} labels={{ vs: "Deck A vs deck B", solo: "Deck A alone" }} onChange={(v) => set("deckMode", v)} />
        </div>
        <div>
          <label>Arena</label>
          <Select
            value={ARENA_BY_ID[s.deckArena] ? s.deckArena : ""}
            options={["", ...ARENAS.map((a) => a.id)]}
            labels={{ "": "Random each match", ...Object.fromEntries(ARENAS.map((a, i) => [a.id, `${i + 1}. ${a.name}`])) }}
            onChange={(v) => set("deckArena", v)}
          />
        </div>
        <div>
          <label title="How quickly the bots act and how much they send (0-1)">Bot skill</label>
          <Stepper value={s.deckSkill} min={0} max={1} step={0.1} onChange={(v) => set("deckSkill", Math.round(v * 10) / 10)} />
        </div>
        <div>
          <label title="Each match has its own waves, arena (when random) and luck">Matches</label>
          <Select value={String(runs) as "20"} options={["1", "5", "10", "20", "50"] as const} onChange={(v) => set("runs", Number(v))} />
        </div>
      </div>
      <p className="muted small">
        Bots play whole matches with each deck: they summon, merge, buy power-ups, auto-cast the hero and spend spare mana on sends. Waves and rules are PvP's: {rules.hp} HP, sudden death from wave {rules.suddenDeathWave}, last wave {rules.maxWave}.
        {vs ? " Each deck's sends go to the other board." : " Alone, nothing arrives from an opponent; sends still raise income."}
      </p>

      <div className="two-col">
        <DeckPicker title="Deck A" color={SIDE_COLORS[0]} pick={s.deckA} onChange={(p) => set("deckA", p)} problem={probA} />
        {vs ? (
          <DeckPicker title="Deck B" color={SIDE_COLORS[1]} pick={s.deckB} onChange={(p) => set("deckB", p)} problem={probB} />
        ) : (
          <div className="panel">
            <h2>Alone against the waves</h2>
            <p className="muted small">
              How far deck A gets on its own. Every match ends on 0 HP or at wave {rules.maxWave}; the waves grow much faster from sudden death (wave {rules.suddenDeathWave}) on, so that's where most decks stop.
            </p>
          </div>
        )}
      </div>

      <div className="two-col">
        <div className="panel">
          <div className="panel-head">
            <h2>{vs ? "Deck A vs deck B" : "Deck A alone"}</h2>
            <Busy busy={sim.busy} />
          </div>
          {r && (
            <>
              <div className="stats">
                {vs ? (
                  <Stat label="Deck A wins" value={pct(r.wins[0] / r.runs)} sub={`${r.wins[0]} / ${r.wins[1]} / ${r.wins[2]} (A / B / draw)`} />
                ) : (
                  <Stat label={`Reached wave ${rules.maxWave}`} value={pct(r.wins[0] / r.runs)} sub={`${r.wins[0]} of ${r.runs}`} />
                )}
                <Stat label="Last wave reached" value={f1(avgWave)} sub={`${Math.min(...r.waves)} to ${lastWave}`} />
                <Stat label="Average length" value={`${(r.avgTime / 60).toFixed(1)} min`} />
                {r.b ? (
                  <Stat label="HP left A / B" value={`${f1(r.a.hpLeft)} / ${f1(r.b.hpLeft)}`} sub={`${r.byHp} ended on 0 HP`} />
                ) : (
                  <Stat label="HP left" value={f1(r.a.hpLeft)} sub={`of ${rules.hp}`} />
                )}
              </div>
              <h2 style={{ marginTop: 14 }}>HP at the start of each wave</h2>
              <TimeChart
                x={Array.from({ length: lastWave }, (_, i) => `W${i + 1}`)}
                series={[
                  { label: "Deck A", color: SIDE_COLORS[0], kind: "line", values: r.a.hpByWave.slice(0, lastWave) },
                  ...(r.b ? [{ label: "Deck B", color: SIDE_COLORS[1], kind: "line" as const, values: r.b.hpByWave.slice(0, lastWave) }] : []),
                ]}
                format={(v) => v.toFixed(1)}
                height={200}
              />
              {r.b && <Legend series={[{ label: "Deck A", color: SIDE_COLORS[0] }, { label: "Deck B", color: SIDE_COLORS[1] }]} />}
              <p className="muted small">Averaged over {r.runs} matches; a board that has lost counts as 0 HP.</p>
            </>
          )}
          {!r && !sim.busy && <p className="muted small">Fix the deck{vs ? "s" : ""} above to run the matches.</p>}
        </div>
        <div className="panel">
          <h2 style={{ marginBottom: 10 }}>Damage by card</h2>
          {r && (
            <>
              <DeckCards title="Deck A" pick={s.deckA} stats={r.a} />
              {r.b && <DeckCards title="Deck B" pick={s.deckB} stats={r.b} />}
              <p className="muted small">R is the highest rank the card reached, averaged over the matches.</p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
