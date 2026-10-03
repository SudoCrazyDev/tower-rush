import { useEffect, useState, type FormEvent } from "react";
import { api, token, setOnUnauthorized, ApiError } from "./api";
import { ConfigProvider, useConfig } from "./config";
import { Toasts, toast } from "./components";
import { Dashboard } from "./pages/Dashboard";
import { UnitsPage } from "./pages/Units";
import { MonstersPage, BossesPage } from "./pages/Monsters";
import { ArenasPage } from "./pages/Arenas";
import { ShopPage } from "./pages/Shop";
import { HeroesPage } from "./pages/Heroes";
import { DailyPage } from "./pages/Daily";
import { LeaguesPage } from "./pages/Leagues";
import { EconomyPage } from "./pages/Economy";
import { EffectsPage } from "./pages/Effects";
import { VersionsPage } from "./pages/Versions";
import { UsersPage, UserDetail } from "./pages/Users";
import { AdminsPage, AuditPage } from "./pages/Admins";
import { MailPage } from "./pages/Mail";
import { OffersPage } from "./pages/Offers";

function useHashRoute() {
  const [hash, setHash] = useState(location.hash.slice(1) || "/");
  useEffect(() => {
    const on = () => setHash(location.hash.slice(1) || "/");
    addEventListener("hashchange", on);
    return () => removeEventListener("hashchange", on);
  }, []);
  return hash;
}

const NAV: { path: string; label: string; group?: string }[] = [
  { path: "/", label: "Dashboard" },
  { path: "/units", label: "Units", group: "Game balance" },
  { path: "/monsters", label: "Monsters" },
  { path: "/bosses", label: "Bosses" },
  { path: "/effects", label: "Effects" },
  { path: "/heroes", label: "Heroes" },
  { path: "/arenas", label: "Arenas" },
  { path: "/shop", label: "Shop & prices" },
  { path: "/offers", label: "Offers & events" },
  { path: "/economy", label: "Economy" },
  { path: "/daily", label: "Daily & quests" },
  { path: "/leagues", label: "Leagues" },
  { path: "/versions", label: "Versions" },
  { path: "/users", label: "Players", group: "People" },
  { path: "/mail", label: "Mail" },
  { path: "/admins", label: "Admins" },
  { path: "/audit", label: "Audit log" },
];

export function App() {
  const [admin, setAdmin] = useState<{ id: number; username: string } | null | undefined>(undefined);

  useEffect(() => {
    setOnUnauthorized(() => {
      token.set(null);
      setAdmin(null);
    });
    if (!token.get()) return setAdmin(null);
    api<{ id: number; username: string }>("GET", "/me")
      .then(setAdmin)
      .catch(() => setAdmin(null));
  }, []);

  if (admin === undefined) return <div className="center muted">Loading…</div>;
  if (!admin)
    return (
      <>
        <Login onDone={setAdmin} />
        <Toasts />
      </>
    );
  return (
    <ConfigProvider>
      <Shell admin={admin} onLogout={() => setAdmin(null)} />
      <Toasts />
    </ConfigProvider>
  );
}

function Login({ onDone }: { onDone: (a: { id: number; username: string }) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const r = await api<{ token: string; admin: { id: number; username: string } }>("POST", "/login", { username, password });
      token.set(r.token, remember);
      onDone(r.admin);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="login-wrap">
      <form className="login" onSubmit={submit}>
        <img src="/assets/ui/logo.webp" alt="" width={200} />
        <h2>Admin panel</h2>
        <input placeholder="Username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
        <input placeholder="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <label className="row-check">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Keep me signed in
        </label>
        {err && <div className="error">{err}</div>}
        <button className="btn primary" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

function Shell({ admin, onLogout }: { admin: { username: string }; onLogout: () => void }) {
  const route = useHashRoute();
  const { dirty } = useConfig();
  const [, base, id] = route.split("/");
  const current = `/${base ?? ""}`;

  // Warn before leaving the page with unpublished balance changes.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    addEventListener("beforeunload", warn);
    return () => removeEventListener("beforeunload", warn);
  }, [dirty]);

  const logout = async () => {
    await api("POST", "/logout").catch(() => {});
    token.set(null);
    onLogout();
  };

  let page;
  switch (current) {
    case "/units": page = <UnitsPage />; break;
    case "/monsters": page = <MonstersPage />; break;
    case "/bosses": page = <BossesPage />; break;
    case "/effects": page = <EffectsPage />; break;
    case "/heroes": page = <HeroesPage />; break;
    case "/daily": page = <DailyPage />; break;
    case "/leagues": page = <LeaguesPage />; break;
    case "/arenas": page = <ArenasPage />; break;
    case "/shop": page = <ShopPage />; break;
    case "/offers": page = <OffersPage />; break;
    case "/economy": page = <EconomyPage />; break;
    case "/versions": page = <VersionsPage />; break;
    case "/users": page = id ? <UserDetail id={Number(id)} /> : <UsersPage />; break;
    case "/mail": page = <MailPage to={id ? Number(id) : undefined} />; break;
    case "/admins": page = <AdminsPage />; break;
    case "/audit": page = <AuditPage />; break;
    default: page = <Dashboard />;
  }

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">
          <img src="/assets/ui/logo.webp" alt="" />
          <span>Admin</span>
        </div>
        <nav>
          {NAV.map((n) => (
            <div key={n.path}>
              {n.group && <div className="nav-group">{n.group}</div>}
              <a href={`#${n.path}`} className={current === n.path ? "active" : ""}>
                {n.label}
              </a>
            </div>
          ))}
        </nav>
        <div className="side-foot">
          <div className="muted">Signed in as</div>
          <strong>{admin.username}</strong>
          <button className="btn small ghost" onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="main">
        {page}
        <SaveBar />
      </main>
    </div>
  );
}

function SaveBar() {
  const { dirty, problems, discard, save, version } = useConfig();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  if (!dirty) return null;
  const publish = async () => {
    setBusy(true);
    setServerErrors([]);
    try {
      await save(note || "Edited in admin");
      setNote("");
      toast(`Published. Players get the new balance on their next load.`);
    } catch (e) {
      if (e instanceof ApiError) setServerErrors(e.errors.length ? e.errors : [e.message]);
      else toast((e as Error).message, "err");
    } finally {
      setBusy(false);
    }
  };
  const errs = serverErrors.length ? serverErrors : problems;
  return (
    <div className="savebar">
      <div className="savebar-text">
        <strong>Unpublished changes</strong> on top of version {version}
        {errs.length > 0 && (
          <ul className="problems">
            {errs.slice(0, 6).map((p) => (
              <li key={p}>{p}</li>
            ))}
            {errs.length > 6 && <li>…and {errs.length - 6} more</li>}
          </ul>
        )}
      </div>
      <input placeholder="What changed? (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
      <button className="btn ghost" onClick={discard} disabled={busy}>
        Discard
      </button>
      <button className="btn primary" onClick={publish} disabled={busy || problems.length > 0}>
        {busy ? "Publishing…" : "Publish"}
      </button>
    </div>
  );
}
