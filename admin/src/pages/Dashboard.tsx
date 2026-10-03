import { useEffect, useState } from "react";
import { api, asset } from "../api";
import { useConfig } from "../config";
import { PageHead, Stat, Thumb, toast } from "../components";

interface Stats {
  users: number;
  registered: number;
  banned: number;
  activeToday: number;
  newToday: number;
  battles: number;
  battlesToday: number;
  configVersion: number;
  topPlayers: { id: number; name: string; trophies: number; bestWave: number }[];
  arenaPopularity: { arena: string; battles: number; avgWave: number; maxWave: number }[];
  unitPopularity: { unit: string; decks: number }[];
  leagues: { league: string; players: number }[];
}

export function Dashboard() {
  const { saved } = useConfig();
  const [s, setS] = useState<Stats | null>(null);
  useEffect(() => {
    api<Stats>("GET", "/stats").then(setS).catch((e) => toast(e.message, "err"));
  }, []);
  if (!s) return <div className="muted">Loading…</div>;
  const unitName = (id: string) => saved?.units.find((u) => u.id === id)?.name ?? id;
  const arenaName = (id: string) => saved?.arenas.find((a) => a.id === id)?.name ?? id;
  const maxDecks = Math.max(1, ...s.unitPopularity.map((u) => u.decks));
  const leagueName = (id: string) => saved?.leagues.find((l) => l.id === id)?.name ?? id;
  const maxLeague = Math.max(1, ...s.leagues.map((l) => l.players));

  return (
    <>
      <PageHead title="Dashboard" desc={`Live game config: version ${s.configVersion}`} />
      <div className="stats">
        <Stat label="Players" value={s.users.toLocaleString()} sub={`${s.registered} registered · ${s.banned} banned`} />
        <Stat label="Active today" value={s.activeToday.toLocaleString()} sub={`${s.newToday} new`} />
        <Stat label="Battles" value={s.battles.toLocaleString()} sub={`${s.battlesToday} today`} />
      </div>
      <div className="two-col">
        <section className="panel">
          <h2>Top players</h2>
          <table className="grid compact clickable">
            <thead>
              <tr>
                <th>#</th>
                <th>Player</th>
                <th>Trophies</th>
                <th>Best wave</th>
              </tr>
            </thead>
            <tbody>
              {s.topPlayers.map((p, i) => (
                <tr key={p.id} onClick={() => (location.hash = `/users/${p.id}`)}>
                  <td className="muted">{i + 1}</td>
                  <td>{p.name}</td>
                  <td className="num-cell">{p.trophies}</td>
                  <td className="num-cell">{p.bestWave}</td>
                </tr>
              ))}
              {!s.topPlayers.length && (
                <tr>
                  <td colSpan={4} className="muted center">No players yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
        <section className="panel">
          <h2>Arenas</h2>
          <p className="muted small">How far players get in each arena — useful for spotting difficulty spikes.</p>
          <table className="grid compact">
            <thead>
              <tr>
                <th>Arena</th>
                <th>Battles</th>
                <th>Avg wave</th>
                <th>Best</th>
              </tr>
            </thead>
            <tbody>
              {s.arenaPopularity.map((a) => (
                <tr key={a.arena}>
                  <td>{arenaName(a.arena)}</td>
                  <td className="num-cell">{a.battles}</td>
                  <td className="num-cell">{a.avgWave}</td>
                  <td className="num-cell">{a.maxWave}</td>
                </tr>
              ))}
              {!s.arenaPopularity.length && (
                <tr>
                  <td colSpan={4} className="muted center">No battles yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
        <section className="panel">
          <h2>Leagues</h2>
          <p className="muted small">Players (not banned) in each league by their current trophies.</p>
          {s.leagues.map((l) => (
            <div className="bar-row" key={l.league}>
              <Thumb src={asset("ui", `league_${saved?.leagues.find((x) => x.id === l.league)?.icon ?? 0}`)} size={28} />
              <span className="bar-label">{leagueName(l.league)}</span>
              <div className="bar">
                <div style={{ width: `${(l.players / maxLeague) * 100}%` }} />
              </div>
              <span className="num-cell">{l.players}</span>
            </div>
          ))}
        </section>
        <section className="panel">
          <h2>Most used units</h2>
          <p className="muted small">Number of player decks containing each unit.</p>
          {s.unitPopularity.map((u) => (
            <div className="bar-row" key={u.unit}>
              <Thumb src={asset("portraits", u.unit)} size={28} />
              <span className="bar-label">{unitName(u.unit)}</span>
              <div className="bar">
                <div style={{ width: `${(u.decks / maxDecks) * 100}%` }} />
              </div>
              <span className="num-cell">{u.decks}</span>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
