import { useEffect, useState } from "react";
import { useConfig } from "../config";
import { api, ASSETS } from "../api";
import { Num, PageHead, Select, Stat, Text, Toggle, fmtDate, timeAgo } from "../components";
import { applyConfig, withPvpDefaults, type GameConfig } from "../../../shared/config.ts";
import { pvpArena, tiersByRating, type Loadout, type PvpRules, type RankTier, type SendDef } from "../../../shared/pvp.ts";
import { PvpBoard } from "../../../shared/pvpsim.ts";
import { PvpBot } from "../../../shared/pvpbot.ts";

type RuleField = { label: string; step?: number; int?: boolean; hint?: string };

/** The rules, grouped the way PVP.md explains them. */
const RULES: { title: string; fields: Partial<Record<keyof PvpRules, RuleField>> }[] = [
  {
    title: "Match",
    fields: {
      hp: { label: "Starting HP", int: true },
      leakDamage: { label: "HP lost per leak", int: true },
      tankLeakDamage: { label: "HP lost per tank leak", int: true },
      bossLeakDamage: { label: "HP lost per boss leak", int: true },
      waveSeconds: { label: "Seconds per wave" },
      bossWaveSeconds: { label: "Seconds per boss wave" },
      firstWaveDelay: { label: "Seconds before wave 1" },
      waveHpScale: { label: "Wave health vs solo", step: 0.05, hint: "1 = as hard as solo" },
      suddenDeathWave: { label: "Sudden death from wave", int: true },
      suddenDeathGrowth: { label: "Health growth per wave in sudden death", step: 0.01 },
      maxWave: { label: "Last wave (more HP wins)", int: true },
    },
  },
  {
    title: "Mana and sends",
    fields: {
      baseIncome: { label: "Base income", int: true },
      incomeEvery: { label: "Income every (seconds)" },
      sendDelay: { label: "Send warning (seconds)", step: 0.5 },
      sentManaShare: { label: "Mana for killing a sent monster", step: 0.05, hint: "share of its normal mana" },
    },
  },
  {
    title: "Modes and rewards",
    fields: {
      mirrorLevel: { label: "Mirror: card level", int: true },
      trophyWin: { label: "Ranked: trophies for a win", int: true },
      trophyLoss: { label: "Ranked: trophies for a loss", int: true },
      trophyGapStep: { label: "Trophy swing per 100 trophies apart", step: 0.5 },
      winCoins: { label: "Gold for a win", int: true },
      lossCoins: { label: "Gold for a loss", int: true },
      drawCoins: { label: "Gold for a draw", int: true },
    },
  },
  {
    title: "Ranked rating",
    fields: {
      ratingStart: { label: "Starting rating", int: true, step: 50 },
      ratingK: { label: "Most rating per match (K)", int: true, hint: "an even match moves half of this" },
      ratingPlacementK: { label: "K during placement", int: true },
      ratingPlacementGames: { label: "Placement matches", int: true },
    },
  },
  {
    title: "Matchmaking",
    fields: {
      botAfterSeconds: { label: "Bot after (seconds)", int: true },
      challengeMinutes: { label: "Friend challenge code lasts (minutes)", step: 0.5 },
      matchBand: { label: "Ranked: starting rating band", int: true, step: 10 },
      matchBandGrowth: { label: "Band widens per second", int: true, step: 5 },
    },
  },
];

const SEND_NUMS: { k: keyof SendDef; label: string; step?: number; int?: boolean }[] = [
  { k: "count", label: "Count", int: true },
  { k: "hpMult", label: "Health ×", step: 0.1 },
  { k: "cost", label: "Cost", int: true, step: 10 },
  { k: "income", label: "Income +", int: true },
  { k: "unlockWave", label: "Unlock wave", int: true },
  { k: "cooldown", label: "Cooldown s (0 = none)" },
  { k: "stock", label: "Charges", int: true },
  { k: "leakDamage", label: "Leak HP", int: true },
];

export function PvpPage() {
  const { draft, saved, edit } = useConfig();
  if (!draft || !saved) return <div className="muted">Loading…</div>;
  const p = withPvpDefaults(draft.pvp);
  const before = withPvpDefaults(saved.pvp);
  const editPvp = (fn: (pvp: ReturnType<typeof withPvpDefaults>) => void) =>
    edit((c) => {
      c.pvp = withPvpDefaults(c.pvp);
      fn(c.pvp);
    });
  const monsters = ["boss", ...draft.monsters.map((m) => m.id)];
  const sendChanged = (s: SendDef, k: keyof SendDef) => {
    const b = before.sends.find((x) => x.id === s.id);
    return !b || b[k] !== s[k] ? "changed" : "";
  };
  const addSend = () =>
    editPvp((v) => {
      let n = v.sends.length + 1;
      while (v.sends.some((s) => s.id === `send_${n}`)) n++;
      v.sends.push({ id: `send_${n}`, name: "New send", monster: draft.monsters[0].id, count: 4, hpMult: 1, cost: 100, income: 5, unlockWave: 1, cooldown: 8, stock: 2, leakDamage: 1, enabled: true });
    });

  return (
    <>
      <PageHead
        title="PvP"
        desc="Both players get the same waves on a fixed clock and can spend mana on sends: extra monsters for the other board, which also raise the sender's income. Modes: Ranked (own deck, real levels, trophies and a ranked rating of its own), Mirror (one random deck and hero for both, same level) and Casual (own deck, every card level 1). See PVP.md."
      />
      <div className="two-col">
        {RULES.map((group) => (
          <section className="panel" key={group.title}>
            <h2>{group.title}</h2>
            <table className="kv">
              <tbody>
                {(Object.entries(group.fields) as [keyof PvpRules, RuleField][]).map(([k, f]) => (
                  <tr key={k} className={p.rules[k] !== before.rules[k] ? "changed" : ""}>
                    <td>
                      {f.label}
                      <div className="id">
                        {k}
                        {f.hint && ` · ${f.hint}`}
                      </div>
                    </td>
                    <td>
                      <Num value={p.rules[k]} step={f.step ?? 1} min={0} onChange={(v) => editPvp((x) => void (x.rules[k] = f.int ? Math.round(v) : v))} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </div>

      <h2 style={{ marginTop: 24 }}>Sends</h2>
      <div className="table-wrap">
        <table className="grid">
          <thead>
            <tr>
              <th></th>
              <th>Name</th>
              <th>Monster</th>
              {SEND_NUMS.map((f) => (
                <th key={f.k}>{f.label}</th>
              ))}
              <th title="Income gained per 100 mana spent">Payback</th>
              <th>On</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {p.sends.map((s, i) => (
              <tr key={i} className={s.enabled ? "" : "muted"}>
                <td>
                  <img className="thumb" width={40} height={40} alt="" crossOrigin="anonymous" src={`${ASSETS}${s.monster === "boss" ? `bosses/${draft.arenas[0].bosses[0]}` : `monsters/${s.monster}`}.webp`} />
                </td>
                <td className={sendChanged(s, "name")}>
                  <Text value={s.name} width={110} onChange={(v) => editPvp((x) => void (x.sends[i].name = v))} />
                  <div className="id">{s.id}</div>
                </td>
                <td className={sendChanged(s, "monster")}>
                  <Select value={s.monster} options={monsters} labels={{ boss: "Arena boss" }} onChange={(v) => editPvp((x) => void (x.sends[i].monster = v))} />
                </td>
                {SEND_NUMS.map((f) => (
                  <td key={f.k} className={sendChanged(s, f.k)}>
                    <Num value={s[f.k] as number} step={f.step ?? 1} min={0} width={64} onChange={(v) => editPvp((x) => void ((x.sends[i][f.k] as number) = f.int ? Math.round(v) : v))} />
                  </td>
                ))}
                <td className="muted">{s.cost ? ((100 * s.income) / s.cost).toFixed(1) : "—"}</td>
                <td className={sendChanged(s, "enabled")}>
                  <Toggle value={s.enabled} onChange={(v) => editPvp((x) => void (x.sends[i].enabled = v))} />
                </td>
                <td>
                  <button className="btn small ghost" onClick={() => editPvp((x) => void x.sends.splice(i, 1))}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="btn small" style={{ marginTop: 10 }} onClick={addSend}>
        Add send
      </button>
      <p className="muted small">
        Health × multiplies that monster's normal health on the wave the send lands (for the arena boss, its boss-wave
        health). Payback is income per 100 mana: higher means the send pays for itself sooner. A sent monster pays the
        killer only part of its mana (see Mana and sends).
      </p>

      <Tiers tiers={p.tiers} before={before.tiers} edit={(fn) => editPvp((x) => fn(x.tiers))} />

      <BotTest draft={draft} />
      <RecentMatches />
    </>
  );
}

/** Ranked tiers: names for bands of ranked rating (separate from the trophy leagues). */
function Tiers({ tiers, before, edit }: { tiers: RankTier[]; before: RankTier[]; edit: (fn: (t: RankTier[]) => void) => void }) {
  const changed = (t: RankTier, k: keyof RankTier) => {
    const b = before.find((x) => x.id === t.id);
    return !b || b[k] !== t[k] ? "changed" : "";
  };
  const order = tiers.map((t, i) => ({ t, i })).sort((a, b) => a.t.rating - b.t.rating);
  const add = () =>
    edit((list) => {
      let n = list.length + 1;
      while (list.some((t) => t.id === `tier_${n}`)) n++;
      const top = Math.max(0, ...tiersByRating(list).map((t) => t.rating));
      list.push({ id: `tier_${n}`, name: "New Tier", rating: top + 200, color: "#ffffff" });
    });
  return (
    <section className="panel" style={{ marginTop: 24 }}>
      <h2>Ranked tiers</h2>
      <p className="muted small">
        A player's tier is the highest one whose rating they've reached. Ranked rating is separate from trophies: it only
        moves in ranked matches (Elo: beating a higher-rated player gains more) and ranked matchmaking pairs on it. One tier must start at 0.
      </p>
      <div className="table-wrap">
        <table className="grid">
          <thead>
            <tr>
              <th>Name</th>
              <th>Rating from</th>
              <th>Colour</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {order.map(({ t, i }) => (
              <tr key={i}>
                <td className={changed(t, "name")}>
                  <Text value={t.name} width={140} onChange={(v) => edit((x) => void (x[i].name = v))} />
                  <div className="id">{t.id}</div>
                </td>
                <td className={changed(t, "rating")}>
                  <Num value={t.rating} min={0} step={50} onChange={(v) => edit((x) => void (x[i].rating = Math.round(v)))} />
                </td>
                <td className={changed(t, "color")}>
                  <input type="color" value={t.color} onChange={(e) => edit((x) => void (x[i].color = e.target.value))} />
                </td>
                <td>
                  <button className="btn small ghost" disabled={tiers.length <= 1} onClick={() => edit((x) => void x.splice(i, 1))}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="btn small" style={{ marginTop: 10 }} onClick={add}>
        Add tier
      </button>
    </section>
  );
}

/** Bot-vs-bot matches on the draft config: how long matches run and what ends them. */
function BotTest({ draft }: { draft: GameConfig }) {
  const [skill, setSkill] = useState<[number, number]>([0.6, 0.6]);
  const [out, setOut] = useState<null | { minutes: number; waves: [number, number, number]; byHp: number; byWave: number; wins: [number, number, number]; sends: number }>(null);
  const run = () => {
    applyConfig(draft);
    const deck = draft.economy.starterDeck;
    const loadout = (name: string): Loadout => ({ name, trophies: 0, deck, levels: Object.fromEntries(deck.map((id) => [id, 3])), hero: draft.heroes.find((h) => h.enabled && h.price === 0)?.id ?? null });
    const n = 20;
    let seconds = 0;
    let sends = 0;
    let byHp = 0;
    const waves: number[] = [];
    const wins: [number, number, number] = [0, 0, 0];
    for (let i = 0; i < n; i++) {
      const seed = 5000 + i;
      const arena = pvpArena(seed);
      const boards = [0, 1].map((side) => new PvpBoard({ seed, side: side as 0 | 1, arena, loadout: loadout(`bot${side}`) }));
      const bots = [0, 1].map((side) => new PvpBot(boards[side], skill[side], seed + side, (id) => boards[1 - side].apply({ t: "recv", id })));
      while (!boards[0].over && !boards[1].over) {
        bots[0].think();
        bots[1].think();
        boards[0].tick();
        boards[1].tick();
      }
      const [a, b] = boards;
      const lost = [a.outcome === "lost", b.outcome === "lost"];
      wins[lost[0] && lost[1] ? 2 : lost[0] ? 1 : lost[1] ? 0 : a.hp === b.hp ? 2 : a.hp > b.hp ? 0 : 1]++;
      if (lost[0] || lost[1]) byHp++;
      seconds += a.now;
      sends += a.counts.sends + b.counts.sends;
      waves.push(Math.max(a.wave, b.wave));
    }
    setOut({
      minutes: seconds / n / 60,
      waves: [Math.min(...waves), waves.reduce((x, y) => x + y, 0) / n, Math.max(...waves)],
      byHp,
      byWave: n - byHp,
      wins,
      sends: sends / n / 2,
    });
  };
  return (
    <section className="panel" style={{ marginTop: 24 }}>
      <h2>Bot test</h2>
      <p className="muted small">
        Plays 20 matches between two bots on this draft (the starter deck at card level 3), right here in the browser.
        Skill 0-1 sets how quickly a bot acts and how much it sends.
      </p>
      <div className="row" style={{ gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <span>Bot A skill</span>
        <Num value={skill[0]} step={0.1} min={0} onChange={(v) => setSkill([Math.min(1, v), skill[1]])} />
        <span>Bot B skill</span>
        <Num value={skill[1]} step={0.1} min={0} onChange={(v) => setSkill([skill[0], Math.min(1, v)])} />
        <button className="btn small" onClick={run}>
          Run 20 matches
        </button>
      </div>
      {out && (
        <div className="stats" style={{ marginTop: 12 }}>
          <Stat label="Average length" value={`${out.minutes.toFixed(1)} min`} />
          <Stat label="Last wave reached" value={out.waves[1].toFixed(1)} sub={`${out.waves[0]} to ${out.waves[2]}`} />
          <Stat label="Ended by" value={`${out.byHp} HP`} sub={`${out.byWave} at the last wave`} />
          <Stat label="Wins A / B / draw" value={out.wins.join(" / ")} />
          <Stat label="Sends per bot" value={out.sends.toFixed(1)} />
        </div>
      )}
    </section>
  );
}

interface MatchRow {
  id: string;
  mode: string;
  friendly: number | null;
  practice: number | null;
  p1: number;
  p2: number | null;
  name1: string | null;
  name2: string | null;
  botName: string | null;
  arena: string;
  startedAt: number;
  finishedAt: number | null;
  winner: 0 | 1 | null;
  reason: string | null;
  trophies1: number | null;
  trophies2: number | null;
  rating1: number | null;
  rating2: number | null;
  hasLog1: number;
  hasLog2: number;
}

function RecentMatches() {
  const [data, setData] = useState<{ rows: MatchRow[]; summary: { matches: number; botMatches: number; unfinished: number; avgMs: number | null } } | null>(null);
  useEffect(() => {
    api<typeof data>("GET", "/pvp/matches").then(setData, () => setData(null));
  }, []);
  if (!data) return null;
  const s = data.summary;
  const name = (m: MatchRow, i: 0 | 1) => (i === 0 ? m.name1 : m.p2 === null ? `${m.botName} (bot)` : m.name2) ?? "?";
  const result = (m: MatchRow) => (!m.finishedAt ? "playing" : m.winner === null ? "draw" : `${name(m, m.winner)} won`);
  const trophies = (v: number | null) => (v ? `${v > 0 ? "+" : ""}${v}` : "");
  return (
    <section className="panel" style={{ marginTop: 24 }}>
      <h2>Recent matches</h2>
      <div className="stats">
        <Stat label="Matches, last 24h" value={s.matches ?? 0} sub={`${s.botMatches ?? 0} against bots`} />
        <Stat label="Average length" value={s.avgMs ? `${(s.avgMs / 60000).toFixed(1)} min` : "—"} />
        <Stat label="Unfinished" value={s.unfinished ?? 0} />
      </div>
      <div className="table-wrap">
        <table className="grid">
          <thead>
            <tr>
              <th>Started</th>
              <th>Mode</th>
              <th>Players</th>
              <th>Arena</th>
              <th>Result</th>
              <th>Trophies</th>
              <th>Rating</th>
              <th>Length</th>
              <th>Logs</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((m) => (
              <tr key={m.id}>
                <td title={fmtDate(m.startedAt)}>{timeAgo(m.startedAt)}</td>
                <td>{m.practice ? `practice (${m.mode})` : m.friendly ? `friendly (${m.mode === "ranked" ? "real levels" : m.mode})` : m.mode}</td>
                <td>
                  <a href={`#/users/${m.p1}`}>{name(m, 0)}</a> vs {m.p2 ? <a href={`#/users/${m.p2}`}>{name(m, 1)}</a> : name(m, 1)}
                </td>
                <td>{m.arena}</td>
                <td>
                  {result(m)}
                  {m.reason && m.reason !== "hp" && <span className="muted small"> · {m.reason}</span>}
                </td>
                <td>
                  {trophies(m.trophies1)} {m.p2 ? `/ ${trophies(m.trophies2)}` : ""}
                </td>
                <td>
                  {trophies(m.rating1)} {m.p2 ? `/ ${trophies(m.rating2)}` : ""}
                </td>
                <td>{m.finishedAt ? `${((m.finishedAt - m.startedAt) / 60000).toFixed(1)} min` : "—"}</td>
                <td className="muted small">{[m.hasLog1 && "P1", m.hasLog2 && "P2"].filter(Boolean).join(", ") || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
