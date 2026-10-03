import { useEffect, useState } from "react";
import { api, asset } from "../api";
import { useConfig } from "../config";
import { Num, Text, Select, Toggle, Thumb, PageHead, timeAgo, toast } from "../components";
import { newEvent, newOffer, offerPhase, phaseOf, timeOf, shortDuration, type EventDef, type OfferDef, type Phase } from "../../../shared/offers.ts";

interface Sale {
  offer: string;
  currency: "coins" | "gems";
  sold: number;
  buyers: number;
  spent: number;
  soldToday: number;
  lastAt: number;
}

const NO_CHEST = "(none)";
const NO_EVENT = "(own dates)";
/** Item art that reads well as a bundle. */
const ART = [
  "card_pack", "chest_common", "chest_rare", "chest_epic", "chest_legendary", "chest_open_loot", "gift_box", "gems", "coins",
  "key_gold", "star_shard", "battle_pass_ticket", "spell_book", "scroll_upgrade", "talent_rune", "dust_crystals", "trophy",
] as const;

/** ISO time <-> the value of a datetime-local input (the admin's own time zone). */
const toLocal = (iso: string | null) => {
  const t = iso ? timeOf(iso) : NaN;
  if (!Number.isFinite(t)) return "";
  return new Date(t - new Date(t).getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const fromLocal = (v: string) => (v ? new Date(v).toISOString() : null);

function When({ value, onChange, empty }: { value: string | null; onChange: (v: string | null) => void; empty?: string }) {
  return (
    <span className="when">
      <input type="datetime-local" value={toLocal(value)} onChange={(e) => onChange(fromLocal(e.target.value))} />
      {empty && value && (
        <button className="icon" title={`Clear (${empty})`} onClick={() => onChange(null)}>
          ×
        </button>
      )}
    </span>
  );
}

const PHASE_LABEL: Record<Phase, string> = { live: "Live", scheduled: "Scheduled", ended: "Ended", off: "Off" };

function PhaseBadge({ phase, start, end }: { phase: Phase; start: number | null; end: number | null }) {
  const now = Date.now();
  const sub = phase === "live" && end !== null ? `ends in ${shortDuration(end - now)}` : phase === "scheduled" && start !== null ? `starts in ${shortDuration(start - now)}` : "";
  return (
    <div>
      <span className={`badge ${phase === "live" ? "ok" : phase === "scheduled" ? "info" : ""}`}>{PHASE_LABEL[phase]}</span>
      {sub && <div className="muted small">{sub}</div>}
    </div>
  );
}

export function OffersPage() {
  const { draft, saved, edit } = useConfig();
  const [sales, setSales] = useState<Sale[]>([]);
  const [, setTick] = useState(0);
  useEffect(() => {
    api<Sale[]>("GET", "/offers/sales").then(setSales).catch((e) => toast(e.message, "err"));
    // Keep the Live / Scheduled badges current.
    const t = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);
  if (!draft || !saved) return <div className="muted">Loading…</div>;

  const chests = draft.chests.map((c) => c.id);
  const chestNames = Object.fromEntries(draft.chests.map((c) => [c.id, c.name]));
  const eventIds = draft.events.map((e) => e.id);
  const setEv = <K extends keyof EventDef>(i: number, k: K, v: EventDef[K]) => edit((c) => void (c.events[i][k] = v));
  const setOf = <K extends keyof OfferDef>(i: number, k: K, v: OfferDef[K]) => edit((c) => void (c.offers[i][k] = v));
  const setReward = (i: number, fn: (r: OfferDef["reward"]) => void) => edit((c) => fn(c.offers[i].reward));
  const evChanged = (e: EventDef, k: keyof EventDef) => {
    const before = saved.events.find((s) => s.id === e.id);
    return !before || JSON.stringify(before[k]) !== JSON.stringify(e[k]) ? "changed" : "";
  };
  const ofChanged = (o: OfferDef, ...ks: (keyof OfferDef)[]) => {
    const before = saved.offers.find((s) => s.id === o.id);
    return !before || ks.some((k) => JSON.stringify(before[k]) !== JSON.stringify(o[k])) ? "changed" : "";
  };
  const nextId = (prefix: string, taken: string[]) => {
    let n = taken.length + 1;
    while (taken.includes(`${prefix}_${n}`)) n++;
    return `${prefix}_${n}`;
  };
  const saleOf = (id: string) => {
    const rows = sales.filter((s) => s.offer === id);
    if (!rows.length) return null;
    return {
      sold: rows.reduce((s, r) => s + r.sold, 0),
      buyers: rows.reduce((s, r) => s + r.buyers, 0),
      today: rows.reduce((s, r) => s + r.soldToday, 0),
      spent: rows.map((r) => `${r.spent.toLocaleString()} ${r.currency === "coins" ? "gold" : "gems"}`).join(" + "),
      lastAt: Math.max(...rows.map((r) => r.lastAt)),
    };
  };

  return (
    <>
      <PageHead
        title="Offers & events"
        desc="Limited-time events and the bundles sold in the shop's SPECIALS shelf. Times are in your time zone; the server switches things on and off by itself, so publish ahead of time and it goes live at the start."
      />

      <section className="panel">
        <div className="panel-head">
          <h2>Events</h2>
          <button className="btn small" onClick={() => edit((c) => void c.events.push(newEvent(nextId("event", c.events.map((e) => e.id)))))}>
            Add event
          </button>
        </div>
        {draft.events.length === 0 ? (
          <p className="muted">No events yet. An event boosts battle gold and gems and/or discounts chests while it runs, and shows a banner in the lobby and shop.</p>
        ) : (
          <div className="table-wrap">
            <table className="grid">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Starts</th>
                  <th>Ends</th>
                  <th title="Battle gold multiplier">Gold x</th>
                  <th title="Battle gems multiplier">Gems x</th>
                  <th title="Off every chest in the shop">Chest discount</th>
                  <th>Status</th>
                  <th>On</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {draft.events.map((e, i) => (
                  <tr key={e.id} className={e.enabled ? "" : "disabled"}>
                    <td className={evChanged(e, "name") || evChanged(e, "text")}>
                      <Text value={e.name} onChange={(v) => setEv(i, "name", v)} width={200} />
                      <div style={{ marginTop: 4 }}>
                        <Text value={e.text} onChange={(v) => setEv(i, "text", v)} width={260} placeholder="One line for players" />
                      </div>
                      <div className="id">{e.id}</div>
                    </td>
                    <td className={evChanged(e, "startsAt")}><When value={e.startsAt} onChange={(v) => v && setEv(i, "startsAt", v)} /></td>
                    <td className={evChanged(e, "endsAt")}><When value={e.endsAt} onChange={(v) => v && setEv(i, "endsAt", v)} /></td>
                    <td className={evChanged(e, "coinMult")}><Num value={e.coinMult} min={1} step={0.25} width={64} onChange={(v) => setEv(i, "coinMult", v)} /></td>
                    <td className={evChanged(e, "gemMult")}><Num value={e.gemMult} min={1} step={0.25} width={64} onChange={(v) => setEv(i, "gemMult", v)} /></td>
                    <td className={evChanged(e, "chestDiscount")}>
                      <Num value={Math.round(e.chestDiscount * 100)} min={0} step={5} width={64} onChange={(v) => setEv(i, "chestDiscount", Math.min(90, v) / 100)} /> %
                    </td>
                    <td><PhaseBadge phase={phaseOf(e.enabled, timeOf(e.startsAt), timeOf(e.endsAt))} start={timeOf(e.startsAt)} end={timeOf(e.endsAt)} /></td>
                    <td className={evChanged(e, "enabled")}><Toggle value={e.enabled} onChange={(v) => setEv(i, "enabled", v)} /></td>
                    <td>
                      <button
                        className="btn small ghost"
                        onClick={() =>
                          edit((c) => {
                            // Offers tied to this event fall back to their own dates, switched off.
                            for (const o of c.offers) if (o.event === e.id) Object.assign(o, { event: null, enabled: false });
                            c.events.splice(i, 1);
                          })
                        }
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="muted small">
          Battle rewards are boosted when the battle ends inside the event. Trophies are never boosted. If events overlap, each
          boost is the biggest one any of them gives (they don't multiply together).
        </p>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Shop offers</h2>
          <button className="btn small" onClick={() => edit((c) => void c.offers.push(newOffer(nextId("offer", c.offers.map((o) => o.id)))))}>
            Add offer
          </button>
        </div>
        <div className="table-wrap">
          <table className="grid">
            <thead>
              <tr>
                <th>Art</th>
                <th>Name</th>
                <th>Price</th>
                <th title="Struck-through old price; 0 for none">Was</th>
                <th>Gold</th>
                <th>Gems</th>
                <th>Chest</th>
                <th title="Per player; 0 = unlimited">Limit</th>
                <th title="Only shown to players with at least this many">Trophies</th>
                <th>On sale</th>
                <th>Status</th>
                <th>Sales</th>
                <th>On</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {draft.offers.map((o, i) => {
                const ev = o.event ? draft.events.find((e) => e.id === o.event) : undefined;
                const start = ev ? timeOf(ev.startsAt) : o.startsAt ? timeOf(o.startsAt) : null;
                const end = ev ? timeOf(ev.endsAt) : o.endsAt ? timeOf(o.endsAt) : null;
                const s = saleOf(o.id);
                return (
                  <tr key={o.id} className={o.enabled ? "" : "disabled"}>
                    <td className={ofChanged(o, "image")}>
                      <Thumb src={asset("items", o.image)} size={56} />
                      <div><Select value={o.image as (typeof ART)[number]} options={ART} onChange={(v) => setOf(i, "image", v)} /></div>
                    </td>
                    <td className={ofChanged(o, "name", "text")}>
                      <Text value={o.name} onChange={(v) => setOf(i, "name", v)} width={170} />
                      <div style={{ marginTop: 4 }}>
                        <Text value={o.text} onChange={(v) => setOf(i, "text", v)} width={220} placeholder="One line for players" />
                      </div>
                      <div className="id">{o.id}</div>
                    </td>
                    <td className={ofChanged(o, "price", "currency")}>
                      <Num value={o.price} min={0} step={10} width={72} onChange={(v) => setOf(i, "price", Math.round(v))} />
                      <div><Select value={o.currency} options={["coins", "gems"] as const} labels={{ coins: "gold", gems: "gems" }} onChange={(v) => setOf(i, "currency", v)} /></div>
                    </td>
                    <td className={ofChanged(o, "wasPrice")}><Num value={o.wasPrice} min={0} step={10} width={72} onChange={(v) => setOf(i, "wasPrice", Math.round(v))} /></td>
                    <td className={ofChanged(o, "reward")}><Num value={o.reward.coins} min={0} step={100} width={80} onChange={(v) => setReward(i, (r) => void (r.coins = Math.round(v)))} /></td>
                    <td className={ofChanged(o, "reward")}><Num value={o.reward.gems} min={0} step={10} width={72} onChange={(v) => setReward(i, (r) => void (r.gems = Math.round(v)))} /></td>
                    <td className={ofChanged(o, "reward", "chests")}>
                      <Select value={o.reward.chest ?? NO_CHEST} options={[NO_CHEST, ...chests]} labels={chestNames} onChange={(v) => setReward(i, (r) => void (r.chest = v === NO_CHEST ? null : v))} />
                      {o.reward.chest && (
                        <div style={{ marginTop: 4 }}>
                          x <Num value={o.chests} min={1} width={56} onChange={(v) => setOf(i, "chests", Math.round(v))} />
                        </div>
                      )}
                    </td>
                    <td className={ofChanged(o, "limit")}><Num value={o.limit} min={0} width={60} onChange={(v) => setOf(i, "limit", Math.round(v))} /></td>
                    <td className={ofChanged(o, "trophies")}><Num value={o.trophies} min={0} step={100} width={72} onChange={(v) => setOf(i, "trophies", Math.round(v))} /></td>
                    <td className={ofChanged(o, "event", "startsAt", "endsAt")}>
                      <Select value={o.event ?? NO_EVENT} options={[NO_EVENT, ...eventIds]} labels={Object.fromEntries(draft.events.map((e) => [e.id, `During ${e.name}`]))} onChange={(v) => setOf(i, "event", v === NO_EVENT ? null : v)} />
                      {!o.event && (
                        <div className="when-pair">
                          <label>from <When value={o.startsAt} empty="now" onChange={(v) => setOf(i, "startsAt", v)} /></label>
                          <label>until <When value={o.endsAt} empty="no end" onChange={(v) => setOf(i, "endsAt", v)} /></label>
                        </div>
                      )}
                    </td>
                    <td><PhaseBadge phase={offerPhase(o, Date.now(), draft.events)} start={start} end={end} /></td>
                    <td className="small">
                      {s ? (
                        <>
                          <strong>{s.sold.toLocaleString()}</strong> sold{s.today ? ` (${s.today} today)` : ""}
                          <div className="muted">{s.buyers.toLocaleString()} players · {s.spent}</div>
                          <div className="muted">last {timeAgo(s.lastAt)}</div>
                        </>
                      ) : (
                        <span className="muted">none yet</span>
                      )}
                    </td>
                    <td className={ofChanged(o, "enabled")}><Toggle value={o.enabled} onChange={(v) => setOf(i, "enabled", v)} /></td>
                    <td>
                      <button className="btn small ghost" onClick={() => edit((c) => void c.offers.splice(i, 1))}>
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="muted small">
          Players see live offers in the shop's SPECIALS shelf, filed under the tab of their currency (price 0 counts as FREE).
          Offers bought are counted per player by offer id, so a new offer starts every player's limit from zero. Chests in a
          bundle are opened on purchase and count toward the "open chests" quest.
        </p>
      </section>
    </>
  );
}
