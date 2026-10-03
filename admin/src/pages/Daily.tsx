import { useConfig } from "../config";
import { Num, Text, Select, Toggle, PageHead } from "../components";
import { QUEST_GOALS, QUEST_GOAL_IDS, questText, type QuestDef, type Reward } from "../../../shared/daily.ts";
import type { GameConfig } from "../../../shared/config.ts";

const GOAL_LABELS = Object.fromEntries(QUEST_GOAL_IDS.map((g) => [g, `${g} — ${QUEST_GOALS[g].label}`]));
const NO_CHEST = "(none)";

/** Gold, gems and chest inputs for one reward. */
function RewardCells({ r, chests, set }: { r: Reward; chests: string[]; set: (fn: (r: Reward) => void) => void }) {
  return (
    <>
      <td><Num value={r.coins} min={0} step={10} onChange={(v) => set((x) => void (x.coins = v))} /></td>
      <td><Num value={r.gems} min={0} step={5} onChange={(v) => set((x) => void (x.gems = v))} /></td>
      <td>
        <Select value={r.chest ?? NO_CHEST} options={[NO_CHEST, ...chests]} onChange={(v) => set((x) => void (x.chest = v === NO_CHEST ? null : v))} />
      </td>
    </>
  );
}

export function DailyPage() {
  const { draft, saved, edit } = useConfig();
  if (!draft || !saved) return <div className="muted">Loading…</div>;
  const chests = draft.chests.map((c) => c.id);
  const changed = (a: unknown, b: unknown) => (JSON.stringify(a) !== JSON.stringify(b) ? "changed" : "");
  const eco = (k: "questsPerDay" | "questBonusCoins" | "questBonusGems") => ({
    value: draft.economy[k],
    cls: changed(draft.economy[k], saved.economy[k]),
    set: (v: number) => edit((c) => void (c.economy[k] = v)),
  });
  const setQuest = <K extends keyof QuestDef>(i: number, k: K, v: QuestDef[K]) => edit((c) => void (c.quests[i][k] = v));
  const addQuest = () =>
    edit((c: GameConfig) => {
      let n = c.quests.length + 1;
      while (c.quests.some((q) => q.id === `quest_${n}`)) n++;
      c.quests.push({ id: `quest_${n}`, goal: "battles", target: 1, reward: { coins: 100, gems: 0, chest: null }, weight: 1, enabled: true });
    });

  return (
    <>
      <PageHead
        title="Daily rewards & quests"
        desc="Days are UTC calendar days: the login reward and the quests refresh at 00:00 UTC for everyone."
      />

      <section className="panel">
        <h2>Login calendar</h2>
        <p className="muted small">
          One reward per day a player claims, in order, then it starts over. Missing a day doesn't reset a player's place.
        </p>
        <div className="table-wrap">
          <table className="grid">
            <thead>
              <tr>
                <th>Day</th>
                <th>Gold</th>
                <th>Gems</th>
                <th>Chest</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {draft.loginRewards.map((r, i) => (
                <tr key={i} className={changed(r, saved.loginRewards[i])}>
                  <td>{i + 1}</td>
                  <RewardCells r={r} chests={chests} set={(fn) => edit((c) => fn(c.loginRewards[i]))} />
                  <td>
                    <button className="btn small ghost" disabled={draft.loginRewards.length <= 1} onClick={() => edit((c) => void c.loginRewards.splice(i, 1))}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="btn small" style={{ marginTop: 10 }} onClick={() => edit((c) => void c.loginRewards.push({ coins: 100, gems: 0, chest: null }))}>
          Add day
        </button>
      </section>

      <section className="panel">
        <h2>Daily quests</h2>
        <p className="muted small">
          Each day every player gets a few quests drawn from this pool (higher weight = more likely). Battle goals count
          what the player's runs report, capped by the server to what a run of that length could do.
        </p>
        <table className="kv" style={{ maxWidth: 560 }}>
          <tbody>
            {([
              ["questsPerDay", "Quests per day", 1],
              ["questBonusCoins", "Bonus gold for finishing all of them", 10],
              ["questBonusGems", "Bonus gems for finishing all of them", 5],
            ] as const).map(([k, label, step]) => {
              const f = eco(k);
              return (
                <tr key={k} className={f.cls}>
                  <td>
                    {label}
                    <div className="id">{k}</div>
                  </td>
                  <td><Num value={f.value} min={0} step={step} onChange={f.set} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="table-wrap" style={{ marginTop: 14 }}>
          <table className="grid">
            <thead>
              <tr>
                <th>ID</th>
                <th>Goal</th>
                <th>Target</th>
                <th>Gold</th>
                <th>Gems</th>
                <th>Chest</th>
                <th>Weight</th>
                <th>On</th>
                <th>Players see</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {draft.quests.map((q, i) => (
                <tr key={i} className={`${q.enabled ? "" : "disabled"} ${changed(q, saved.quests.find((s) => s.id === q.id))}`}>
                  <td><Text value={q.id} width={120} onChange={(v) => setQuest(i, "id", v)} /></td>
                  <td><Select value={q.goal} options={QUEST_GOAL_IDS} labels={GOAL_LABELS} onChange={(v) => setQuest(i, "goal", v)} /></td>
                  <td><Num value={q.target} min={1} onChange={(v) => setQuest(i, "target", v)} /></td>
                  <RewardCells r={q.reward} chests={chests} set={(fn) => edit((c) => fn(c.quests[i].reward))} />
                  <td><Num value={q.weight} min={0} step={0.1} onChange={(v) => setQuest(i, "weight", v)} /></td>
                  <td><Toggle value={q.enabled} onChange={(v) => setQuest(i, "enabled", v)} /></td>
                  <td className="muted small">{QUEST_GOALS[q.goal] ? questText(q) : ""}</td>
                  <td>
                    <button className="btn small ghost" onClick={() => edit((c) => void c.quests.splice(i, 1))}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="btn small" style={{ marginTop: 10 }} onClick={addQuest}>
          Add quest
        </button>
        <p className="muted small">
          Changing a quest's target applies to quests players already have today; removing a quest takes it off their list.
        </p>
      </section>
    </>
  );
}
