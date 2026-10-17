import { useConfig } from "../config";
import { ASSETS } from "../api";
import { Num, Text, Select, PageHead } from "../components";
import { TROPHY_BASE, type LeagueDef, type SocietyRules } from "../../../shared/leagues.ts";
import type { GameConfig } from "../../../shared/config.ts";

const NO_CHEST = "(none)";

export function LeaguesPage() {
  const { draft, saved, edit } = useConfig();
  if (!draft || !saved) return <div className="muted">Loading…</div>;
  const chests = draft.chests.map((c) => c.id);
  const set = <K extends keyof LeagueDef>(i: number, k: K, v: LeagueDef[K]) => edit((c) => void (c.leagues[i][k] = v));
  const setReward = (i: number, fn: (r: LeagueDef["reward"]) => void) => edit((c) => fn(c.leagues[i].reward));
  const setSociety = (i: number, k: keyof SocietyRules, v: number) => edit((c) => void (c.leagues[i].society![k] = v));
  const SOCIETY: SocietyRules = { entryCoins: 5_000_000, entryGems: 10_000, duesCoins: 30_000, duesGems: 1_000, duesDays: 30 };
  const changed = (l: LeagueDef, k: keyof LeagueDef) => {
    const before = saved.leagues.find((s) => s.id === l.id);
    return !before || JSON.stringify(before[k]) !== JSON.stringify(l[k]) ? "changed" : "";
  };
  const add = () =>
    edit((c: GameConfig) => {
      let n = c.leagues.length + 1;
      while (c.leagues.some((l) => l.id === `league_${n}`)) n++;
      const top = Math.max(0, ...c.leagues.map((l) => l.trophies));
      c.leagues.push({
        id: `league_${n}`,
        name: "New League",
        trophies: top + 1000,
        color: "#ffffff",
        icon: c.leagues.length,
        reward: { coins: 1000, gems: 50, chest: null },
        minWave: 50,
        gainPerWave: 1,
        lossPerWave: 8,
        maxLoss: 50,
      });
    });
  const order = draft.leagues.map((l, i) => ({ l, i })).sort((a, b) => a.l.trophies - b.l.trophies);

  return (
    <>
      <PageHead
        title="Leagues"
        desc={`A player's league is the highest one whose trophy gate they've reached, so losing trophies can drop them back down. The promotion reward is paid once per player, the first time they reach the league (when a battle ends). Solo runs: reaching Min wave gains ${TROPHY_BASE} + (wave − Min wave) × Gain/wave trophies, with no cap; falling short loses ${TROPHY_BASE} + (Min wave − wave) × Loss/wave, at most Max loss. Only a player's two highest arenas count.`}
      />
      <div className="table-wrap">
        <table className="grid">
          <thead>
            <tr>
              <th>Icon</th>
              <th>Name</th>
              <th>Trophies</th>
              <th>Colour</th>
              <th title="Slice number in ui/league_ranks.png (ui/league_N.webp)">Icon #</th>
              <th>Gold</th>
              <th>Gems</th>
              <th>Chest</th>
              <th title="Wave a solo run must reach to gain trophies">Min wave</th>
              <th title="Trophies per wave past Min wave">Gain/wave</th>
              <th title="Trophies per wave short of Min wave">Loss/wave</th>
              <th>Max loss</th>
              <th title="Invite-only: hidden as ??? until joined; entry fee then monthly dues">Society</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {order.map(({ l, i }) => (
              <tr key={i}>
                <td>
                  <img
                    className="thumb"
                    crossOrigin="anonymous"
                    src={`${ASSETS}ui/league_${l.icon}.webp`}
                    width={44}
                    height={44}
                    alt=""
                    style={{ background: l.color, borderRadius: 8 }}
                    onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0.6")}
                  />
                </td>
                <td className={changed(l, "name")}>
                  <Text value={l.name} onChange={(v) => set(i, "name", v)} width={160} />
                  <div className="id">{l.id}</div>
                </td>
                <td className={changed(l, "trophies")}><Num value={l.trophies} min={0} step={100} onChange={(v) => set(i, "trophies", Math.round(v))} /></td>
                <td className={changed(l, "color")}>
                  <input type="color" value={/^#[0-9a-f]{6}$/i.test(l.color) ? l.color : "#ffffff"} onChange={(e) => set(i, "color", e.target.value)} />
                </td>
                <td className={changed(l, "icon")}><Num value={l.icon} min={0} width={60} onChange={(v) => set(i, "icon", Math.round(v))} /></td>
                {l.trophies === 0 ? (
                  <td colSpan={3} className="muted small">Starting league: no promotion reward</td>
                ) : (
                  <>
                    <td className={changed(l, "reward")}><Num value={l.reward.coins} min={0} step={100} onChange={(v) => setReward(i, (r) => void (r.coins = v))} /></td>
                    <td className={changed(l, "reward")}><Num value={l.reward.gems} min={0} step={10} onChange={(v) => setReward(i, (r) => void (r.gems = v))} /></td>
                    <td className={changed(l, "reward")}>
                      <Select value={l.reward.chest ?? NO_CHEST} options={[NO_CHEST, ...chests]} onChange={(v) => setReward(i, (r) => void (r.chest = v === NO_CHEST ? null : v))} />
                    </td>
                  </>
                )}
                <td className={changed(l, "minWave")}><Num value={l.minWave} min={1} width={60} onChange={(v) => set(i, "minWave", Math.round(v))} /></td>
                <td className={changed(l, "gainPerWave")}><Num value={l.gainPerWave} min={0} width={60} onChange={(v) => set(i, "gainPerWave", v)} /></td>
                <td className={changed(l, "lossPerWave")}><Num value={l.lossPerWave} min={0} width={60} onChange={(v) => set(i, "lossPerWave", v)} /></td>
                <td className={changed(l, "maxLoss")}><Num value={l.maxLoss} min={0} width={60} onChange={(v) => set(i, "maxLoss", Math.round(v))} /></td>
                <td className={changed(l, "society")}>
                  <label className="small">
                    <input type="checkbox" checked={!!l.society} onChange={(e) => set(i, "society", e.target.checked ? { ...SOCIETY } : null)} /> invite-only
                  </label>
                  {l.society ? (
                    <div className="small" style={{ display: "grid", gridTemplateColumns: "auto auto", gap: 4, marginTop: 4 }}>
                      <span>Entry gold</span><Num value={l.society.entryCoins} min={0} step={100000} width={90} onChange={(v) => setSociety(i, "entryCoins", Math.round(v))} />
                      <span>Entry gems</span><Num value={l.society.entryGems} min={0} step={100} width={90} onChange={(v) => setSociety(i, "entryGems", Math.round(v))} />
                      <span>Dues gold</span><Num value={l.society.duesCoins} min={0} step={1000} width={90} onChange={(v) => setSociety(i, "duesCoins", Math.round(v))} />
                      <span>Dues gems</span><Num value={l.society.duesGems} min={0} step={100} width={90} onChange={(v) => setSociety(i, "duesGems", Math.round(v))} />
                      <span>Every (days)</span><Num value={l.society.duesDays} min={1} width={90} onChange={(v) => setSociety(i, "duesDays", Math.round(v))} />
                    </div>
                  ) : null}
                </td>
                <td>
                  <button className="btn small ghost" disabled={draft.leagues.length <= 1} onClick={() => edit((c) => void c.leagues.splice(i, 1))}>
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="btn small" style={{ marginTop: 10 }} onClick={add}>
        Add league
      </button>
      <p className="muted small">
        Listed lowest first. One league must start at 0 trophies. Players who are already past a new or lowered gate get its
        reward after their next battle; raising a reward doesn't pay the difference to players who were already paid. The
        colour is used for the league's name in the game, and for a drawn badge when the icon number has no art.
      </p>
    </>
  );
}
