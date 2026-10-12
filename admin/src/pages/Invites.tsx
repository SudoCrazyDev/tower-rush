import { useEffect, useState } from "react";
import { api } from "../api";
import { currentEnv } from "../env";
import { Modal, PageHead, fmtDate, timeAgo, toast } from "../components";

interface InviteRow {
  id: number;
  email: string;
  createdAt: number;
  sentAt: number;
  expiresAt: number;
  usedAt: number | null;
  revokedAt: number | null;
  userId: number | null;
  username: string | null;
  invitedBy: string | null;
}

type Status = "used" | "revoked" | "expired" | "pending";
const statusOf = (i: InviteRow): Status => (i.usedAt ? "used" : i.revokedAt ? "revoked" : i.expiresAt < Date.now() ? "expired" : "pending");
const BADGE: Record<Status, string> = { used: "ok", pending: "info", expired: "err", revoked: "" };

export function InvitesPage() {
  const [list, setList] = useState<InviteRow[]>([]);
  const [info, setInfo] = useState<{ inviteOnly: boolean; days: number }>({ inviteOnly: false, days: 7 });
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(0);
  const load = () =>
    api<{ inviteOnly: boolean; days: number; invites: InviteRow[] }>("GET", "/invites")
      .then((r) => (setList(r.invites), setInfo({ inviteOnly: r.inviteOnly, days: r.days })))
      .catch((e) => toast(e.message, "err"));
  useEffect(() => void load(), []);

  const act = async (i: InviteRow, method: "POST" | "DELETE", path: string, done: string) => {
    setBusy(i.id);
    try {
      await api(method, path);
      toast(done);
      load();
    } catch (e) {
      toast((e as Error).message, "err");
    } finally {
      setBusy(0);
    }
  };

  return (
    <>
      <PageHead
        title="Invites"
        desc={
          info.inviteOnly
            ? `Sign-up on ${currentEnv} is by invite only. Each invite emails a link that works for ${info.days} days, for that address only.`
            : `Sign-up on ${currentEnv} is open. Invites still work: the link signs up that address, already confirmed.`
        }
      >
        <button className="btn primary" onClick={() => setAdding(true)}>+ Send invite</button>
      </PageHead>
      <div className="table-wrap">
        <table className="grid">
          <thead>
            <tr>
              <th>Email</th>
              <th>Status</th>
              <th>Last sent</th>
              <th>Expires</th>
              <th>Player</th>
              <th>Invited by</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map((i) => {
              const st = statusOf(i);
              return (
                <tr key={i.id}>
                  <td>{i.email}</td>
                  <td><span className={`badge ${BADGE[st]}`}>{st}</span></td>
                  <td title={fmtDate(i.sentAt)}>{timeAgo(i.sentAt)}</td>
                  <td>{st === "used" ? fmtDate(i.usedAt) : fmtDate(i.expiresAt)}</td>
                  <td>{i.userId ? <a href={`#/users/${i.userId}`}>{i.username ?? `#${i.userId}`}</a> : <span className="muted">—</span>}</td>
                  <td>{i.invitedBy ?? "—"}</td>
                  <td className="actions">
                    {st !== "used" && (
                      <button className="btn small" disabled={busy === i.id} onClick={() => act(i, "POST", `/invites/${i.id}/resend`, `Invite re-sent to ${i.email}`)}>
                        Resend
                      </button>
                    )}
                    {st === "pending" && (
                      <button
                        className="btn small danger"
                        disabled={busy === i.id}
                        onClick={() => confirm(`Revoke the invite for ${i.email}? The link stops working.`) && act(i, "DELETE", `/invites/${i.id}`, "Invite revoked")}
                      >
                        Revoke
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {!list.length && (
              <tr>
                <td colSpan={7} className="muted">No invites yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {adding && <SendInvite onClose={() => setAdding(false)} onDone={() => (setAdding(false), load())} />}
    </>
  );
}

function SendInvite({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [sending, setSending] = useState(false);
  const submit = async () => {
    setSending(true);
    setErr("");
    try {
      await api("POST", "/invites", { email: email.trim() });
      toast(`Invite sent to ${email.trim()}`);
      onDone();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSending(false);
    }
  };
  return (
    <Modal
      title={`Send invite (${currentEnv})`}
      onClose={onClose}
      actions={<><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" disabled={sending} onClick={submit}>{sending ? "Sending…" : "Send"}</button></>}
    >
      <div className="form">
        <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} autoFocus /></label>
        <div className="muted">Sending again to an address with a pending invite replaces its link.</div>
        {err && <div className="error">{err}</div>}
      </div>
    </Modal>
  );
}
