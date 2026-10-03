import { useConfig } from "../config";
import { Num, Text, Select, Toggle, Thumb, PageHead } from "../components";
import { asset } from "../api";
import { RARITIES } from "../../../shared/units.ts";
import type { ChestDef } from "../../../shared/economy.ts";

const CHEST_ART = ["chest_common", "chest_rare", "chest_epic", "chest_legendary"] as const;

export function ShopPage() {
  const { draft, saved, edit } = useConfig();
  if (!draft || !saved) return <div className="muted">Loading…</div>;
  const set = <K extends keyof ChestDef>(i: number, k: K, v: ChestDef[K]) => edit((c) => void (c.chests[i][k] = v));
  const changed = (ch: ChestDef, k: keyof ChestDef) => {
    const before = saved.chests.find((s) => s.id === ch.id);
    return !before || JSON.stringify(before[k]) !== JSON.stringify(ch[k]) ? "changed" : "";
  };
  const totalWeight = RARITIES.reduce((s, r) => s + draft.dropWeights[r], 0) || 1;
  const e = draft.economy;
  const setE = <K extends keyof typeof e>(k: K, v: (typeof e)[K]) => edit((c) => void (c.economy[k] = v));

  return (
    <>
      <PageHead title="Shop & prices" desc="Chest prices and contents, card drop odds, and the free gift. The shop shows the first 4 enabled chests." />

      <section className="panel">
        <h2>Chests</h2>
        <div className="table-wrap">
          <table className="grid">
            <thead>
              <tr>
                <th></th>
                <th>Name</th>
                <th>Art</th>
                <th>Price</th>
                <th>Currency</th>
                <th>Card rolls</th>
                <th>Gold min</th>
                <th>Gold max</th>
                <th>Guaranteed (1st roll)</th>
                <th>For sale</th>
              </tr>
            </thead>
            <tbody>
              {draft.chests.map((ch, i) => (
                <tr key={ch.id} className={ch.enabled ? "" : "disabled"}>
                  <td><Thumb src={asset("items", ch.image)} size={48} /></td>
                  <td className={changed(ch, "name")}>
                    <Text value={ch.name} onChange={(v) => set(i, "name", v)} width={150} />
                    <div className="id">{ch.id}</div>
                  </td>
                  <td className={changed(ch, "image")}><Select value={ch.image as (typeof CHEST_ART)[number]} options={CHEST_ART} onChange={(v) => set(i, "image", v)} /></td>
                  <td className={changed(ch, "price")}><Num value={ch.price} min={0} step={10} onChange={(v) => set(i, "price", v)} /></td>
                  <td className={changed(ch, "currency")}><Select value={ch.currency} options={["coins", "gems"] as const} labels={{ coins: "gold", gems: "gems" }} onChange={(v) => set(i, "currency", v)} /></td>
                  <td className={changed(ch, "rolls")}><Num value={ch.rolls} min={1} onChange={(v) => set(i, "rolls", v)} /></td>
                  <td className={changed(ch, "coinsMin")}><Num value={ch.coinsMin} min={0} step={10} onChange={(v) => set(i, "coinsMin", v)} /></td>
                  <td className={changed(ch, "coinsMax")}><Num value={ch.coinsMax} min={0} step={10} onChange={(v) => set(i, "coinsMax", v)} /></td>
                  <td className={changed(ch, "guarantee")}><Select value={ch.guarantee} options={RARITIES} onChange={(v) => set(i, "guarantee", v)} /></td>
                  <td className={changed(ch, "enabled")}><Toggle value={ch.enabled} onChange={(v) => set(i, "enabled", v)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="two-col">
        <section className="panel">
          <h2>Card drop odds</h2>
          <p className="muted small">Relative weights for each card roll in a chest.</p>
          <table className="kv">
            <tbody>
              {RARITIES.map((r) => (
                <tr key={r} className={saved.dropWeights[r] !== draft.dropWeights[r] ? "changed" : ""}>
                  <td className={`rarity ${r}`}>{r}</td>
                  <td><Num value={draft.dropWeights[r]} min={0} step={0.5} onChange={(v) => edit((c) => void (c.dropWeights[r] = v))} /></td>
                  <td className="muted">{((draft.dropWeights[r] / totalWeight) * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="panel">
          <h2>Free gift</h2>
          <table className="kv">
            <tbody>
              <tr className={saved.economy.giftCoins !== e.giftCoins ? "changed" : ""}>
                <td>Gold</td>
                <td><Num value={e.giftCoins} min={0} step={10} onChange={(v) => setE("giftCoins", v)} /></td>
              </tr>
              <tr className={saved.economy.giftGems !== e.giftGems ? "changed" : ""}>
                <td>Gems</td>
                <td><Num value={e.giftGems} min={0} onChange={(v) => setE("giftGems", v)} /></td>
              </tr>
              <tr className={saved.economy.giftCooldownHours !== e.giftCooldownHours ? "changed" : ""}>
                <td>Cooldown (hours)</td>
                <td><Num value={e.giftCooldownHours} min={0} step={0.5} onChange={(v) => setE("giftCooldownHours", v)} /></td>
              </tr>
            </tbody>
          </table>
          <p className="muted small">Card upgrade prices are on the Economy page.</p>
        </section>
      </div>
    </>
  );
}
