import { useEffect, useState } from "react";
import { api } from "../api";
import { useConfig } from "../config";
import { Num, PageHead, Select, Toggle, fmtDate, timeAgo, toast } from "../components";
import { MAIL_BODY_MAX, MAIL_TITLE_MAX } from "../../../shared/mail.ts";
import type { Reward } from "../../../shared/daily.ts";

interface Sent {
  id: number;
  userId: number | null;
  userName: string | null;
  title: string;
  body: string;
  reward: Reward | null;
  newPlayers: number;
  createdAt: number;
  expiresAt: number | null;
  admin: string | null;
  recipients: number;
  reads: number;
  claims: number;
}

const NO_CHEST = "(none)";
const blank = { title: "", body: "", gift: false, coins: 0, gems: 0, chest: NO_CHEST, expires: "", newPlayers: false };

/** `to` prefills one player (from their page: #/mail/<id>). */
export function MailPage({ to }: { to?: number }) {
  const { saved } = useConfig();
  const [list, setList] = useState<Sent[]>([]);
  const [page, setPage] = useState(0);
  const [toAll, setToAll] = useState(!to);
  const [player, setPlayer] = useState(to ? String(to) : "");
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [f, setF] = useState(blank);
  const [busy, setBusy] = useState(false);

  const load = () => api<Sent[]>("GET", `/mail?page=${page}`).then(setList).catch((e) => toast(e.message, "err"));
  useEffect(() => void load(), [page]);
  useEffect(() => {
    setToAll(!to);
    setPlayer(to ? String(to) : "");
  }, [to]);
  // Show who the player id is, so a typo doesn't send to the wrong person.
  useEffect(() => {
    setPlayerName(null);
    const id = Number(player);
    if (toAll || !Number.isInteger(id) || id <= 0) return;
    const t = setTimeout(() => {
      api<{ user: { name: string } }>("GET", `/users/${id}`)
        .then((d) => setPlayerName(d.user.name))
        .catch(() => setPlayerName(""));
    }, 250);
    return () => clearTimeout(t);
  }, [player, toAll]);

  const chests = (saved?.chests ?? []).map((c) => c.id);
  const chestNames = Object.fromEntries((saved?.chests ?? []).map((c) => [c.id, c.name]));
  const giftLabel = (r: Reward) => [r.coins && `${r.coins.toLocaleString()} gold`, r.gems && `${r.gems} gems`, r.chest && (chestNames[r.chest] ?? r.chest)].filter(Boolean).join(" + ");

  const send = async () => {
    const who = toAll ? (f.newPlayers ? "every player, now and future" : "every current player") : `${playerName} (#${player})`;
    if (!confirm(`Send "${f.title}" to ${who}?`)) return;
    setBusy(true);
    try {
      await api("POST", "/mail", {
        to: toAll ? "all" : Number(player),
        title: f.title,
        body: f.body,
        reward: f.gift ? { coins: f.coins, gems: f.gems, chest: f.chest === NO_CHEST ? null : f.chest } : null,
        expiresInDays: f.expires === "" ? null : Number(f.expires),
        newPlayers: toAll && f.newPlayers,
      });
      toast("Message sent");
      setF(blank);
      setPage(0);
      load();
    } catch (e) {
      toast((e as Error).message, "err");
    } finally {
      setBusy(false);
    }
  };

  const recall = async (m: Sent) => {
    if (!confirm(`Recall "${m.title}"? It disappears from inboxes${m.reward ? "; gifts already claimed are kept" : ""}.`)) return;
    try {
      await api("DELETE", `/mail/${m.id}`);
      toast("Message recalled");
      load();
    } catch (e) {
      toast((e as Error).message, "err");
    }
  };

  const ready = f.title.trim() && (toAll || playerName) && !busy;
  return (
    <>
      <PageHead title="Mail" desc="Send announcements and gifts to players' in-game inbox. A gift is claimed once per player; an unclaimed gift is lost when the message expires or is recalled." />
      <div className="two-col">
        <section className="panel">
          <div className="panel-head"><h2>New message</h2></div>
          <div className="form">
            <div className="row">
              <label>
                To
                <Select value={toAll ? "all" : "one"} options={["all", "one"] as const} labels={{ all: "All players", one: "One player" }} onChange={(v) => setToAll(v === "all")} />
              </label>
              {toAll ? (
                <Toggle value={f.newPlayers} onChange={(v) => setF({ ...f, newPlayers: v })} label="Also players who join later" />
              ) : (
                <label>
                  Player id {playerName ? <span className="badge ok">{playerName}</span> : playerName === "" && <span className="badge err">not found</span>}
                  <input value={player} placeholder="e.g. 42" onChange={(e) => setPlayer(e.target.value.trim())} style={{ width: 120 }} />
                </label>
              )}
            </div>
            <label>
              Title <span className="muted">({f.title.length}/{MAIL_TITLE_MAX})</span>
              <input value={f.title} maxLength={MAIL_TITLE_MAX} onChange={(e) => setF({ ...f, title: e.target.value })} />
            </label>
            <label>
              Message <span className="muted">({f.body.length}/{MAIL_BODY_MAX})</span>
              <textarea value={f.body} maxLength={MAIL_BODY_MAX} rows={6} onChange={(e) => setF({ ...f, body: e.target.value })} />
            </label>
            <Toggle value={f.gift} onChange={(v) => setF({ ...f, gift: v })} label="Attach a gift" />
            {f.gift && (
              <div className="row">
                <label>Gold<Num value={f.coins} min={0} step={100} width={110} onChange={(v) => setF({ ...f, coins: Math.round(v) })} /></label>
                <label>Gems<Num value={f.gems} min={0} step={10} width={90} onChange={(v) => setF({ ...f, gems: Math.round(v) })} /></label>
                <label>Chest<Select value={f.chest} options={[NO_CHEST, ...chests]} labels={chestNames} onChange={(v) => setF({ ...f, chest: v })} /></label>
              </div>
            )}
            <label>
              Expires after (days) <span className="muted">empty = never</span>
              <input type="number" min={1} max={365} value={f.expires} onChange={(e) => setF({ ...f, expires: e.target.value })} style={{ width: 120 }} />
            </label>
            <div>
              <button className="btn primary" disabled={!ready} onClick={send}>{busy ? "Sending…" : "Send"}</button>
            </div>
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><h2>Preview</h2></div>
          <div className="mail-preview">
            <div className="mail-title">{f.title || "Title"}</div>
            <div className="mail-body">{f.body || <span className="muted">Message text</span>}</div>
            {f.gift && <div className="mail-gift">Gift: {giftLabel({ coins: f.coins, gems: f.gems, chest: f.chest === NO_CHEST ? null : f.chest }) || <span className="muted">empty (sent without a gift)</span>}</div>}
          </div>
          <p className="muted small">
            "All players" reaches everyone with an account when it's sent; turn on "also players who join later" for things like
            a welcome note. Banned players can't open the game, so they never see it.
          </p>
        </section>
      </div>

      <section className="panel">
        <div className="panel-head"><h2>Sent</h2></div>
        <div className="table-wrap">
          <table className="grid">
            <thead>
              <tr>
                <th>Sent</th>
                <th>To</th>
                <th>Title</th>
                <th>Gift</th>
                <th>Expires</th>
                <th title="Players who opened it / could get it">Read</th>
                <th>Claimed</th>
                <th>By</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((m) => {
                const expired = m.expiresAt !== null && m.expiresAt < Date.now();
                return (
                  <tr key={m.id}>
                    <td className="nowrap" title={fmtDate(m.createdAt)}>{timeAgo(m.createdAt)}</td>
                    <td>{m.userId ? <a href={`#/users/${m.userId}`}>{m.userName ?? `#${m.userId}`}</a> : m.newPlayers ? "All players + new" : "All players"}</td>
                    <td title={m.body}>{m.title}</td>
                    <td>{m.reward ? giftLabel(m.reward) : <span className="muted">—</span>}</td>
                    <td>{m.expiresAt ? <span className={expired ? "badge err" : ""}>{expired ? "expired" : fmtDate(m.expiresAt)}</span> : <span className="muted">never</span>}</td>
                    <td>{m.reads} / {m.recipients}</td>
                    <td>{m.reward ? m.claims : <span className="muted">—</span>}</td>
                    <td>{m.admin ?? "—"}</td>
                    <td className="actions"><button className="btn small danger" onClick={() => recall(m)}>Recall</button></td>
                  </tr>
                );
              })}
              {!list.length && (
                <tr>
                  <td colSpan={9} className="muted">Nothing sent yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="pager">
          <button className="btn small ghost" disabled={page === 0} onClick={() => setPage(page - 1)}>‹ Newer</button>
          <button className="btn small ghost" disabled={list.length < 50} onClick={() => setPage(page + 1)}>Older ›</button>
        </div>
      </section>
    </>
  );
}
