import React from "react";
import { AbsoluteFill, Img, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Backdrop, Board, body, Caption, chunky, clamp, GOLD, GREEN, March, NAVY, OnPad, PopIn, RARITY_COLOR, RED, Ribbon, SKY, unit, usePop } from "./CommandMode";

/**
 * Concept pitch for a fantasy (unplanned) game mode: "Crown Chess", an auto-chess mode in the
 * style of Magic Chess / Dota Auto Chess / TFT, fitted to a tower defense board.
 * See docs/features/concepts/crown-chess.md. scripts/promo-cc.mjs copies the art into public/cm.
 */

const COST: Record<string, number> = { common: 1, rare: 2, epic: 3, legendary: 4, mythic: 5 };
const essence = (el: string) => staticFile(`cm/items/essence_${el}.webp`);
const hero = (id: string) => staticFile(`cm/heroes/${id}.webp`);

type Shop = { id: string; name: string; rarity: string };
const SHOP_A: Shop[] = [
  { id: "flame_adept", name: "Flame Adept", rarity: "common" },
  { id: "hooded_archer", name: "Hooded Archer", rarity: "common" },
  { id: "ember_witch", name: "Ember Witch", rarity: "rare" },
  { id: "penguin_wizard", name: "Penguin Wizard", rarity: "common" },
  { id: "wolf_hunter", name: "Wolf Hunter", rarity: "common" },
];
const SHOP_B: Shop[] = [
  { id: "thunder_dwarf", name: "Thunder Dwarf", rarity: "rare" },
  { id: "fox_samurai", name: "Fox Samurai", rarity: "epic" },
  { id: "phoenix_chick", name: "Phoenix Chick", rarity: "epic" },
  { id: "valkyrie", name: "Valkyrie", rarity: "legendary" },
  { id: "goblin_bomber", name: "Goblin Bomber", rarity: "common" },
];

function Coin({ size, n }: { size: number; n: number | string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.1 }}>
      <Img src={staticFile("cm/items/coins.webp")} style={{ width: size, height: size }} />
      <div style={chunky(size * 0.7, GOLD)}>{n}</div>
    </div>
  );
}

function Stars({ n, size }: { n: number; size: number }) {
  return <div style={{ ...chunky(size, GOLD), letterSpacing: -size * 0.1 }}>{"★".repeat(n)}</div>;
}

function ShopCard({ u, flip, gone }: { u: Shop; flip: number; gone?: boolean }) {
  const c = RARITY_COLOR[u.rarity];
  return (
    <div style={{ width: 176, transform: `scaleX(${Math.abs(flip)})`, opacity: gone ? 0 : 1 }}>
      <div style={{ background: `linear-gradient(${c}, ${NAVY})`, border: `6px solid ${c}`, borderRadius: 22, padding: 8, boxShadow: `0 8px 0 ${NAVY}`, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <Img src={staticFile(`cm/portraits/${u.id}.webp`)} style={{ width: 150, height: 150, borderRadius: 14 }} />
        <div style={{ ...body(24), whiteSpace: "nowrap" }}>{u.name}</div>
        <Coin size={46} n={COST[u.rarity]} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- scenes

const S_TITLE = 120;
const S_SHOP = 270;
const S_STAR = 240;
const S_TRAIT = 240;
const S_ROUND = 300;
const S_LOBBY = 210;
const S_FIT = 240;
const S_OUT = 150;
export const CC_LEN = S_TITLE + S_SHOP + S_STAR + S_TRAIT + S_ROUND + S_LOBBY + S_FIT + S_OUT;

const HEROES = ["young_king", "dark_knight", "elf_archmage", "gnome_mech", "griffin_knight", "orc_warchief", "panda_brewmaster", "sea_witch"];

function Title() {
  const frame = useCurrentFrame();
  const a = usePop(6, 10);
  const b = usePop(26, 9);
  const c = usePop(54, 12);
  return (
    <AbsoluteFill>
      <Backdrop />
      {HEROES.map((h, i) => {
        const ang = (i / HEROES.length) * Math.PI * 2 + frame / 90;
        const s = usePop(4 + i * 4, 10);
        return <Img key={h} src={hero(h)} style={{ position: "absolute", left: 540 + Math.cos(ang) * 380 - 90, top: 800 + Math.sin(ang) * 380 - 90, width: 180, transform: `scale(${s})` }} />;
      })}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <Img src={unit("fox_samurai", true)} style={{ width: 360, marginTop: -160, transform: `scale(${b})` }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: 120, gap: 24 }}>
        <div style={{ transform: `scale(${a})` }}>
          <Ribbon text="FANTASY MODE" size={52} color="linear-gradient(#b45cff, #6b2bbf)" />
        </div>
        <div style={{ ...chunky(150, GOLD), transform: `scale(${b})` }}>CROWN CHESS</div>
      </AbsoluteFill>
      <div style={{ position: "absolute", bottom: 230, left: 60, right: 60, ...body(46), opacity: c }}>
        Auto-chess, Crown & Keep style. 8 players. Buy, merge, synergize. Last keep standing wins.
      </div>
    </AbsoluteFill>
  );
}

function ShopScene() {
  const frame = useCurrentFrame();
  // Reroll at 90: cards flip to the new shop. Buy Fox at 170: it flies to the bench.
  const flipT = interpolate(frame, [90, 110], [-1, 1], clamp);
  const shop = flipT < 0 ? SHOP_A : SHOP_B;
  const gold = frame < 90 ? 12 : frame < 170 ? 10 : 7;
  const fly = interpolate(frame, [170, 200], [0, 1], clamp);
  const press = frame >= 84 && frame < 92 ? 0.9 : 1;
  return (
    <AbsoluteFill>
      <Backdrop />
      <Caption kicker="STEP 1" title="BUY FROM THE SHOP" sub="5 random units each round. Rarity sets the price: 1 to 5 gold." />
      <div style={{ position: "absolute", top: 470, right: 60 }}>
        <Coin size={80} n={gold} />
      </div>
      <div style={{ position: "absolute", top: 600, left: 0, right: 0, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 12, padding: "0 30px" }}>
        {shop.map((u, i) => (
          <PopIn key={u.id + i} at={10 + i * 6}>
            <ShopCard u={u} flip={flipT === -1 ? 1 : flipT} gone={u.id === "fox_samurai" && frame >= 170} />
          </PopIn>
        ))}
      </div>
      <div style={{ position: "absolute", top: 1290, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 30 }}>
        <div style={{ transform: `scale(${press})` }}>
          <Ribbon text="⟳ REROLL · 2" size={46} />
        </div>
        <Ribbon text="⬆ LEVEL · 4" size={46} color="linear-gradient(#3fcf63, #1f8f3b)" />
      </div>
      {/* The bench: two Fox Samurai already waiting. */}
      <div style={{ position: "absolute", bottom: 90, left: 40, right: 40, height: 230, background: `${NAVY}dd`, border: `4px solid ${SKY}55`, borderRadius: 30, display: "flex", alignItems: "center", gap: 10, padding: "0 20px" }}>
        <div style={{ ...chunky(36, SKY), position: "absolute", top: -50, left: 20 }}>BENCH</div>
        <Img src={unit("fox_samurai")} style={{ width: 200 }} />
        <Img src={unit("fox_samurai")} style={{ width: 200 }} />
        {frame >= 200 && <Img src={unit("fox_samurai")} style={{ width: 200 }} />}
        <Img src={unit("penguin_wizard")} style={{ width: 200 }} />
      </div>
      {frame >= 170 && frame < 200 && (
        <Img src={unit("fox_samurai")} style={{ position: "absolute", left: interpolate(fly, [0, 1], [460, 470]), top: interpolate(fly, [0, 1], [640, 1640]) - Math.sin(fly * Math.PI) * 160, width: 200 }} />
      )}
    </AbsoluteFill>
  );
}

function StarScene() {
  const frame = useCurrentFrame();
  const pull = interpolate(frame, [30, 60], [0, 1], clamp);
  const flash = interpolate(frame, [58, 62, 80], [0, 1, 0], clamp);
  const two = usePop(62, 8);
  const awake = usePop(160, 8);
  return (
    <AbsoluteFill>
      <Backdrop />
      <Caption kicker="STEP 2" title="THREE OF A KIND" sub="3 copies make a 2★. Three 2★ make a 3★, and 3★ awakens." />
      {frame < 62 &&
        [-1, 0, 1].map((k) => (
          <Img key={k} src={unit("fox_samurai")} style={{ position: "absolute", left: 540 - 130 + k * 300 * (1 - pull), top: 700, width: 260 }} />
        ))}
      {frame >= 62 && frame < 160 && (
        <AbsoluteFill style={{ top: 620, alignItems: "center", justifyContent: "flex-start", transform: `scale(${two})` }}>
          <Img src={unit("fox_samurai")} style={{ width: 400 }} />
          <Stars n={2} size={110} />
        </AbsoluteFill>
      )}
      {frame >= 160 && (
        <AbsoluteFill style={{ top: 560, alignItems: "center", justifyContent: "flex-start", transform: `scale(${awake})` }}>
          <div style={{ position: "absolute", top: 40, width: 600, height: 600, borderRadius: "50%", background: `radial-gradient(circle, ${GOLD}99, transparent 65%)` }} />
          <Img src={unit("fox_samurai", true)} style={{ width: 520, position: "relative" }} />
          <Stars n={3} size={120} />
          <div style={chunky(70, GOLD)}>AWAKENED</div>
        </AbsoluteFill>
      )}
      <AbsoluteFill style={{ background: "#fff8d8", opacity: flash }} />
      <div style={{ position: "absolute", bottom: 150, left: 60, right: 60, ...body(38, SKY) }}>
        The pool is shared. If 3 players chase Fox Samurai, nobody finds enough copies.
      </div>
    </AbsoluteFill>
  );
}

function Trait({ el, label, units, bonus, at, tiers }: { el: string; label: string; units: string[]; bonus: string; at: number; tiers: number[] }) {
  const frame = useCurrentFrame();
  const n = Math.min(units.length, Math.max(0, Math.floor((frame - at) / 14) + 1));
  const active = tiers.filter((t) => n >= t).length;
  return (
    <div style={{ background: `${NAVY}dd`, border: `5px solid ${active ? GOLD : SKY + "55"}`, borderRadius: 26, padding: "18px 24px", width: 960, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <Img src={essence(el)} style={{ width: 90, height: 90 }} />
        <div style={{ ...chunky(56, active ? GOLD : "#fff"), textAlign: "left", flex: 1 }}>{label}</div>
        <div style={{ display: "flex", gap: 10 }}>
          {tiers.map((t) => (
            <div key={t} style={{ ...chunky(44, n >= t ? GOLD : "#6b77a8"), background: n >= t ? "#5a3d00" : "#1d2350", borderRadius: 14, padding: "4px 16px" }}>
              {t}
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, height: 150 }}>
        {units.slice(0, n).map((u, i) => (
          <PopIn key={u + i} at={at + i * 14}>
            <Img src={unit(u)} style={{ width: 150 }} />
          </PopIn>
        ))}
      </div>
      <div style={{ ...body(32, active ? GREEN : "#9fb0e8"), textAlign: "left" }}>{bonus}</div>
    </div>
  );
}

function TraitScene() {
  return (
    <AbsoluteFill>
      <Backdrop />
      <Caption kicker="STEP 3" title="STACK SYNERGIES" sub="Element is the origin. Perk is the class. Hit 2 / 4 / 6 for bonuses." />
      <div style={{ position: "absolute", top: 560, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 30 }}>
        <Trait el="fire" label="FIRE" tiers={[2, 4, 6]} units={["flame_adept", "ember_witch", "lava_golem", "phoenix_chick"]} bonus="(4) Burn spreads to nearby monsters" at={20} />
        <Trait el="arcane" label="ARMOR BREAKER" tiers={[2, 4]} units={["fox_samurai", "magnet_robot"]} bonus="(2) Hits shred 20% armor" at={110} />
      </div>
    </AbsoluteFill>
  );
}

function RoundScene() {
  const frame = useCurrentFrame();
  const res = usePop(200, 10);
  return (
    <Board>
      <March ids={["goblin_runner", "wolf_raider", "armored_beetle", "goblin_runner", "vampire_bat", "door_ogre", "wolf_raider", "fire_wisp"]} start={20} gap={16} speed={9} dieAt={900} />
      <OnPad id="fox_samurai" pad={0} at={4} label="★★" />
      <OnPad id="lava_golem" pad={1} at={8} />
      <OnPad id="phoenix_chick" pad={2} at={12} />
      <OnPad id="ember_witch" pad={3} at={16} />
      <OnPad id="flame_adept" pad={4} at={20} />
      <OnPad id="magnet_robot" pad={5} at={24} />
      <Caption kicker="STEP 4 · DUEL ROUND" title="DEFEND THE SAME WAVE" sub="You and your opponent's ghost board face one seeded wave." top={40} />
      {frame >= 200 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", background: `${NAVY}99` }}>
          <div style={{ transform: `scale(${res})`, background: NAVY, border: `8px solid ${GOLD}`, borderRadius: 36, padding: "40px 50px", display: "flex", flexDirection: "column", alignItems: "center", gap: 24, width: 900 }}>
            <div style={chunky(70, GOLD)}>ROUND WON</div>
            <div style={{ display: "flex", gap: 60, alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <Img src={hero("young_king")} style={{ width: 180 }} />
                <div style={body(36)}>You · 0 leaks</div>
              </div>
              <div style={chunky(70)}>VS</div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <Img src={hero("dark_knight")} style={{ width: 180, filter: "grayscale(0.6)" }} />
                <div style={body(36)}>Ghost · 4 leaks</div>
              </div>
            </div>
            <div style={chunky(64, RED)}>DARK KNIGHT −8 HP</div>
          </div>
        </AbsoluteFill>
      )}
    </Board>
  );
}

function LobbyScene() {
  const frame = useCurrentFrame();
  // Each hero's HP drains at its own pace; the young king survives.
  const drain = [0.3, 0.62, 0.7, 0.85, 0.66, 1.0, 0.78, 0.64];
  const win = usePop(170, 9);
  return (
    <AbsoluteFill>
      <Backdrop />
      <Caption kicker="8-PLAYER LOBBY" title="LAST KEEP STANDING" sub="Lose a duel, lose HP. Hit 0 and your keep falls." />
      <div style={{ position: "absolute", top: 560, left: 60, right: 60, display: "flex", flexWrap: "wrap", gap: 22, justifyContent: "center" }}>
        {HEROES.map((h, i) => {
          const hp = i === 0 ? Math.max(14, 100 - frame * drain[i]) : Math.max(0, 100 - frame * drain[i]);
          const out = hp <= 0;
          return (
            <div key={h} style={{ width: 460, display: "flex", alignItems: "center", gap: 14, background: `${NAVY}dd`, borderRadius: 22, padding: 12, border: `4px solid ${i === 0 && frame >= 170 ? GOLD : "#ffffff22"}`, filter: out ? "grayscale(1) brightness(0.5)" : undefined }}>
              <Img src={hero(h)} style={{ width: 120 }} />
              <div style={{ flex: 1, height: 34, background: "#0b0e24", borderRadius: 17, overflow: "hidden" }}>
                <div style={{ width: `${hp}%`, height: "100%", background: hp > 40 ? GREEN : hp > 15 ? GOLD : RED }} />
              </div>
              <div style={{ ...chunky(36), width: 70 }}>{out ? "✖" : Math.ceil(hp)}</div>
            </div>
          );
        })}
      </div>
      {frame >= 170 && (
        <div style={{ position: "absolute", bottom: 160, left: 0, right: 0, display: "flex", justifyContent: "center", transform: `scale(${win})` }}>
          <Ribbon text="👑 #1 · YOUNG KING" size={64} color={`linear-gradient(${GOLD}, #c98a00)`} />
        </div>
      )}
    </AbsoluteFill>
  );
}

function FitScene() {
  const rows: [string, string, boolean][] = [
    ["5 rarities", "5 shop prices", true],
    ["6 elements", "6 origin traits", true],
    ["Perks", "class traits", true],
    ["Merge system", "3-of-a-kind stars", true],
    ["Seeded battle sim", "async ghost duels", true],
    ["8 heroes", "player avatars", true],
    ["Shop, gold, interest", "", false],
    ["Trait bonuses, 8-player lobby", "", false],
  ];
  return (
    <AbsoluteFill>
      <Backdrop />
      <Caption kicker="CAN WE BUILD IT?" title="MOSTLY ALREADY HERE" sub="78 units is a full auto-chess set." />
      <div style={{ position: "absolute", top: 560, left: 60, right: 60, display: "flex", flexDirection: "column", gap: 16 }}>
        {rows.map(([have, becomes, ok], i) => (
          <PopIn key={have} at={15 + i * 14}>
            <div style={{ display: "flex", alignItems: "center", gap: 20, background: `${NAVY}dd`, borderRadius: 20, padding: "14px 24px", border: `4px solid ${ok ? GREEN : GOLD}88` }}>
              <div style={{ fontSize: 50 }}>{ok ? "✅" : "🔨"}</div>
              <div style={{ ...chunky(42), textAlign: "left", flex: 1 }}>{have}</div>
              <div style={{ ...body(34, ok ? GREEN : GOLD), textAlign: "right" }}>{ok ? `→ ${becomes}` : "NEW BUILD"}</div>
            </div>
          </PopIn>
        ))}
      </div>
    </AbsoluteFill>
  );
}

function Outro() {
  const a = usePop(5, 10);
  const b = usePop(35, 10);
  const c = usePop(65, 12);
  return (
    <AbsoluteFill>
      <Backdrop />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 46, padding: 70 }}>
        <div style={{ ...chunky(100), transform: `scale(${a})` }}>BUY. MERGE. DEFEND.</div>
        <div style={{ ...chunky(130, GOLD), transform: `scale(${b})` }}>CROWN CHESS</div>
        <Img src={staticFile("cm/logo.png")} style={{ width: 640, transform: `scale(${c})` }} />
        <div style={{ ...body(32, "#9fb0e8"), opacity: c }}>Fantasy concept · not on the roadmap</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

export const CrownChess = () => {
  let t = 0;
  const seq = (len: number, node: React.ReactNode) => {
    const from = t;
    t += len;
    return (
      <Sequence from={from} durationInFrames={len}>
        {node}
      </Sequence>
    );
  };
  return (
    <AbsoluteFill style={{ background: NAVY }}>
      {seq(S_TITLE, <Title />)}
      {seq(S_SHOP, <ShopScene />)}
      {seq(S_STAR, <StarScene />)}
      {seq(S_TRAIT, <TraitScene />)}
      {seq(S_ROUND, <RoundScene />)}
      {seq(S_LOBBY, <LobbyScene />)}
      {seq(S_FIT, <FitScene />)}
      {seq(S_OUT, <Outro />)}
    </AbsoluteFill>
  );
};
