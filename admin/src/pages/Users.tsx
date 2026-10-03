import { useEffect, useState, type ReactNode } from "react";
import { api, asset } from "../api";
import { useConfig } from "../config";
import { Modal, Num, PageHead, Select, Thumb, fmtDate, timeAgo, toast } from "../components";
import { maxCardLevel } from "../../../shared/units.ts";
import type { Profile } from "../../../shared/profile.ts";
import { leagueFor } from "../../../shared/leagues.ts";

interface UserRow {
  id: number;
  username: string | null;
  name: string;
  isGuest: number;
  banned: number;
  createdAt: number;
  lastSeenAt: number;
  coins: number;
  gems: number;
  trophies: number;
  bestWave: number;
}

export function UsersPage() {
  const { saved } = useConfig();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "registered" | "guests" | "banned">("all");
  const [sort, setSort] = useState<"seen" | "created" | "trophies" | "name">("seen");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<{ total: number; pageSize: number; users: UserRow[] } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams({ q, filter, sort, page: String(page) });
      api<typeof data>("GET", `/users?${params}`)
        .then(setData)
        .catch((e) => toast(e.message, "err"));
    }, 200);
    return () => clearTimeout(t);
  }, [q, filter, sort, page]);

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  return (
    <>
      <PageHead title="Players" desc={data ? `${data.total.toLocaleString()} players` : undefined}>
        <input className="search" placeholder="Search name, username or ID…" value={q} onChange={(e) => (setQ(e.target.value), setPage(0))} />
        <Select value={filter} options={["all", "registered", "guests", "banned"] as const} onChange={(v) => (setFilter(v), setPage(0))} />
        <Select value={sort} options={["seen", "created", "trophies", "name"] as const} labels={{ seen: "Last seen", created: "Newest", trophies: "Trophies", name: "Name" }} onChange={setSort} />
      </PageHead>
      <div className="table-wrap">
        <table className="grid clickable">
          <thead>
            <tr>
              <th>ID</th>
              <th>Player</th>
              <th>Account</th>
              <th>Trophies</th>
              <th>Best wave</th>
              <th>Gold</th>
              <th>Gems</th>
              <th>Last seen</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {data?.users.map((u) => (
              <tr key={u.id} onClick={() => (location.hash = `/users/${u.id}`)}>
                <td className="muted">{u.id}</td>
                <td>
                  <strong>{u.name}</strong> {u.banned ? <span className="badge err">banned</span> : null}
                </td>
                <td>{u.isGuest ? <span className="badge">guest</span> : <span className="muted">@{u.username}</span>}</td>
                <td className="num-cell">
                  {u.trophies}
                  {saved?.leagues.length ? <div className="muted small">{leagueFor(u.trophies, saved.leagues).name}</div> : null}
                </td>
                <td className="num-cell">{u.bestWave}</td>
                <td className="num-cell">{u.coins?.toLocaleString()}</td>
                <td className="num-cell">{u.gems?.toLocaleString()}</td>
                <td>{timeAgo(u.lastSeenAt)}</td>
                <td className="muted">{new Date(u.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
            {data && !data.users.length && (
              <tr>
                <td colSpan={9} className="muted center">No players found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="pager">
        <button className="btn small ghost" disabled={page === 0} onClick={() => setPage(page - 1)}>‹ Prev</button>
        <span className="muted">Page {page + 1} of {pages}</span>
        <button className="btn small ghost" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>Next ›</button>
      </div>
    </>
  );
}

interface Detail {
  user: { id: number; name: string; username: string | null; isGuest: boolean; banned: boolean; banReason: string | null; createdAt: number; lastSeenAt: number; hasPassword: boolean };
  profile: Profile;
  battles: { id: number; arena: string; deck: string; startedAt: number; finishedAt: number | null; wave: number | null; kills: number | null; bosses: number | null; coins: number | null; gems: number | null; trophies: number | null }[];
}

export function UserDetail({ id }: { id: number }) {
  const { saved } = useConfig();
  const [d, setD] = useState<Detail | null>(null);
  const [modal, setModal] = useState<ReactNode>(null);
  const load = () =>
    api<Detail>("GET", `/users/${id}`)
      .then(setD)
      .catch((e) => toast(e.message, "err"));
  useEffect(() => void load(), [id]);

  if (!d) return <div className="muted">Loading…</div>;
  const { user, profile } = d;
  const unitName = (uid: string) => saved?.units.find((u) => u.id === uid)?.name ?? uid;
  const arenaName = (aid: string) => saved?.arenas.find((a) => a.id === aid)?.name ?? aid;

  const act = async (method: string, path: string, body: unknown, ok: string) => {
    try {
      await api(method, `/users/${id}${path}`, body);
      toast(ok);
      setModal(null);
      await load();
    } catch (e) {
      toast((e as Error).message, "err");
    }
  };

  const editProfile = () => setModal(<EditProfile d={d} onSave={(body) => act("PATCH", "", body, "Saved")} onClose={() => setModal(null)} />);
  const editCard = (card: string | null) =>
    setModal(
      <EditCard
        card={card}
        state={card ? profile.cards[card] : undefined}
        options={(saved?.units ?? []).filter((u) => !profile.cards[u.id]).map((u) => u.id)}
        names={Object.fromEntries((saved?.units ?? []).map((u) => [u.id, u.name]))}
        inDeck={!!card && profile.deck.includes(card)}
        onSave={(cid, level, copies) => act("PUT", `/cards/${cid}`, { level, copies }, "Card saved")}
        onRemove={(cid) => act("DELETE", `/cards/${cid}`, undefined, "Card removed")}
        onClose={() => setModal(null)}
      />,
    );
  const ban = () => {
    const reason = prompt(`Ban ${user.name}? Optional reason shown to the player:`);
    if (reason !== null) act("POST", "/ban", { reason }, "Player banned");
  };
  const setPassword = () => {
    const pw = prompt(`New password for @${user.username} (at least 6 characters):`);
    if (pw) act("POST", "/password", { password: pw }, "Password changed; the player was signed out");
  };
  const del = async () => {
    if (!confirm(`Permanently delete ${user.name} and all their progress? This can't be undone.`)) return;
    try {
      await api("DELETE", `/users/${id}`);
      toast("Player deleted");
      location.hash = "/users";
    } catch (e) {
      toast((e as Error).message, "err");
    }
  };

  const owned = Object.entries(profile.cards).sort((a, b) => b[1].level - a[1].level);
  return (
    <>
      <a href="#/users" className="back">‹ All players</a>
      <PageHead title={user.name} desc={`#${user.id} · ${user.isGuest ? "guest account" : `@${user.username}`} · joined ${fmtDate(user.createdAt)} · last seen ${timeAgo(user.lastSeenAt)}`}>
        <button className="btn" onClick={editProfile}>Edit</button>
        <a className="btn" href={`#/mail/${user.id}`}>Send mail</a>
        {user.banned ? (
          <button className="btn" onClick={() => act("POST", "/unban", {}, "Player unbanned")}>Unban</button>
        ) : (
          <button className="btn danger" onClick={ban}>Ban</button>
        )}
        <details className="menu">
          <summary className="btn ghost">More ▾</summary>
          <div className="menu-list">
            {user.username && <button onClick={setPassword}>Set password…</button>}
            <button onClick={() => act("POST", "/logout", {}, "Signed out everywhere")}>Sign out everywhere</button>
            <button onClick={() => confirm("Reset all progress to a brand-new account?") && act("POST", "/reset", {}, "Progress reset")}>Reset progress…</button>
            <button className="danger" onClick={del}>Delete player…</button>
          </div>
        </details>
      </PageHead>

      {user.banned && <div className="alert err">Banned{user.banReason ? `: ${user.banReason}` : ""}</div>}

      <div className="stats">
        <Stat2 icon="coins" label="Gold" value={profile.coins} />
        <Stat2 icon="gems" label="Gems" value={profile.gems} />
        <Stat2 icon="trophy" label="Trophies" value={profile.trophies} sub={saved?.leagues.length ? leagueFor(profile.trophies, saved.leagues).name : undefined} />
        <Stat2 icon="hourglass_speedup" label="Best wave" value={profile.bestWave} />
        <Stat2 icon="card_pack" label="Cards owned" value={owned.length} />
      </div>

      <section className="panel">
        <h2>Deck</h2>
        <div className="deck">
          {profile.deck.map((c) => (
            <div key={c} className="deck-card">
              <Thumb src={asset("portraits", c)} size={72} />
              <span>{unitName(c)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Heroes</h2>
          <span className="muted small">Click to give or take away · ★ = taken into battle</span>
        </div>
        <div className="card-grid">
          {(saved?.heroes ?? []).map((h) => {
            const has = h.price === 0 || (profile.heroes ?? []).includes(h.id);
            const toggle = () => {
              if (h.price === 0) return toast("Free heroes are owned by everyone", "err");
              const heroes = has ? profile.heroes.filter((x) => x !== h.id) : [...(profile.heroes ?? []), h.id];
              act("PATCH", "", { heroes }, has ? "Hero removed" : "Hero given");
            };
            return (
              <button key={h.id} className="owned" onClick={toggle} style={{ opacity: has ? 1 : 0.45 }}>
                <Thumb src={asset("portraits_heroes", h.id)} size={56} />
                <div>
                  <strong>{profile.hero === h.id ? "★ " : ""}{h.name}</strong>
                  <div className="muted small">{has ? (h.price === 0 ? "Free" : "Owned") : "Not owned"}</div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Cards</h2>
          <button className="btn small" onClick={() => editCard(null)}>+ Give card</button>
        </div>
        <div className="card-grid">
          {owned.map(([cid, c]) => (
            <button key={cid} className="owned" onClick={() => editCard(cid)} title="Edit">
              <Thumb src={asset("portraits", cid)} size={56} />
              <div>
                <strong>{unitName(cid)}</strong>
                <div className="muted small">Lv {c.level} · {c.copies} copies</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Recent battles</h2>
        <div className="table-wrap">
          <table className="grid compact">
            <thead>
              <tr>
                <th>When</th>
                <th>Arena</th>
                <th>Wave</th>
                <th>Kills</th>
                <th>Bosses</th>
                <th>Gold</th>
                <th>Gems</th>
                <th>Trophies</th>
                <th>Length</th>
              </tr>
            </thead>
            <tbody>
              {d.battles.map((b) => (
                <tr key={b.id}>
                  <td>{fmtDate(b.startedAt)}</td>
                  <td>{arenaName(b.arena)}</td>
                  {b.finishedAt ? (
                    <>
                      <td className="num-cell">{b.wave}</td>
                      <td className="num-cell">{b.kills}</td>
                      <td className="num-cell">{b.bosses}</td>
                      <td className="num-cell">{b.coins}</td>
                      <td className="num-cell">{b.gems}</td>
                      <td className="num-cell">{b.trophies}</td>
                      <td>{Math.round((b.finishedAt - b.startedAt) / 60000)} min</td>
                    </>
                  ) : (
                    <td colSpan={7} className="muted">not finished</td>
                  )}
                </tr>
              ))}
              {!d.battles.length && (
                <tr>
                  <td colSpan={9} className="muted center">No battles yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      {modal}
    </>
  );
}

function Stat2({ icon, label, value, sub }: { icon: string; label: string; value: number; sub?: string }) {
  return (
    <div className="stat with-icon">
      <img src={asset("items", icon)} alt="" width={40} height={40} />
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value.toLocaleString()}</div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

function EditProfile({ d, onSave, onClose }: { d: Detail; onSave: (body: Record<string, unknown>) => void; onClose: () => void }) {
  const [f, setF] = useState({
    name: d.user.name,
    username: d.user.username ?? "",
    coins: d.profile.coins,
    gems: d.profile.gems,
    trophies: d.profile.trophies,
    bestWave: d.profile.bestWave,
  });
  const submit = () => {
    const body: Record<string, unknown> = {};
    if (f.name !== d.user.name) body.name = f.name;
    if (f.username && f.username !== d.user.username) body.username = f.username;
    for (const k of ["coins", "gems", "trophies", "bestWave"] as const) if (f[k] !== d.profile[k]) body[k] = f[k];
    if (!Object.keys(body).length) return onClose();
    onSave(body);
  };
  return (
    <Modal
      title={`Edit ${d.user.name}`}
      onClose={onClose}
      actions={
        <>
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn primary" onClick={submit}>Save</button>
        </>
      }
    >
      <div className="form">
        <label>Display name<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
        <label>Username {d.user.isGuest && <span className="muted">(guests have none)</span>}<input value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} /></label>
        <div className="row">
          <label>Gold<Num value={f.coins} min={0} width={120} onChange={(v) => setF({ ...f, coins: Math.round(v) })} /></label>
          <label>Gems<Num value={f.gems} min={0} width={120} onChange={(v) => setF({ ...f, gems: Math.round(v) })} /></label>
        </div>
        <div className="row">
          <label>Trophies<Num value={f.trophies} min={0} width={120} onChange={(v) => setF({ ...f, trophies: Math.round(v) })} /></label>
          <label>Best wave<Num value={f.bestWave} min={0} width={120} onChange={(v) => setF({ ...f, bestWave: Math.round(v) })} /></label>
        </div>
      </div>
    </Modal>
  );
}

function EditCard(props: {
  card: string | null;
  state?: { level: number; copies: number };
  options: string[];
  names: Record<string, string>;
  inDeck: boolean;
  onSave: (card: string, level: number, copies: number) => void;
  onRemove: (card: string) => void;
  onClose: () => void;
}) {
  const [card, setCard] = useState(props.card ?? props.options[0] ?? "");
  const [level, setLevel] = useState(props.state?.level ?? 1);
  const [copies, setCopies] = useState(props.state?.copies ?? 0);
  return (
    <Modal
      title={props.card ? `Edit ${props.names[props.card]}` : "Give a card"}
      onClose={props.onClose}
      actions={
        <>
          {props.card && (
            <button className="btn danger" disabled={props.inDeck} title={props.inDeck ? "Card is in the player's deck" : ""} onClick={() => confirm("Remove this card from the player?") && props.onRemove(props.card!)}>
              Remove
            </button>
          )}
          <span className="spacer" />
          <button className="btn ghost" onClick={props.onClose}>Cancel</button>
          <button className="btn primary" disabled={!card} onClick={() => props.onSave(card, level, copies)}>Save</button>
        </>
      }
    >
      <div className="form">
        {!props.card && (
          <label>Unit<Select value={card} options={props.options} labels={props.names} onChange={setCard} /></label>
        )}
        <div className="row">
          {card && <Thumb src={asset("portraits", card)} size={80} />}
          <label>Level (1–{maxCardLevel()})<Num value={level} min={1} width={100} onChange={(v) => setLevel(Math.min(maxCardLevel(), Math.max(1, Math.round(v))))} /></label>
          <label>Spare copies<Num value={copies} min={0} width={100} onChange={(v) => setCopies(Math.round(v))} /></label>
        </div>
      </div>
    </Modal>
  );
}
