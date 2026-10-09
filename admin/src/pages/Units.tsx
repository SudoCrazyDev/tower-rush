import { Fragment, useMemo, useState } from "react";
import { useConfig } from "../config";
import { Num, Text, Select, Toggle, Thumb, PageHead } from "../components";
import { ASSETS, asset } from "../api";
import { ARENAS } from "../../../shared/arenas.ts";
import { ECONOMY } from "../../../shared/economy.ts";
import { ELEMENTS, PROJECTILES, RARITIES, STYLES, STYLE_IDS, WEAPON_KEYS, maxCardLevel, maxPowerUp, maxRank, restyle, unitStats, type Rarity, type Style, type UnitDef } from "../../../shared/units.ts";
import { noAttack } from "../../../shared/support.ts";
import { kitSummary, perkSummary } from "../../../shared/kit.ts";
import { PERKS } from "../../../shared/perks.ts";
import { KitEditor, archLabel, kitLine, perksLine, primaryArch } from "../kitEditor";
import { RACE_IDS, RACES } from "../../../shared/races.ts";
import { RankPicker, Stepper, f0, f1, pct, secs, useAwakenable, useSimulation } from "../playground";
import { ArenaView } from "../arenaView";
import { DUMMY_TIME, PACK, measureUnit, paper, runMany, unitBoardSetup, type Level } from "../catalogSim";
import {
  Columns,
  EntryHead,
  Field,
  MiniLines,
  PeerMeter,
  Rail,
  Section,
  SliderNum,
  TextArea,
  Tabs,
  Versus,
  BarList,
  Workbench,
  changedKeys,
  deltaPct,
  useAppliedDraft,
  useRemembered,
  withConfig,
} from "../workbench";
import type { GameConfig } from "../../../shared/config.ts";

const RACE_LABELS = Object.fromEntries(RACE_IDS.map((r) => [r, RACES[r].label]));

const STYLE_LABELS = Object.fromEntries(STYLE_IDS.map((s) => [s, `${STYLES[s].label} — ${STYLES[s].text}`]));

const WEAPON_OPTIONS = ["none", ...WEAPON_KEYS];

type View = "bench" | "table";
type PTab = "card" | "sim" | "balance";
const PTABS = ["card", "sim", "balance"] as const;
const PTAB_LABELS: Record<PTab, string> = { card: "Card", sim: "Simulation", balance: "Balance" };
type Sort = "list" | "name" | "dps" | "changed";

/** Units: a workbench for one unit at a time, or the full table for bulk edits. */
export function UnitsPage() {
  const [view, setView] = useRemembered<View>("units-view", "bench");
  return (
    <>
      <div className="wb-top">
        <h1>Units</h1>
        <div className="seg small">
          <button className={view === "bench" ? "on" : ""} onClick={() => setView("bench")}>Workbench</button>
          <button className={view === "table" ? "on" : ""} onClick={() => setView("table")}>Table · bulk edit</button>
        </div>
        <p className="desc">
          Damage is per hit at rank 1, card level 1; speed is attacks per second. Merge rank, card level and power-ups multiply these (Economy). Every number here is the
          draft: the save bar publishes it.
        </p>
      </div>
      {view === "bench" ? <UnitsBench /> : <UnitsTable />}
    </>
  );
}

// ---------------------------------------------------------------- workbench

function UnitsBench() {
  const { draft, saved, edit } = useConfig();
  const cfg = useAppliedDraft();
  const canAwaken = useAwakenable();
  const [sel, setSel] = useRemembered("units-sel", "");
  const [tab, setTab] = useRemembered<PTab>("units-tab", "card");
  const [rarity, setRarity] = useRemembered<Rarity | "all">("units-rarity", "all");
  const [sort, setSort] = useRemembered<Sort>("units-sort", "list");

  const units = draft?.units ?? [];
  const savedById = useMemo(() => Object.fromEntries((saved?.units ?? []).map((u) => [u.id, u])), [saved]);
  const r1 = (u: UnitDef) => (noAttack(primaryArch(u)) ? 0 : unitStats(u, 1, 1, 0).damage * unitStats(u, 1, 1, 0).speed);

  const railItems = useMemo(() => {
    const list = units
      .filter((u) => rarity === "all" || u.rarity === rarity)
      .map((u) => ({ u, changed: changedKeys(u, savedById[u.id]).length > 0 }));
    if (sort === "name") list.sort((a, b) => a.u.name.localeCompare(b.u.name));
    if (sort === "dps") list.sort((a, b) => r1(b.u) - r1(a.u));
    if (sort === "changed") list.sort((a, b) => Number(b.changed) - Number(a.changed));
    return list.map(({ u, changed }) => ({
      id: u.id,
      title: u.name,
      sub: `${u.rarity} · ${kitLine(u)}`,
      thumb: asset("portraits", u.id),
      tone: u.rarity,
      changed,
      off: !u.enabled,
      search: `${u.rarity} ${u.element} ${u.race} ${kitLine(u)} ${perksLine(u)}`,
      figure: noAttack(primaryArch(u)) ? "buff" : f1(r1(u)),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [units, savedById, rarity, sort]);

  if (!draft || !saved || !cfg) return <div className="muted">Loading…</div>;
  const idx = Math.max(0, units.findIndex((u) => u.id === sel));
  const u = units[idx];
  if (!u) return <div className="muted">No units.</div>;
  const before = savedById[u.id];
  const changes = changedKeys(u, before);
  const pos = railItems.findIndex((r) => r.id === u.id);
  const go = (d: number) => railItems[pos + d] && setSel(railItems[pos + d].id);

  const set = <K extends keyof UnitDef>(k: K, v: UnitDef[K] | undefined) =>
    edit((c) => {
      const t = c.units[idx];
      if (v === undefined) delete t[k];
      else t[k] = v;
    });
  const reset = (k: keyof UnitDef) => () => set(k, before ? structuredClone(before[k]) : undefined);
  const ch = (k: keyof UnitDef) => changes.includes(k as string);
  const setStyle = (style: Style) =>
    edit((c) => {
      const t = c.units[idx];
      Object.assign(t, restyle(t, t.style, style), { style });
    });

  return (
    <Workbench
      rail={
        <Rail
          items={railItems}
          selected={u.id}
          onSelect={setSel}
          placeholder="Search name, kit, perk…"
          filters={
            <div className="row" style={{ gap: 6 }}>
              <select value={rarity} onChange={(e) => setRarity(e.target.value as Rarity | "all")} title="Rarity">
                <option value="all">All rarities</option>
                {RARITIES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} title="Order">
                <option value="list">Config order</option>
                <option value="name">Name</option>
                <option value="dps">DPS at rank 1</option>
                <option value="changed">Changed first</option>
              </select>
            </div>
          }
        />
      }
    >
      <EntryHead
        thumb={<Thumb src={asset("portraits", u.id)} size={56} />}
        title={u.name}
        badges={
          <>
            <span className={`rarity ${u.rarity} small`}>{u.rarity}</span>
            {!u.enabled && <span className="badge err">Off</span>}
            {u.storyOnly && <span className="badge info">Story only</span>}
            {u.storyReward && <span className="badge info">Story reward</span>}
          </>
        }
        sub={<><span className="id">{u.id}</span> · {u.element} · {RACES[u.race]?.label ?? u.race} · {kitLine(u)}</>}
        changes={changes}
        onRevert={before ? () => edit((c) => void (c.units[idx] = structuredClone(before))) : undefined}
        onPrev={pos > 0 ? () => go(-1) : undefined}
        onNext={pos < railItems.length - 1 ? () => go(1) : undefined}
      />
      <Columns
        preview={
          <>
            <Tabs tabs={PTABS} value={tab} onChange={setTab} labels={PTAB_LABELS} />
            {tab === "card" && <CardTab u={u} canAwaken={canAwaken} />}
            {tab === "sim" && <SimTab u={u} draft={cfg} saved={saved} canAwaken={canAwaken} />}
            {tab === "balance" && <BalanceTab u={u} units={units} savedById={savedById} canAwaken={canAwaken} onPick={setSel} />}
          </>
        }
        editor={
          <>
            <Section title="Identity" hint="what the player reads">
              <Field label="Name" changed={ch("name")} saved={before?.name} onReset={reset("name")}>
                <Text value={u.name} onChange={(v) => set("name", v)} />
              </Field>
              <Field label="Description" help="Shown on the card sheet" changed={ch("blurb")} saved={before?.blurb} onReset={reset("blurb")} wide>
                <TextArea value={u.blurb} onChange={(v) => set("blurb", v)} />
              </Field>
              <Field label="Rarity" changed={ch("rarity")} saved={before?.rarity} onReset={reset("rarity")}>
                <Select value={u.rarity} options={RARITIES} onChange={(v) => set("rarity", v)} />
              </Field>
              <Field label="Element" changed={ch("element")} saved={before?.element} onReset={reset("element")}>
                <Select value={u.element} options={ELEMENTS} onChange={(v) => set("element", v)} />
              </Field>
              <Field label="Race" changed={ch("race")} saved={before && RACE_LABELS[before.race]} onReset={reset("race")}>
                <Select value={u.race} options={RACE_IDS} labels={RACE_LABELS} onChange={(v) => set("race", v)} />
              </Field>
              <Field label="Role" help='Shown in place of the style ("Knight"); blank for none' changed={ch("role")} saved={before?.role || "none"} onReset={reset("role")}>
                <Text value={u.role ?? ""} onChange={(v) => set("role", v.trim() ? v : undefined)} placeholder="none" />
              </Field>
            </Section>

            <Section title="Availability">
              <Field label="Enabled" help="Off: out of chests and decks; players keep copies" changed={ch("enabled")} saved={before?.enabled ? "on" : "off"} onReset={reset("enabled")}>
                <Toggle value={u.enabled} onChange={(v) => set("enabled", v)} />
              </Field>
              <Field label="Story only" help="Only inside a story's Event deck" changed={ch("storyOnly")} saved={before?.storyOnly ? "on" : "off"} onReset={reset("storyOnly")}>
                <Toggle value={!!u.storyOnly} onChange={(v) => set("storyOnly", v || undefined)} />
              </Field>
              <Field label="Story reward" help="Drops from chests once owned" changed={ch("storyReward")} saved={before?.storyReward ? "on" : "off"} onReset={reset("storyReward")}>
                <Toggle value={!!u.storyReward} onChange={(v) => set("storyReward", v || undefined)} />
              </Field>
            </Section>

            <Section title="Combat" hint="rank 1, card level 1">
              <Field label="Style" help="Changing it rescales damage and speed, keeping DPS" changed={ch("style")} saved={before?.style} onReset={reset("style")}>
                <Select value={u.style} options={STYLE_IDS} labels={STYLE_LABELS} onChange={setStyle} />
              </Field>
              <Field label="Damage" help="Per hit" changed={ch("damage")} saved={before?.damage} onReset={reset("damage")}>
                <SliderNum value={u.damage} min={0} max={Math.max(40, Math.ceil((before?.damage ?? u.damage) * 3))} step={0.5} onChange={(v) => set("damage", v)} />
              </Field>
              <Field label="Attack speed" help="Attacks per second" changed={ch("speed")} saved={before?.speed} onReset={reset("speed")} extra={<span className="derived">{u.speed > 0 ? `${(1 / u.speed).toFixed(2)}s between` : ""}</span>}>
                <SliderNum value={u.speed} min={0} max={4} step={0.05} onChange={(v) => set("speed", v)} />
              </Field>
              <Field label="DPS on paper" help="Damage × speed">
                <span className="stat-value" style={{ fontSize: 18 }}>{noAttack(primaryArch(u)) ? "—" : f1(u.damage * u.speed)}</span>
                {before && !noAttack(primaryArch(u)) && <DeltaText before={before.damage * before.speed} after={u.damage * u.speed} />}
              </Field>
              <Field label="Projectile" changed={ch("proj")} saved={before?.proj} onReset={reset("proj")}>
                <Select value={u.proj} options={PROJECTILES} onChange={(v) => set("proj", v)} />
              </Field>
              <Field label="Weapon" help="Melee weapon thrown instead" changed={ch("weapon")} saved={before?.weapon ?? "none"} onReset={reset("weapon")}>
                <Select value={u.weapon ?? "none"} options={WEAPON_OPTIONS} onChange={(v) => set("weapon", v === "none" ? undefined : v)} />
              </Field>
            </Section>

            <Section title="Kit & perks" hint="how it attacks, riders, signatures" right={(ch("kit") || ch("perks")) && <span className="dot" />}>
              <KitEditor unit={u} rank={1} effects={draft.effects} perkValues={draft.perks} onKit={(kit) => set("kit", kit)} onPerks={(perks) => set("perks", perks)} />
              {(ch("kit") || ch("perks")) && before && (
                <div className="field-saved">
                  <span>saved: {kitLine(before)} · perks {perksLine(before)}</span>
                  <button type="button" className="linkish" onClick={() => edit((c) => void Object.assign(c.units[idx], { kit: structuredClone(before.kit), perks: structuredClone(before.perks) }))}>reset kit & perks</button>
                </div>
              )}
            </Section>

            <Section title="Art" open={false}>
              <div className="row" style={{ gap: 16 }}>
                <div className="center"><Thumb src={asset("portraits", u.id)} size={96} /><div className="muted small">portraits/{u.id}</div></div>
                <div className="center"><Thumb src={asset("portraits_awakened", u.id)} size={96} /><div className="muted small">{canAwaken.has(u.id) ? "awakened" : "no awakened art"}</div></div>
              </div>
              <p className="muted small">Art is uploaded through the Art page. A unit awakens at rank {maxRank()} only when it has awakened art.</p>
            </Section>
          </>
        }
      />
    </Workbench>
  );
}

function DeltaText({ before, after }: { before: number; after: number }) {
  const d = deltaPct(before, after);
  return d ? <span className={`delta ${after > before ? "up" : "down"}`}>{d} vs saved</span> : null;
}

// ---------------------------------------------------------------- card tab

/** The unit card as the game draws it (game/src/ui.ts cardView): rarity frame, portrait, element, level. */
export function GameCard({ u, size = 132, level, awakened, locked, caption }: { u: UnitDef; size?: number; level?: number; awakened?: boolean; locked?: boolean; caption?: string }) {
  return (
    <div className="gcard-wrap">
      <div className={`gcard ${locked ? "locked" : ""}`} style={{ ["--s" as string]: `${size}px` }}>
        <img className="gcard-frame" src={`${ASSETS}cards/frame_${awakened ? "mythic" : u.rarity}.webp`} alt="" />
        <img className="gcard-art" crossOrigin="anonymous" src={asset(awakened ? "portraits_awakened" : "portraits", u.id)} alt="" onError={(e) => ((e.target as HTMLImageElement).style.visibility = "hidden")} />
        <img className="gcard-el" src={`${ASSETS}ui/element_${u.element}.webp`} alt={u.element} />
        {level !== undefined && <div className="gcard-lv">LV {level}</div>}
      </div>
      <div className="gcard-name">{u.name}</div>
      {caption && <div className="gcard-cap">{caption}</div>}
    </div>
  );
}

function CardTab({ u, canAwaken }: { u: UnitDef; canAwaken: Set<string> }) {
  const [level, setLevel] = useState(1);
  const lv = Math.min(level, maxCardLevel());
  const arch = primaryArch(u);
  const attacks = !noAttack(arch);
  const st = STYLES[u.style];
  const awakens = canAwaken.has(u.id);
  const max = maxCardLevel();
  const first = Math.max(1, Math.min(lv, max - 4));
  const levels = Array.from({ length: Math.min(5, max) }, (_, i) => first + i);
  const ranks = Array.from({ length: maxRank() }, (_, i) => i + 1);
  const boost = (r: number, m: number) => (awakens && r === maxRank() ? m : 1);
  const dmg = (v: number) => (!attacks ? "—" : v < 100 ? String(+v.toFixed(1)) : f0(v));
  const every = (s: number) => (!attacks || s <= 0 ? "—" : `${+(1 / s).toFixed(2)}s`);
  const icon = (n: string) => <img src={`${ASSETS}stats/${n}.webp`} alt="" />;
  const vs = u.style === "balanced" ? "" : ` · ×${+st.dmg.toFixed(2)} damage, ×${st.speed} speed`;

  return (
    <div className="wb-pane">
      <div className="wb-controls">
        <div>
          <label>Player's card level</label>
          <Stepper value={lv} min={1} max={max} onChange={setLevel} />
        </div>
        <span className="muted small">As the deck, collection and card sheet show it. Edits on the right update it live.</span>
      </div>
      <div className="gstage">
        <div className="grow">
          <GameCard u={u} level={lv} caption="In the deck" />
          <GameCard u={u} size={100} locked caption="Not owned yet" />
          {awakens && <GameCard u={u} size={100} awakened level={lv} caption={`Awakened ★${maxRank()}`} />}
        </div>
        <div className="gsheet">
          <div className="gsheet-head">
            <GameCard u={u} size={84} />
            <div>
              <h2>{u.name}</h2>
              <div className="sub">
                <span className={`rarity ${u.rarity}`}>{u.rarity}</span> · {u.element} · {RACES[u.race]?.label ?? u.race}
              </div>
              <div className="sub">{archLabel(arch)}</div>
            </div>
          </div>
          {u.blurb && <div className="blurb">{u.blurb}</div>}
          {attacks && <div className="style">{(u.role ?? st.label).toUpperCase()}: {st.text}{vs}</div>}
          {perkSummary(u).map((l, i) => <div key={i} className="perk">{attacks ? "" : "Neighbours get "}{l}</div>)}
          <div className="kitline">{kitSummary(u, 1, 1).map((l, i) => <div key={i}>{l}</div>)}</div>

          <div className="gold">CARD LEVEL</div>
          <div className="note">+{pct(ECONOMY.levelBonus)} {attacks ? "damage" : "boost"} per upgrade · max level {max}</div>
          <table className="gtable">
            <thead><tr><th />{levels.map((l) => <th key={l} className={l === lv ? "hi" : ""}>{l === max ? "MAX" : `Lv ${l}`}</th>)}</tr></thead>
            <tbody><tr><td>{icon("damage")}</td>{levels.map((l) => <td key={l} className={l === lv ? "hi" : ""}>{dmg(unitStats(u, 1, l, 0).damage)}</td>)}</tr></tbody>
          </table>

          <div className="gold">MERGE RANK</div>
          <div className="note">
            {attacks ? `Each merge: +${pct(ECONOMY.rankDamageStep)} base damage, ${pct(ECONOMY.rankSpeedStep)} faster` : "Each merge: a stronger effect"}
            {awakens ? ` · ★${maxRank()} awakens` : ""}
          </div>
          <table className="gtable">
            <thead><tr><th />{ranks.map((r) => <th key={r}>★{r}</th>)}</tr></thead>
            <tbody>
              <tr><td>{icon("damage")}</td>{ranks.map((r) => <td key={r}>{dmg(unitStats(u, r, lv, 0).damage * boost(r, ECONOMY.awakenDamageMult))}</td>)}</tr>
              <tr><td>{icon("attack_speed")}</td>{ranks.map((r) => <td key={r}>{every(unitStats(u, r, lv, 0).speed * boost(r, ECONOMY.awakenSpeedMult))}</td>)}</tr>
            </tbody>
          </table>
          <div className="note" style={{ marginTop: 0 }}>At card level {lv}. Times are seconds between attacks.</div>
        </div>
      </div>
      {u.perks.length > 0 && (
        <p className="muted small">Perks: {u.perks.map((p) => `${PERKS[p.perk]?.label ?? p.perk} — ${PERKS[p.perk]?.text ?? ""}`).join(" · ")}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- simulation tab

interface UnitMeasure {
  paper: ReturnType<typeof paper>;
  one: ReturnType<typeof measureUnit>;
  pack: ReturnType<typeof measureUnit>;
}

function useLevel(key: string) {
  const [l, setL] = useRemembered<Level>(key, { arena: "meadow", wave: 10, rank: 3, cardLevel: 1, powerUp: 0 });
  const level: Level = { ...l, cardLevel: Math.min(l.cardLevel, maxCardLevel()), powerUp: Math.min(l.powerUp, maxPowerUp()), rank: Math.min(l.rank, maxRank()) };
  const set = <K extends keyof Level>(k: K, v: Level[K]) => setL((p) => ({ ...p, [k]: v }));
  return [level, set] as const;
}

function LevelControls({ l, set, rank = true }: { l: Level; set: <K extends keyof Level>(k: K, v: Level[K]) => void; rank?: boolean }) {
  return (
    <div className="wb-controls">
      {rank && (
        <div>
          <label>Merge rank</label>
          <RankPicker value={l.rank} onChange={(v) => set("rank", v)} />
        </div>
      )}
      <div>
        <label>Card level</label>
        <Stepper value={l.cardLevel} min={1} max={maxCardLevel()} onChange={(v) => set("cardLevel", v)} />
      </div>
      <div>
        <label>Power-ups</label>
        <Stepper value={l.powerUp} min={0} max={maxPowerUp()} onChange={(v) => set("powerUp", v)} />
      </div>
      <div>
        <label>Wave</label>
        <Stepper value={l.wave} min={1} max={60} onChange={(v) => set("wave", v)} />
      </div>
      <div>
        <label>Arena</label>
        <select value={l.arena} onChange={(e) => set("arena", e.target.value)}>
          {ARENAS.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>
    </div>
  );
}

export { useLevel, LevelControls };

function SimTab({ u, draft, saved, canAwaken }: { u: UnitDef; draft: GameConfig; saved: GameConfig; canAwaken: Set<string> }) {
  const [l, set] = useLevel("units-sim");
  const [watch, setWatch] = useState<"pack" | "wave">("pack");
  const inSaved = saved.units.some((x) => x.id === u.id);
  const measure = (): UnitMeasure => ({ paper: paper(u.id, l, canAwaken), one: measureUnit(u.id, 1, 3, l, canAwaken), pack: measureUnit(u.id, PACK, 3, l, canAwaken) });
  const deps = [draft, saved, u.id, l.arena, l.wave, l.rank, l.cardLevel, l.powerUp, canAwaken];
  const sim = useSimulation(() => ({ now: measure(), was: inSaved ? withConfig(saved, draft, measure) : null }), deps, 150);
  const wave = useSimulation(
    () => ({ now: runMany(unitBoardSetup(u.id, l, canAwaken), 3), was: inSaved ? withConfig(saved, draft, () => runMany(unitBoardSetup(u.id, l, canAwaken), 3)) : null }),
    deps,
    300,
  );
  // Peers: the same rarity, measured the same way (1 run each) for the verdict.
  const peers = useSimulation(
    () =>
      draft.units
        .filter((x) => x.rarity === u.rarity && x.id !== u.id && x.enabled && !noAttack(primaryArch(x)))
        .map((x) => ({ id: x.id, name: x.name, value: measureUnit(x.id, PACK, 1, l, canAwaken)?.dps ?? 0 })),
    [draft, u.rarity, u.id, l.arena, l.wave, l.rank, l.cardLevel, l.powerUp, canAwaken],
    500,
  );
  const now = sim.value?.now;
  const was = sim.value?.was;
  const attacks = !noAttack(primaryArch(u));

  return (
    <div className="wb-pane">
      <LevelControls l={l} set={set} />

      <h3>Draft vs saved {sim.busy && <span className="muted small">running…</span>}</h3>
      {now && (
        <div className="versus-grid">
          <Versus label="Damage per hit" before={was?.paper?.damage} after={now.paper?.damage} format={f1} />
          <Versus label="Attacks per second" before={was?.paper?.speed} after={now.paper?.speed} format={(n) => n.toFixed(2)} />
          <Versus label="DPS on paper" before={was?.paper?.dps} after={now.paper?.dps} format={f1} />
          <Versus label="1 dummy: damage/s" before={was?.one?.dps} after={now.one?.dps} format={f1} sub={`${f1(now.one?.kpm ?? 0)} kills/min`} />
          <Versus label={`Pack of ${PACK}: damage/s`} before={was?.pack?.dps} after={now.pack?.dps} format={f1} sub={`${f1(now.pack?.kpm ?? 0)} kills/min`} />
        </div>
      )}
      {!inSaved && <p className="muted small">New unit: nothing saved to compare with.</p>}

      {now?.pack && peers.value && peers.value.length > 0 && (
        <PeerMeter label={`Pack damage/s vs other ${u.rarity} units (rank ${l.rank})`} value={now.pack.dps} saved={was?.pack?.dps} peers={peers.value} format={f1} />
      )}
      {!attacks && <p className="muted small">This unit doesn't attack: its worth is what it gives its neighbours (see Kit & perks). Dummy numbers count only its own damage.</p>}

      <h3>A full board of {u.name} vs wave {l.wave} {wave.busy && <span className="muted small">running…</span>}</h3>
      {wave.value && (
        <div className="versus-grid">
          <Versus label="Cleared" before={wave.value.was?.clearRate} after={wave.value.now.clearRate} format={pct} />
          <Versus label="Leaks" before={wave.value.was?.avgLeaks} after={wave.value.now.avgLeaks} format={f1} goodWhenUp={false} />
          <Versus label="Time" before={wave.value.was?.avgTime} after={wave.value.now.avgTime} format={secs} goodWhenUp={false} />
          <Versus label="Kills" before={wave.value.was?.avgKills} after={wave.value.now.avgKills} format={f1} />
        </div>
      )}

      <div className="panel-head" style={{ margin: 0 }}>
        <h3>Watch it (draft)</h3>
        <div className="seg small">
          <button className={watch === "pack" ? "on" : ""} onClick={() => setWatch("pack")}>{PACK} dummies</button>
          <button className={watch === "wave" ? "on" : ""} onClick={() => setWatch("wave")}>Wave {l.wave}</button>
        </div>
      </div>
      <ArenaView
        key={`${u.id}-${watch}`}
        setup={
          watch === "wave"
            ? unitBoardSetup(u.id, l, canAwaken)
            : {
                ...unitBoardSetup(u.id, l, canAwaken),
                board: Array.from({ length: 15 }, (_, i) => (i === 7 ? { id: u.id, rank: l.rank, awakened: l.rank >= maxRank() && canAwaken.has(u.id) } : null)),
                scenario: { kind: "dummies", count: PACK, wave: l.wave, duration: DUMMY_TIME },
              }
        }
        height={460}
      />
      <p className="muted small">
        Dummies stand on the ring with a wave-{l.wave} monster's health and come back when killed, so crits, damage over time, splash, chains and executes count; slows and
        stuns only show against the real wave. 3 runs each; peers 1 run.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------- balance tab

function BalanceTab({ u, units, savedById, canAwaken, onPick }: { u: UnitDef; units: UnitDef[]; savedById: Record<string, UnitDef>; canAwaken: Set<string>; onPick: (id: string) => void }) {
  const [scope, setScope] = useState<"rarity" | "all">("rarity");
  const [rank, setRank] = useState(3);
  const level = { rank, cardLevel: 1, powerUp: 0 };
  const pool = units.filter((x) => x.enabled && !noAttack(primaryArch(x)) && (scope === "all" || x.rarity === u.rarity));
  const rows = pool
    .map((x) => ({ id: x.id, name: <>{x.name} <span className={`rarity ${x.rarity} small`}>{x.rarity[0].toUpperCase()}</span></>, value: paper(x.id, level, canAwaken)?.dps ?? 0 }))
    .sort((a, b) => b.value - a.value);
  const attacks = !noAttack(primaryArch(u));
  const me = paper(u.id, level, canAwaken);
  const before = savedById[u.id];
  const ranks = Array.from({ length: maxRank() }, (_, i) => i + 1);
  const median = (vals: number[]) => {
    const s = [...vals].sort((a, b) => a - b);
    return s.length ? s[Math.floor(s.length / 2)] : 0;
  };
  const sameRarity = units.filter((x) => x.rarity === u.rarity && x.enabled && !noAttack(primaryArch(x)) && x.id !== u.id);
  const stat = (x: UnitDef, r: number) => unitStats(x, r, 1, 0);
  const curve = {
    draft: ranks.map((r) => (attacks ? stat(u, r).damage * stat(u, r).speed : 0)),
    saved: before ? ranks.map((r) => (attacks ? stat(before, r).damage * stat(before, r).speed : 0)) : null,
    peer: ranks.map((r) => median(sameRarity.map((x) => stat(x, r).damage * stat(x, r).speed))),
  };
  const changed = units.filter((x) => savedById[x.id] && changedKeys(x, savedById[x.id]).length > 0);

  return (
    <div className="wb-pane">
      <div className="wb-controls">
        <div>
          <label>Compare with</label>
          <div className="seg small">
            <button className={scope === "rarity" ? "on" : ""} onClick={() => setScope("rarity")}>{u.rarity} units</button>
            <button className={scope === "all" ? "on" : ""} onClick={() => setScope("all")}>All units</button>
          </div>
        </div>
        <div>
          <label>At merge rank</label>
          <RankPicker value={rank} onChange={setRank} />
        </div>
      </div>

      {attacks && me ? (
        <PeerMeter
          label={`DPS on paper at rank ${rank}`}
          value={me.dps}
          saved={before ? stat(before, rank).damage * stat(before, rank).speed : null}
          peers={rows.filter((r) => r.id !== u.id).map((r) => ({ id: r.id, name: String(units.find((x) => x.id === r.id)?.name), value: r.value }))}
          format={f1}
        />
      ) : (
        <div className="verdict warn">Support unit <span className="muted">It doesn't attack, so it isn't ranked by damage. Judge it in the Playground with a full board.</span></div>
      )}

      {attacks && (
        <>
          <h3>DPS by merge rank (card level 1)</h3>
          <MiniLines
            xs={ranks.map((r) => `★${r}`)}
            series={[
              ...(curve.saved ? [{ name: "Saved", values: curve.saved, cls: "s-saved" }] : []),
              { name: `${u.rarity} median`, values: curve.peer, cls: "s-peer" },
              { name: "Draft", values: curve.draft, cls: "s-draft" },
            ]}
            format={f1}
          />
        </>
      )}

      <h3>Ranking · DPS on paper at rank {rank}</h3>
      <BarList rows={rows} highlight={u.id} format={f1} onPick={onPick} />
      <p className="muted small">Paper DPS ignores kit effects (splash, chains, burn…). The Simulation tab measures those. Click a row to open that unit.</p>

      {changed.length > 0 && (
        <>
          <h3>Units changed in this draft</h3>
          <table className="mini-table">
            <thead><tr><th>Unit</th><th>Fields</th><th className="n">DPS R1</th></tr></thead>
            <tbody>
              {changed.map((x) => {
                const b = savedById[x.id];
                return (
                  <tr key={x.id} className={`click ${x.id === u.id ? "on" : ""}`} onClick={() => onPick(x.id)}>
                    <td>{x.name}</td>
                    <td className="muted">{changedKeys(x, b).join(", ")}</td>
                    <td className="n">
                      {f1(x.damage * x.speed)} <DeltaBadge before={b.damage * b.speed} after={x.damage * x.speed} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

function DeltaBadge({ before, after }: { before: number; after: number }) {
  const d = deltaPct(before, after);
  return d ? <span className={`delta ${after > before ? "up" : "down"}`}>{d}</span> : null;
}

// ---------------------------------------------------------------- table (bulk edit)

function UnitsTable() {
  const { draft, saved, edit } = useConfig();
  const [q, setQ] = useState("");
  const [rarity, setRarity] = useState<Rarity | "all">("all");
  const [rank, setRank] = useState(1);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (id: string) => setOpen((o) => { const n = new Set(o); if (!n.delete(id)) n.add(id); return n; });

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
      <PageHead title="" desc="Damage is per hit at rank 1, card level 1. Speed is attacks per second. Style trades hit size for speed; the perk counters a monster trait. Merge rank, card level and power-ups multiply these (see Economy).">
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
              <th title="Archetypes: how it attacks, then riders and signatures">Kit</th>
              <th title="Heavy: slow, big hits. Rapid: fast, light hits. Changing it rescales damage and speed">Style</th>
              <th title="Buff units hand their perks to the neighbours they buff">Perks</th>
              <th>Projectile</th>
              <th title="Melee weapon thrown instead of the projectile (none = use the projectile)">Weapon</th>
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
                <Fragment key={u.id}>
                <tr className={u.enabled ? "" : "disabled"}>
                  <td><Thumb src={asset("portraits", u.id)} /></td>
                  <td><Thumb src={asset("portraits_awakened", u.id)} /></td>
                  <td className={changed(u, "name")}>
                    <Text value={u.name} onChange={(v) => set(i, "name", v)} width={150} />
                    <div className="id">{u.id}</div>
                  </td>
                  <td className={changed(u, "rarity")}><Select value={u.rarity} options={RARITIES} onChange={(v) => set(i, "rarity", v)} /></td>
                  <td className={changed(u, "element")}><Select value={u.element} options={ELEMENTS} onChange={(v) => set(i, "element", v)} /></td>
                  <td className={changed(u, "race")}><Select value={u.race} options={RACE_IDS} labels={RACE_LABELS} onChange={(v) => set(i, "race", v)} /></td>
                  <td className={changed(u, "kit")}>
                    <button className="btn small ghost" onClick={() => toggle(u.id)}>{open.has(u.id) ? "Close" : "Edit"}</button> {kitLine(u)}
                  </td>
                  <td className={changed(u, "style")}><Select value={u.style} options={STYLE_IDS} labels={STYLE_LABELS} onChange={(v) => setStyle(i, v)} /></td>
                  <td className={changed(u, "perks")}>{perksLine(u)}</td>
                  <td className={changed(u, "proj")}><Select value={u.proj} options={PROJECTILES} onChange={(v) => set(i, "proj", v)} /></td>
                  <td className={changed(u, "weapon")}><Select value={u.weapon ?? "none"} options={WEAPON_OPTIONS} onChange={(v) => set(i, "weapon", v === "none" ? undefined : v)} /></td>
                  <td className={changed(u, "damage")}><Num value={u.damage} step={0.5} min={0} onChange={(v) => set(i, "damage", v)} /></td>
                  <td className={changed(u, "speed")}><Num value={u.speed} step={0.05} min={0} onChange={(v) => set(i, "speed", v)} /></td>
                  <td className="num-cell">{noAttack(primaryArch(u)) ? "—" : (s.damage * s.speed).toFixed(1)}</td>
                  <td className={changed(u, "enabled")}><Toggle value={u.enabled} onChange={(v) => set(i, "enabled", v)} /></td>
                  <td className={changed(u, "blurb")}><Text value={u.blurb} onChange={(v) => set(i, "blurb", v)} width={220} /></td>
                </tr>
                {open.has(u.id) && (
                  <tr>
                    <td colSpan={16}>
                      <KitEditor unit={u} rank={rank} effects={draft.effects} perkValues={draft.perks} onKit={(kit) => set(i, "kit", kit)} onPerks={(perks) => set(i, "perks", perks)} />
                    </td>
                  </tr>
                )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="muted small">Units with an awakened portrait awaken when merged to the max rank (that and the numbers on the Economy page). Turning a unit off removes it from chests and decks; players keep their copies.</p>
    </>
  );
}
