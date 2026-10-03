import { useEffect, useState } from "react";
import { api } from "../api";
import { Modal, PageHead, fmtDate, toast } from "../components";

interface AdminRow {
  id: number;
  username: string;
  createdAt: number;
}

export function AdminsPage() {
  const [list, setList] = useState<AdminRow[]>([]);
  const [me, setMe] = useState<number>(0);
  const [adding, setAdding] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const load = () => api<AdminRow[]>("GET", "/admins").then(setList).catch((e) => toast(e.message, "err"));
  useEffect(() => {
    load();
    api<{ id: number }>("GET", "/me").then((m) => setMe(m.id));
  }, []);

  const remove = async (a: AdminRow) => {
    if (!confirm(`Remove admin ${a.username}?`)) return;
    try {
      await api("DELETE", `/admins/${a.id}`);
      toast("Admin removed");
      load();
    } catch (e) {
      toast((e as Error).message, "err");
    }
  };

  return (
    <>
      <PageHead title="Admins" desc="People who can sign in to this panel.">
        <button className="btn ghost" onClick={() => setChangingPw(true)}>Change my password</button>
        <button className="btn primary" onClick={() => setAdding(true)}>+ Add admin</button>
      </PageHead>
      <div className="table-wrap">
        <table className="grid">
          <thead>
            <tr>
              <th>Username</th>
              <th>Added</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map((a) => (
              <tr key={a.id}>
                <td>
                  {a.username} {a.id === me && <span className="badge ok">you</span>}
                </td>
                <td>{fmtDate(a.createdAt)}</td>
                <td className="actions">{a.id !== me && <button className="btn small danger" onClick={() => remove(a)}>Remove</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {adding && <AddAdmin onClose={() => setAdding(false)} onDone={() => (setAdding(false), load())} />}
      {changingPw && <ChangePassword onClose={() => setChangingPw(false)} />}
    </>
  );
}

function AddAdmin({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const submit = async () => {
    try {
      await api("POST", "/admins", { username, password });
      toast(`Admin ${username} added`);
      onDone();
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  return (
    <Modal title="Add admin" onClose={onClose} actions={<><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" onClick={submit}>Add</button></>}>
      <div className="form">
        <label>Username<input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" /></label>
        <label>Password (8+ characters)<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" /></label>
        {err && <div className="error">{err}</div>}
      </div>
    </Modal>
  );
}

function ChangePassword({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const submit = async () => {
    try {
      await api("POST", "/me/password", { current, password });
      toast("Password changed");
      onClose();
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  return (
    <Modal title="Change my password" onClose={onClose} actions={<><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" onClick={submit}>Change</button></>}>
      <div className="form">
        <label>Current password<input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" /></label>
        <label>New password (8+ characters)<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" /></label>
        {err && <div className="error">{err}</div>}
      </div>
    </Modal>
  );
}

interface AuditRow {
  id: number;
  action: string;
  target: string | null;
  details: string | null;
  createdAt: number;
  admin: string | null;
}

export function AuditPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [page, setPage] = useState(0);
  useEffect(() => {
    api<AuditRow[]>("GET", `/audit?page=${page}`).then(setRows).catch((e) => toast(e.message, "err"));
  }, [page]);
  const link = (target: string | null) => {
    const m = target?.match(/^user:(\d+)$/);
    return m ? <a href={`#/users/${m[1]}`}>{target}</a> : target;
  };
  return (
    <>
      <PageHead title="Audit log" desc="Everything admins have changed, newest first." />
      <div className="table-wrap">
        <table className="grid compact">
          <thead>
            <tr>
              <th>When</th>
              <th>Admin</th>
              <th>Action</th>
              <th>Target</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{fmtDate(r.createdAt)}</td>
                <td>{r.admin ?? "—"}</td>
                <td><code>{r.action}</code></td>
                <td>{link(r.target)}</td>
                <td className="details">{r.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="pager">
        <button className="btn small ghost" disabled={page === 0} onClick={() => setPage(page - 1)}>‹ Newer</button>
        <button className="btn small ghost" disabled={rows.length < 100} onClick={() => setPage(page + 1)}>Older ›</button>
      </div>
    </>
  );
}
