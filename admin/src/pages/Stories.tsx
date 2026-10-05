import { useState } from "react";
import { useConfig } from "../config";
import { Num, Text, Select, PageHead } from "../components";
import { DEFAULT_BOOK, type StoryChapter, type StoryDef, type StorySpawn, type StoryWave } from "../../../shared/stories.ts";
import type { GameConfig } from "../../../shared/config.ts";

const NONE = "(none)";

const spawnText = (s: StorySpawn[]) => s.map((x) => `${x.id} ${x.n}`).join(", ");
const parseSpawns = (t: string): StorySpawn[] =>
  t
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => {
      const [id, n] = x.split(/\s+/);
      return { id, n: Math.max(1, Math.round(Number(n ?? 1)) || 1) };
    });

/** Story mode (v1.2): Book 1's stories, their chapters, wave scripts, rewards and deck rules. */
export function StoriesPage() {
  const { draft, saved, edit } = useConfig();
  const [open, setOpen] = useState<string | null>(null);
  if (!draft || !saved) return <div className="muted">Loading…</div>;
  const book = draft.book ?? DEFAULT_BOOK;
  const before = saved.book ?? DEFAULT_BOOK;
  const monsters = draft.monsters.map((m) => m.id);
  const bosses = draft.bosses.map((b) => b.id);
  const arenas = draft.arenas.map((a) => a.id);
  const chests = draft.chests.map((c) => c.id);
  const editBook = (fn: (b: NonNullable<GameConfig["book"]>) => void) =>
    edit((c) => {
      c.book ??= structuredClone(DEFAULT_BOOK);
      fn(c.book);
    });
  const editChapter = (si: number, ci: number, fn: (c: StoryChapter) => void) => editBook((b) => fn(b.stories[si].chapters[ci]));
  const changed = (a: unknown, b: unknown) => (JSON.stringify(a) !== JSON.stringify(b) ? "changed" : "");
  const chapterBefore = (id: string) => before.stories.flatMap((s) => s.chapters).find((c) => c.id === id);

  return (
    <>
      <PageHead
        title="Stories"
        desc="Story mode: the book's stories are played in order, each chapter is one battle with a fixed list of waves (no random picks), and the last wave's boss must be beaten with lives left. HP: wave base HP × the chapter's HP scale × each wave's HP. Rewards are paid by the server on the first clear; replays pay the replay gold (and Event card copies for stories that list them)."
      />
      <div className="panel">
        <label>
          Book title <Text value={book.title} onChange={(v) => editBook((b) => void (b.title = v))} width={260} />
        </label>
      </div>
      {book.stories.map((s: StoryDef, si) => (
        <section className="panel" key={s.id}>
          <h2>
            {si + 1}. <Text value={s.title} onChange={(v) => editBook((b) => void (b.stories[si].title = v))} width={240} /> <span className="id">{s.id}</span>
          </h2>
          <table className="kv">
            <tbody>
              <tr className={changed(s.blurb, before.stories[si]?.blurb)}>
                <td>Blurb</td>
                <td><Text value={s.blurb} onChange={(v) => editBook((b) => void (b.stories[si].blurb = v))} width={520} /></td>
              </tr>
              <tr className={changed(s.trophies, before.stories[si]?.trophies)}>
                <td>Trophies to start (and the story before it finished)</td>
                <td><Num value={s.trophies} min={0} step={50} onChange={(v) => editBook((b) => void (b.stories[si].trophies = Math.round(v)))} /></td>
              </tr>
              <tr className={changed(s.replayCards, before.stories[si]?.replayCards)}>
                <td>Replays drop 1-3 copies of (unit ids, comma separated)</td>
                <td>
                  <Text
                    value={s.replayCards.join(", ")}
                    onChange={(v) => editBook((b) => void (b.stories[si].replayCards = v.split(",").map((x) => x.trim()).filter(Boolean)))}
                    width={300}
                  />
                </td>
              </tr>
            </tbody>
          </table>
          {s.chapters.map((c, ci) => {
            const old = chapterBefore(c.id);
            const isOpen = open === c.id;
            return (
              <div key={c.id} className="panel" style={{ marginTop: 10 }}>
                <h3 style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  Chapter {ci + 1}: <Text value={c.title} onChange={(v) => editChapter(si, ci, (x) => void (x.title = v))} width={240} />
                  <span className="id">{c.id}</span>
                  <span className="muted small">{c.waves.length} waves · {c.waves.filter((w) => w.boss).length} bosses</span>
                  <button className="btn small ghost" onClick={() => setOpen(isOpen ? null : c.id)}>{isOpen ? "Hide waves" : "Edit waves"}</button>
                </h3>
                <table className="grid">
                  <thead>
                    <tr>
                      <th>Layout arena</th>
                      <th>Art (locations/)</th>
                      <th>Arena tint</th>
                      <th>Corruption 0-1</th>
                      <th>HP scale</th>
                      <th>Gold</th>
                      <th>Gems</th>
                      <th>Chest</th>
                      <th>Cards</th>
                      <th>Replay gold</th>
                      <th>Deck</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className={changed(c.layout, old?.layout)}><Select value={c.layout} options={arenas} onChange={(v) => editChapter(si, ci, (x) => void (x.layout = v))} /></td>
                      <td className={changed(c.art, old?.art)}><Text value={c.art} onChange={(v) => editChapter(si, ci, (x) => void (x.art = v))} width={200} /></td>
                      <td className={changed(c.tint, old?.tint)}>
                        <Text value={c.tint ?? ""} placeholder="none" onChange={(v) => editChapter(si, ci, (x) => void (x.tint = /^#[0-9a-f]{6}$/i.test(v) ? v : null))} width={90} />
                      </td>
                      <td className={changed(c.corruption, old?.corruption)}><Num value={c.corruption} min={0} step={0.05} width={70} onChange={(v) => editChapter(si, ci, (x) => void (x.corruption = Math.min(1, v)))} /></td>
                      <td className={changed(c.hpScale, old?.hpScale)}><Num value={c.hpScale} min={0.01} step={0.05} width={70} onChange={(v) => editChapter(si, ci, (x) => void (x.hpScale = v))} /></td>
                      <td className={changed(c.reward.coins, old?.reward.coins)}><Num value={c.reward.coins} min={0} step={100} onChange={(v) => editChapter(si, ci, (x) => void (x.reward.coins = v))} /></td>
                      <td className={changed(c.reward.gems, old?.reward.gems)}><Num value={c.reward.gems} min={0} step={10} width={60} onChange={(v) => editChapter(si, ci, (x) => void (x.reward.gems = v))} /></td>
                      <td className={changed(c.reward.chest, old?.reward.chest)}>
                        <Select value={c.reward.chest ?? NONE} options={[NONE, ...chests]} onChange={(v) => editChapter(si, ci, (x) => void (x.reward.chest = v === NONE ? null : v))} />
                      </td>
                      <td className={changed(c.reward.cards, old?.reward.cards)}>
                        <Text value={c.reward.cards.join(", ")} onChange={(v) => editChapter(si, ci, (x) => void (x.reward.cards = v.split(",").map((t) => t.trim()).filter(Boolean)))} width={200} />
                      </td>
                      <td className={changed(c.replay.coins, old?.replay.coins)}><Num value={c.replay.coins} min={0} step={50} onChange={(v) => editChapter(si, ci, (x) => void (x.replay.coins = v))} /></td>
                      <td className="small">
                        {c.eventDeck ? (
                          <>
                            Event deck, pick {c.eventDeck.pick} of {c.eventDeck.units.length} at level{" "}
                            <Num value={c.eventDeck.level} min={1} width={50} onChange={(v) => editChapter(si, ci, (x) => void (x.eventDeck!.level = Math.round(v)))} />
                            , at least{" "}
                            <Num
                              value={c.eventDeck.minRoles?.Mercenary ?? 0}
                              min={0}
                              width={44}
                              onChange={(v) => editChapter(si, ci, (x) => void (x.eventDeck!.minRoles = { ...x.eventDeck!.minRoles, Mercenary: Math.round(v) }))}
                            />{" "}
                            Mercenary
                          </>
                        ) : c.rules ? (
                          <>
                            Own deck; needs {c.rules.requiredUnits.join(", ")}; no {c.rules.bannedRarities.join("/")}; floor level{" "}
                            <Num value={c.rules.levelFloor} min={0} width={50} onChange={(v) => editChapter(si, ci, (x) => void (x.rules!.levelFloor = Math.round(v)))} />
                          </>
                        ) : (
                          "Own deck"
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
                {isOpen && <WaveTable waves={c.waves} old={old?.waves} monsters={monsters} bosses={bosses} set={(fn) => editChapter(si, ci, (x) => fn(x.waves))} />}
              </div>
            );
          })}
        </section>
      ))}
      <p className="muted small">
        Monsters in a wave are typed as <code>id count</code> pairs separated by commas (saved when you leave the field). A bark is a
        speech bubble when the wave starts: <code>who</code> is a unit id (its portrait) or a story portrait (candy_king). Every
        chapter's last wave needs a boss. Story progress and first-clear dates live in each player's profile.
      </p>
    </>
  );
}

function WaveTable({ waves, old, monsters, bosses, set }: { waves: StoryWave[]; old?: StoryWave[]; monsters: string[]; bosses: string[]; set: (fn: (w: StoryWave[]) => void) => void }) {
  const changed = (i: number, k: keyof StoryWave) => (JSON.stringify(old?.[i]?.[k]) !== JSON.stringify(waves[i][k]) ? "changed" : "");
  return (
    <div className="table-wrap">
      <table className="grid">
        <thead>
          <tr>
            <th>#</th>
            <th>Monsters</th>
            <th>Boss</th>
            <th>HP ×</th>
            <th>Bark (who / line)</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {waves.map((w, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td className={changed(i, "spawns")}>
                <Text value={spawnText(w.spawns)} width={360} onChange={(v) => set((ws) => void (ws[i].spawns = parseSpawns(v)))} />
                {w.spawns.some((s) => !monsters.includes(s.id)) && <div className="small" style={{ color: "#ff6a6a" }}>Unknown monster id</div>}
              </td>
              <td className={changed(i, "boss")}>
                <Select value={w.boss ?? NONE} options={[NONE, ...bosses]} onChange={(v) => set((ws) => void (ws[i].boss = v === NONE ? undefined : v))} />
              </td>
              <td className={changed(i, "hp")}><Num value={w.hp} min={0.01} step={0.05} width={64} onChange={(v) => set((ws) => void (ws[i].hp = v))} /></td>
              <td className={changed(i, "bark")}>
                <Text value={w.bark?.who ?? ""} placeholder="who" width={130} onChange={(v) => set((ws) => void (ws[i].bark = v ? { who: v, text: ws[i].bark?.text ?? "" } : undefined))} />{" "}
                <Text value={w.bark?.text ?? ""} placeholder="line" width={340} onChange={(v) => set((ws) => void (ws[i].bark = { who: ws[i].bark?.who ?? "candy_king", text: v }))} />
              </td>
              <td>
                <button className="btn small ghost" disabled={waves.length <= 1} onClick={() => set((ws) => void ws.splice(i, 1))}>Remove</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className="btn small" style={{ marginTop: 8 }} onClick={() => set((ws) => void ws.splice(ws.length - 1, 0, { spawns: [{ id: monsters[0], n: 10 }], hp: 1 }))}>
        Add wave (before the last)
      </button>
    </div>
  );
}
