import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { useConfig } from "../config";
import { PageHead, Stat, toast } from "../components";
import { Legend, TimeChart } from "../chart";

interface Analytics {
  from: string;
  to: string;
  /** Days after sign-up retention is measured on (1, 3, 7...). */
  days: number[];
  daily: { day: string; newPlayers: number; activePlayers: number; battles: number; avgWave: number | null }[];
  arenas: { day: string; arena: string; battles: number; waveSum: number }[];
  /** Newest first; retained[i] is null when the cohort isn't days[i] old yet. */
  cohorts: { day: string; size: number; retained: (number | null)[] }[];
  overall: { players: number; rate: number | null }[];
}

const RANGES = [14, 30, 90] as const;
const C = { active: "#6c7cff", fresh: "#f2b630", battles: "#1f9d55", wave: "#d64545" };
/** Distinct colours for arena lines, in arena order. */
const arenaColor = (i: number) => `hsl(${(i * 137.5) % 360} 65% 48%)`;

const pct = (v: number | null) => (v === null ? "—" : v === 0 ? "0%" : `${(v * 100).toFixed(v < 0.1 ? 1 : 0)}%`);

/** Monday of the UTC week a day falls in. */
function weekOf(day: string) {
  const t = Date.parse(day);
  const dow = (new Date(t).getUTCDay() + 6) % 7;
  return new Date(t - dow * 86400_000).toISOString().slice(0, 10);
}

export function AnalyticsPage() {
  const { saved } = useConfig();
  const [range, setRange] = useState<(typeof RANGES)[number]>(30);
  const [a, setA] = useState<Analytics | null>(null);
  const [weekly, setWeekly] = useState(false);
  const [picked, setPicked] = useState<string[] | null>(null);

  useEffect(() => {
    setA(null);
    api<Analytics>("GET", `/analytics?days=${range}`).then(setA).catch((e) => toast(e.message, "err"));
  }, [range]);

  const arenaName = (id: string) => saved?.arenas.find((x) => x.id === id)?.name ?? id;
  const arenaOrder = (saved?.arenas ?? []).map((x) => x.id);

  // Average wave per arena per day (or per week), weighted by battles.
  const arenaChart = useMemo(() => {
    if (!a) return null;
    const key = (d: string) => (weekly ? weekOf(d) : d);
    const x = [...new Set(a.daily.map((d) => key(d.day)))];
    const totals = new Map<string, number>();
    const cells = new Map<string, { n: number; sum: number }>();
    for (const r of a.arenas) {
      totals.set(r.arena, (totals.get(r.arena) ?? 0) + r.battles);
      const c = cells.get(`${r.arena}|${key(r.day)}`) ?? { n: 0, sum: 0 };
      c.n += r.battles;
      c.sum += r.waveSum;
      cells.set(`${r.arena}|${key(r.day)}`, c);
    }
    const ids = [...totals.keys()].sort((p, q) => (arenaOrder.indexOf(p) + 1 || 999) - (arenaOrder.indexOf(q) + 1 || 999));
    return { x, ids, totals, cells };
  }, [a, weekly, saved]);

  if (!a || !arenaChart) return <div className="muted">Loading…</div>;

  // By default show the 6 most played arenas.
  const shown = picked ?? [...arenaChart.ids].sort((p, q) => arenaChart.totals.get(q)! - arenaChart.totals.get(p)!).slice(0, 6);
  const arenaSeries = arenaChart.ids
    .filter((id) => shown.includes(id))
    .map((id) => ({
      label: arenaName(id),
      color: arenaColor(Math.max(0, arenaOrder.indexOf(id))),
      kind: "line" as const,
      values: arenaChart.x.map((d) => {
        const c = arenaChart.cells.get(`${id}|${d}`);
        return c ? +(c.sum / c.n).toFixed(1) : null;
      }),
    }));

  const x = a.daily.map((d) => d.day);
  const sum = (k: "newPlayers" | "battles") => a.daily.reduce((s, d) => s + d[k], 0);
  const avgDau = a.daily.reduce((s, d) => s + d.activePlayers, 0) / a.daily.length;
  const toggle = (id: string) => setPicked(shown.includes(id) ? shown.filter((s) => s !== id) : [...shown, id]);

  return (
    <>
      <PageHead title="Analytics" desc={`Players, retention and arena difficulty from ${a.from} to ${a.to} (UTC days).`}>
        <div className="seg">
          {RANGES.map((r) => (
            <button key={r} className={r === range ? "on" : ""} onClick={() => setRange(r)}>
              {r} days
            </button>
          ))}
        </div>
      </PageHead>

      <div className="stats">
        <Stat label="New players" value={sum("newPlayers").toLocaleString()} sub={`in ${a.daily.length} days`} />
        <Stat label="Daily active (avg)" value={Math.round(avgDau).toLocaleString()} sub={`${a.daily.at(-1)!.activePlayers} today`} />
        <Stat label="Battles" value={sum("battles").toLocaleString()} sub={`${a.daily.at(-1)!.battles} today`} />
        {a.days.map((d, i) => (
          <Stat key={d} label={`Day ${d} retention`} value={pct(a.overall[i].rate)} sub={a.overall[i].players ? `of ${a.overall[i].players.toLocaleString()} players` : "no cohort old enough"} />
        ))}
      </div>

      <section className="panel">
        <h2>Players per day</h2>
        <Legend series={[{ label: "Active players", color: C.active }, { label: "New players", color: C.fresh }]} />
        <TimeChart
          x={x}
          series={[
            { label: "Active players", color: C.active, kind: "bar", values: a.daily.map((d) => d.activePlayers) },
            { label: "New players", color: C.fresh, kind: "bar", values: a.daily.map((d) => d.newPlayers) },
          ]}
        />
      </section>

      <section className="panel">
        <h2>Retention by sign-up day</h2>
        <p className="muted small">
          Of the players who signed up on a day, the share who came back exactly N days later (any signed-in visit counts).
          Blank cells: that group isn't old enough yet. Activity is recorded from this version on; older days are rebuilt from
          sign-up, battle and last-seen dates, so they undercount.
        </p>
        {a.cohorts.length === 0 ? (
          <p className="muted">No sign-ups in this range.</p>
        ) : (
          <div className="table-wrap">
            <table className="grid compact retention">
              <thead>
                <tr>
                  <th>Signed up</th>
                  <th>Players</th>
                  {a.days.map((d) => (
                    <th key={d}>Day {d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {a.cohorts.map((c) => (
                  <tr key={c.day}>
                    <td>{c.day}</td>
                    <td className="num-cell">{c.size}</td>
                    {c.retained.map((n, i) => {
                      const rate = n === null ? null : n / c.size;
                      return (
                        <td key={i} className="num-cell" title={n === null ? "" : `${n} of ${c.size}`} style={rate === null ? undefined : { background: `color-mix(in srgb, var(--ok) ${Math.round(rate * 85)}%, transparent)` }}>
                          {n === null ? "" : pct(rate)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Average wave per arena</h2>
          <div className="seg">
            <button className={!weekly ? "on" : ""} onClick={() => setWeekly(false)}>
              Daily
            </button>
            <button className={weekly ? "on" : ""} onClick={() => setWeekly(true)}>
              Weekly
            </button>
          </div>
        </div>
        <p className="muted small">
          How far finished battles got, per arena. A drop after a balance change points at a difficulty spike. Days with few
          battles are noisy; weekly smooths them. Pick arenas below (the 6 most played are shown first).
        </p>
        {arenaChart.ids.length === 0 ? (
          <p className="muted">No battles in this range.</p>
        ) : (
          <>
            <div className="chips" style={{ marginBottom: 8 }}>
              {arenaChart.ids.map((id) => (
                <button key={id} type="button" className={shown.includes(id) ? "chip on" : "chip"} onClick={() => toggle(id)}>
                  <span className="dot" style={{ background: arenaColor(Math.max(0, arenaOrder.indexOf(id))) }} />
                  {arenaName(id)} <span className="muted">({arenaChart.totals.get(id)})</span>
                </button>
              ))}
            </div>
            <TimeChart x={arenaChart.x} series={arenaSeries} height={260} tipPrefix={weekly ? "Week of " : ""} format={(v) => (Number.isInteger(v) ? String(v) : v.toFixed(1))} />
          </>
        )}
      </section>

      <section className="panel">
        <h2>Battles per day</h2>
        <Legend series={[{ label: "Battles", color: C.battles }, { label: "Average wave (all arenas)", color: C.wave }]} />
        <TimeChart x={x} series={[{ label: "Battles", color: C.battles, kind: "bar", values: a.daily.map((d) => d.battles) }]} height={180} />
        <TimeChart x={x} series={[{ label: "Average wave", color: C.wave, kind: "line", values: a.daily.map((d) => d.avgWave) }]} height={160} format={(v) => (Number.isInteger(v) ? String(v) : v.toFixed(1))} />
      </section>
    </>
  );
}
