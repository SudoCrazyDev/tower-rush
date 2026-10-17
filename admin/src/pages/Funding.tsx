import { useEffect, useState } from "react";
import { api } from "../api";
import { API_BASE, currentEnv } from "../env";
import { Modal, PageHead, Stat, Toggle, fmtDate, toast } from "../components";
import { displayName, type Donation, type DonationMethod, type FundingGoal, type FundingSettings, type FundingSummary } from "../../../shared/funding.ts";

interface Data {
  goals: FundingGoal[];
  donations: Donation[];
  settings: FundingSettings;
  summary: FundingSummary;
}

const usd = (c: number) => `$${(c / 100).toFixed(2)}`;
const METHOD_LABEL: Record<DonationMethod, string> = { gcash: "GCash", kofi: "Ko-fi", manual: "Manual" };

/**
 * Community funding: goals shown on the website's support page, the queue of pledges waiting
 * for their payment, and every gift. GCash pledges are confirmed here once the money arrives;
 * Ko-fi ones confirm themselves through the webhook.
 */
export function FundingPage() {
  const [data, setData] = useState<Data | null>(null);
  const [editGoal, setEditGoal] = useState<Partial<FundingGoal> | null>(null);
  const [adding, setAdding] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const load = () => api<Data>("GET", "/funding").then(setData).catch((e) => toast(e.message, "err"));
  useEffect(() => void load(), []);

  if (!data) return <div className="muted">Loading…</div>;
  const goalTitle = (id: number | null) => (id == null ? "General fund" : data.goals.find((g) => g.id === id)?.title ?? `#${id}`);
  const pending = data.donations.filter((d) => d.status === "pending");
  const others = data.donations.filter((d) => d.status !== "pending");
  const progress = new Map(data.summary.goals.map((g) => [g.id, g]));

  const update = async (d: Donation, patch: Record<string, unknown>, msg: string) => {
    try {
      await api("PUT", `/funding/donations/${d.id}`, patch);
      toast(msg);
      load();
    } catch (e) {
      toast((e as Error).message, "err");
    }
  };

  return (
    <>
      <PageHead title="Funding" desc="Goals on the website's Support page. Players pledge to a goal, get a code (CK-XXXX), then pay by GCash QR or Ko-fi with the code in the message. Confirm GCash pledges here when the money arrives.">
        <button className="btn ghost" onClick={() => setAdding(true)}>Log a donation</button>
        <button className="btn primary" onClick={() => setEditGoal({ category: "", title: "", description: "", targetCents: 500, monthly: false, sort: (data.goals.length + 1) * 10, status: "active" })}>New goal</button>
      </PageHead>

      <div className="stats tight">
        <Stat label="Raised (all time)" value={usd(data.summary.totalCents)} />
        <Stat label="Supporters" value={data.summary.supporters} />
        <Stat label="General fund" value={usd(data.summary.generalCents)} sub="untargeted + overflow" />
        <Stat label="Waiting to confirm" value={pending.length} />
      </div>

      <section className="panel">
        <div className="panel-head"><h2>Waiting for payment</h2><span className="muted small">Pledges older than 14 days drop off.</span></div>
        {pending.length === 0 ? (
          <div className="muted">Nothing waiting.</div>
        ) : (
          <div className="table-wrap">
            <table className="grid">
              <thead><tr><th>Code</th><th>From</th><th>Goal</th><th>Pledged</th><th>Expect</th><th>Made</th><th>GCash ref no.</th><th /></tr></thead>
              <tbody>
                {pending.map((d) => <PendingRow key={d.id} d={d} goal={goalTitle(d.goalId)} onUpdate={update} />)}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-head"><h2>Goals</h2></div>
        <div className="table-wrap">
          <table className="grid">
            <thead><tr><th>Order</th><th>Category</th><th>Goal</th><th>Progress</th><th>Donors</th><th>Status</th><th /></tr></thead>
            <tbody>
              {[...data.goals].sort((a, b) => a.sort - b.sort || a.id - b.id).map((g) => {
                const p = progress.get(g.id);
                return (
                  <tr key={g.id}>
                    <td>{g.sort}</td>
                    <td>{g.category}</td>
                    <td><strong>{g.title}</strong>{g.monthly && <span className="badge info" style={{ marginLeft: 6 }}>monthly</span>}<div className="muted small">{g.description}</div></td>
                    <td className="nowrap">{p ? `${usd(p.raisedCents)} / ${usd(g.targetCents)}` : usd(g.targetCents)}{p?.carriedCents ? <div className="muted small">{usd(p.carriedCents)} carried in</div> : null}</td>
                    <td className="small">{p?.donors.join(", ") || <span className="muted">—</span>}</td>
                    <td>{g.status === "archived" ? <span className="badge">archived</span> : p?.done ? <span className="badge ok">funded</span> : <span className="badge info">open</span>}</td>
                    <td><button className="btn small" onClick={() => setEditGoal(g)}>Edit</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Donations</h2>
          <Toggle value={showAll} onChange={setShowAll} label="Show rejected" />
        </div>
        <div className="table-wrap">
          <table className="grid">
            <thead><tr><th>When</th><th>From</th><th>Goal</th><th>Amount</th><th>Paid</th><th>Method</th><th>Ref</th><th>Status</th><th /></tr></thead>
            <tbody>
              {others.filter((d) => showAll || d.status !== "rejected").map((d) => (
                <tr key={d.id}>
                  <td className="nowrap small">{fmtDate(d.confirmedAt ?? d.createdAt)}</td>
                  <td>{displayName(d)}{d.anonymous && d.name && <div className="muted small">{d.name}</div>}{d.message && <div className="muted small">“{d.message}”</div>}</td>
                  <td>
                    <select value={d.goalId ?? ""} onChange={(e) => update(d, { goalId: e.target.value }, "Moved")}>
                      <option value="">General fund</option>
                      {data.goals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
                    </select>
                  </td>
                  <td>{usd(d.amountCents)}</td>
                  <td className="small">{d.paidAmount != null ? `${d.paidAmount} ${d.paidCurrency ?? ""}` : "—"}</td>
                  <td>{METHOD_LABEL[d.method]}</td>
                  <td className="small"><code>{d.ref ?? d.code ?? ""}</code></td>
                  <td>{d.status === "confirmed" ? <span className="badge ok">confirmed</span> : <span className="badge err">rejected</span>}</td>
                  <td>
                    {d.status === "confirmed"
                      ? <button className="btn small ghost" onClick={() => confirm("Reject this donation? It stops counting.") && update(d, { status: "rejected" }, "Rejected")}>Reject</button>
                      : <button className="btn small" onClick={() => update(d, { status: "confirmed" }, "Restored")}>Restore</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <SettingsPanel settings={data.settings} onSaved={load} />

      {editGoal && <GoalModal goal={editGoal} onClose={() => setEditGoal(null)} onSaved={() => { setEditGoal(null); load(); }} />}
      {adding && <DonationModal goals={data.goals} phpPerUsd={data.settings.phpPerUsd} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); load(); }} />}
    </>
  );
}

function PendingRow({ d, goal, onUpdate }: { d: Donation; goal: string; onUpdate: (d: Donation, patch: Record<string, unknown>, msg: string) => void }) {
  const [ref, setRef] = useState("");
  return (
    <tr>
      <td><code>{d.code}</code></td>
      <td>{displayName(d)}{d.message && <div className="muted small">“{d.message}”</div>}</td>
      <td>{goal}</td>
      <td>{usd(d.amountCents)}</td>
      <td className="nowrap">{d.paidAmount} {d.paidCurrency} <span className="muted small">{METHOD_LABEL[d.method]}</span></td>
      <td className="nowrap small">{fmtDate(d.createdAt)}</td>
      <td><input value={ref} placeholder="optional" onChange={(e) => setRef(e.target.value)} style={{ width: 140 }} /></td>
      <td className="nowrap">
        <button className="btn small primary" onClick={() => onUpdate(d, { status: "confirmed", ref }, `Confirmed ${d.code}`)}>Received</button>{" "}
        <button className="btn small ghost" onClick={() => onUpdate(d, { status: "rejected" }, `Dropped ${d.code}`)}>Drop</button>
      </td>
    </tr>
  );
}

function GoalModal({ goal, onClose, onSaved }: { goal: Partial<FundingGoal>; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({
    category: goal.category ?? "",
    title: goal.title ?? "",
    description: goal.description ?? "",
    target: ((goal.targetCents ?? 500) / 100).toString(),
    monthly: !!goal.monthly,
    sort: String(goal.sort ?? 0),
    status: goal.status ?? "active",
  });
  const [err, setErr] = useState("");
  const save = async () => {
    try {
      const b = { ...f, target: Number(f.target), sort: Number(f.sort) };
      if (goal.id) await api("PUT", `/funding/goals/${goal.id}`, b);
      else await api("POST", "/funding/goals", b);
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  const remove = async () => {
    if (!goal.id || !confirm(`Delete "${goal.title}"?`)) return;
    try {
      await api("DELETE", `/funding/goals/${goal.id}`);
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  return (
    <Modal
      title={goal.id ? "Edit goal" : "New goal"}
      onClose={onClose}
      actions={<>{goal.id && <button className="btn ghost danger" onClick={remove}>Delete</button>}<button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save}>Save</button></>}
    >
      <div className="form">
        <label>Category <span className="muted">groups goals on the page, e.g. VFX Projectiles, Bug fixes, Running costs</span><input value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} autoFocus /></label>
        <label>Title<input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></label>
        <label>Description<textarea rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></label>
        <div className="row">
          <label>Target (USD)<input type="number" min={1} step="0.5" value={f.target} onChange={(e) => setF({ ...f, target: e.target.value })} style={{ width: 120 }} /></label>
          <label>Order<input type="number" value={f.sort} onChange={(e) => setF({ ...f, sort: e.target.value })} style={{ width: 90 }} /></label>
          <label>Status
            <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as "active" | "archived" })}>
              <option value="active">Active</option>
              <option value="archived">Archived (hidden)</option>
            </select>
          </label>
        </div>
        <Toggle value={f.monthly} onChange={(v) => setF({ ...f, monthly: v })} label="Monthly (refills each month, e.g. server costs)" />
        <div className="muted small">In a category, goals fill in order; extra money flows to the next open goal, then to the general fund.</div>
        {err && <div className="error">{err}</div>}
      </div>
    </Modal>
  );
}

function DonationModal({ goals, phpPerUsd, onClose, onSaved }: { goals: FundingGoal[]; phpPerUsd: number; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ goalId: "", name: "", anonymous: false, php: "", amount: "", method: "gcash" as DonationMethod, ref: "", message: "" });
  const [err, setErr] = useState("");
  const setPhp = (php: string) => setF({ ...f, php, amount: php ? (Number(php) / phpPerUsd).toFixed(2) : f.amount });
  const save = async () => {
    try {
      await api("POST", "/funding/donations", {
        ...f,
        amount: Number(f.amount),
        paidAmount: f.php ? Number(f.php) : f.method === "gcash" ? null : Number(f.amount),
        paidCurrency: f.php ? "PHP" : "USD",
      });
      onSaved();
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  return (
    <Modal title="Log a donation" onClose={onClose} actions={<><button className="btn ghost" onClick={onClose}>Cancel</button><button className="btn primary" onClick={save}>Save</button></>}>
      <div className="form">
        <label>Goal
          <select value={f.goalId} onChange={(e) => setF({ ...f, goalId: e.target.value })}>
            <option value="">General fund</option>
            {goals.filter((g) => g.status === "active").map((g) => <option key={g.id} value={g.id}>{g.category}: {g.title}</option>)}
          </select>
        </label>
        <div className="row">
          <label>Name<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
          <Toggle value={f.anonymous} onChange={(v) => setF({ ...f, anonymous: v })} label="Show as Anonymous" />
        </div>
        <div className="row">
          <label>Method
            <select value={f.method} onChange={(e) => setF({ ...f, method: e.target.value as DonationMethod })}>
              <option value="gcash">GCash</option><option value="kofi">Ko-fi</option><option value="manual">Other</option>
            </select>
          </label>
          <label>Received (PHP)<input type="number" value={f.php} onChange={(e) => setPhp(e.target.value)} style={{ width: 120 }} /></label>
          <label>Counts as (USD)<input type="number" step="0.01" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} style={{ width: 120 }} /></label>
        </div>
        <label>Reference no.<input value={f.ref} onChange={(e) => setF({ ...f, ref: e.target.value })} /></label>
        <div className="muted small">₱{phpPerUsd} = $1 (change in Settings below).</div>
        {err && <div className="error">{err}</div>}
      </div>
    </Modal>
  );
}

function SettingsPanel({ settings, onSaved }: { settings: FundingSettings; onSaved: () => void }) {
  const [f, setF] = useState({ kofiHandle: settings.kofiHandle, gcashName: settings.gcashName, phpPerUsd: String(settings.phpPerUsd) });
  const [qrBust, setQrBust] = useState(Date.now());
  const save = async (patch: Record<string, unknown>) => {
    try {
      await api("PUT", "/funding/settings", patch);
      toast("Saved");
      setQrBust(Date.now());
      onSaved();
    } catch (e) {
      toast((e as Error).message, "err");
    }
  };
  const upload = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 500_000) return toast("Keep the image under 500 KB", "err");
    const r = new FileReader();
    r.onload = () => save({ gcashQr: r.result });
    r.readAsDataURL(file);
  };
  return (
    <section className="panel">
      <div className="panel-head"><h2>Payment settings ({currentEnv})</h2></div>
      <div className="two-col">
        <div className="form">
          <label>GCash account name <span className="muted">shown under the QR, e.g. "Philip L."</span><input value={f.gcashName} onChange={(e) => setF({ ...f, gcashName: e.target.value })} /></label>
          <label>PHP per USD <span className="muted">converts GCash pesos to goal dollars</span><input type="number" value={f.phpPerUsd} onChange={(e) => setF({ ...f, phpPerUsd: e.target.value })} style={{ width: 120 }} /></label>
          <label>Ko-fi handle <span className="muted">optional; leave empty to show GCash only</span><input value={f.kofiHandle} placeholder="ko-fi.com/…" onChange={(e) => setF({ ...f, kofiHandle: e.target.value })} /></label>
          <div><button className="btn primary" onClick={() => save({ ...f, phpPerUsd: Number(f.phpPerUsd) })}>Save settings</button></div>
          {f.kofiHandle && <div className="muted small">Ko-fi webhook URL: <code>{API_BASE[currentEnv] || "http://localhost:8787"}/api/funding/kofi</code>, token in the KOFI_VERIFICATION_TOKEN secret.</div>}
        </div>
        <div className="form">
          <label>GCash QR code <span className="muted">GCash app &gt; Receive &gt; Download QR (PNG/JPG, under 500 KB)</span>
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => upload(e.target.files?.[0])} />
          </label>
          {settings.hasGcashQr
            ? <img src={`${API_BASE[currentEnv]}/api/funding/gcash-qr?t=${qrBust}`} alt="GCash QR" style={{ width: 200, borderRadius: 8, background: "#fff" }} />
            : <div className="muted">No QR uploaded yet; the Support page hides the donate buttons until there is one.</div>}
        </div>
      </div>
    </section>
  );
}
