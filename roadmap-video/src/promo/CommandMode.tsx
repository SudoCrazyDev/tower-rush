import React from "react";
import { AbsoluteFill, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadLilita } from "@remotion/google-fonts/LilitaOne";
import { loadFont as loadNunito } from "@remotion/google-fonts/Nunito";

/**
 * Concept pitch for a fantasy (unplanned) game mode: "Command Mode", a Bloons-TD-style
 * placement mode with a hand-picked squad and no random merges.
 * See docs/features/concepts/command-mode.md. scripts/promo-cm.mjs copies the art into public/cm.
 */

const { fontFamily: DISPLAY } = loadLilita();
const { fontFamily: BODY } = loadNunito("normal", { weights: ["800"], subsets: ["latin"] });

export const NAVY = "#14183a";
export const GOLD = "#ffd93b";
export const SKY = "#c9d2ff";
export const RED = "#ff5a5a";
export const GREEN = "#5ee07a";
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const RARITY_COLOR: Record<string, string> = { common: "#9aa4b8", rare: "#3b8cff", epic: "#b45cff", legendary: "#ffb020", mythic: "#ff4f7a" };

const SQUAD = [
  { id: "fox_samurai", name: "Fox Samurai", rarity: "epic" },
  { id: "hooded_archer", name: "Hooded Archer", rarity: "common" },
  { id: "frost_sorceress", name: "Frost Sorceress", rarity: "rare" },
  { id: "thunder_dwarf", name: "Thunder Dwarf", rarity: "rare" },
  { id: "storm_whelp", name: "Storm Whelp", rarity: "epic" },
  { id: "lava_golem", name: "Lava Golem", rarity: "epic" },
  { id: "tide_mermaid", name: "Tide Mermaid", rarity: "epic" },
  { id: "shadow_ninja", name: "Shadow Ninja", rarity: "epic" },
  { id: "valkyrie", name: "Valkyrie", rarity: "legendary" },
  { id: "chrono_mage", name: "Chrono Mage", rarity: "mythic" },
];

export const chunky = (size: number, color = "#fff"): React.CSSProperties => ({
  fontFamily: DISPLAY,
  fontSize: size,
  color,
  WebkitTextStroke: `${Math.round(size / 8)}px ${NAVY}`,
  paintOrder: "stroke fill",
  textShadow: `0 ${Math.round(size / 11)}px 0 ${NAVY}`,
  lineHeight: 1.02,
  textAlign: "center",
});

export const body = (size: number, color = "#e8ecff"): React.CSSProperties => ({ fontFamily: BODY, fontWeight: 800, fontSize: size, color, lineHeight: 1.25, textAlign: "center" });

export function usePop(at: number, damping = 11) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - at, fps, config: { damping, mass: 0.7 } });
}

export const unit = (id: string, awakened = false) => staticFile(`cm/${awakened ? "units_awakened" : "units"}/${id}.webp`);

export function Backdrop({ dim = 0.55, blur = 6 }: { dim?: number; blur?: number }) {
  return (
    <AbsoluteFill style={{ background: NAVY }}>
      <Img src={staticFile("cm/arena.webp")} style={{ width: "100%", height: "100%", objectFit: "cover", filter: `blur(${blur}px)`, transform: "scale(1.05)" }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, #ffd93b22 0%, ${NAVY}${Math.round(dim * 255).toString(16).padStart(2, "0")} 60%, ${NAVY}f0 100%)` }} />
    </AbsoluteFill>
  );
}

export function Ribbon({ text, size, color = "linear-gradient(#3b6dff, #1f3fbf)" }: { text: string; size: number; color?: string }) {
  return (
    <div style={{ padding: `${size * 0.2}px ${size * 0.7}px`, background: color, border: `${size * 0.12}px solid ${NAVY}`, borderRadius: size * 0.3, boxShadow: `0 ${size * 0.16}px 0 ${NAVY}` }}>
      <div style={chunky(size)}>{text}</div>
    </div>
  );
}

export function Card({ id, name, rarity, size, dim = false }: { id: string; name?: string; rarity: string; size: number; dim?: boolean }) {
  const c = RARITY_COLOR[rarity];
  return (
    <div style={{ width: size, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, filter: dim ? "grayscale(1) brightness(0.5)" : undefined }}>
      <div style={{ width: size, height: size, borderRadius: size * 0.16, border: `${size * 0.06}px solid ${c}`, background: `radial-gradient(circle at 50% 35%, ${c}66, ${NAVY})`, boxShadow: `0 ${size * 0.05}px 0 ${NAVY}`, overflow: "hidden" }}>
        <Img src={staticFile(`cm/portraits/${id}.webp`)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      {name && <div style={{ ...body(size * 0.16), whiteSpace: "nowrap" }}>{name}</div>}
    </div>
  );
}

// ---------------------------------------------------------------- the board

/** A snaking lane down the portrait board, plus the build pads beside it. */
export const LANE = [
  { x: 120, y: 330 },
  { x: 960, y: 330 },
  { x: 960, y: 760 },
  { x: 120, y: 760 },
  { x: 120, y: 1190 },
  { x: 960, y: 1190 },
  { x: 960, y: 1560 },
  { x: 540, y: 1560 },
];
export const PADS = [
  { x: 330, y: 545 },
  { x: 750, y: 545 },
  { x: 330, y: 975 },
  { x: 750, y: 975 },
  { x: 330, y: 1380 },
  { x: 750, y: 1380 },
];

const segLen = LANE.slice(1).map((p, i) => Math.hypot(p.x - LANE[i].x, p.y - LANE[i].y));
const laneLen = segLen.reduce((a, b) => a + b, 0);
export function along(d: number) {
  let rest = Math.max(0, Math.min(d, laneLen));
  for (let i = 0; i < segLen.length; i++) {
    if (rest <= segLen[i]) {
      const t = rest / segLen[i];
      return { x: LANE[i].x + (LANE[i + 1].x - LANE[i].x) * t, y: LANE[i].y + (LANE[i + 1].y - LANE[i].y) * t };
    }
    rest -= segLen[i];
  }
  return LANE[LANE.length - 1];
}

export function Board({ children }: { children?: React.ReactNode }) {
  const d = LANE.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ");
  return (
    <AbsoluteFill>
      <Backdrop dim={0.35} blur={2} />
      <svg width={1080} height={1920} style={{ position: "absolute" }}>
        <path d={d} stroke={NAVY} strokeWidth={128} fill="none" strokeLinejoin="round" strokeLinecap="round" opacity={0.75} />
        <path d={d} stroke="#d9b77a" strokeWidth={104} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        <path d={d} stroke="#00000022" strokeWidth={6} strokeDasharray="22 26" fill="none" />
        {PADS.map((p, i) => (
          <g key={i}>
            <ellipse cx={p.x} cy={p.y + 60} rx={118} ry={44} fill={NAVY} opacity={0.6} />
            <ellipse cx={p.x} cy={p.y + 52} rx={110} ry={40} fill="#8fa3ff55" stroke={SKY} strokeWidth={5} strokeDasharray="14 10" />
          </g>
        ))}
      </svg>
      {children}
    </AbsoluteFill>
  );
}

/** A unit standing on pad `pad`, popping in at frame `at`. */
export function OnPad({ id, pad, at, awakened = false, label }: { id: string; pad: number; at: number; awakened?: boolean; label?: string }) {
  const s = usePop(at, 9);
  const frame = useCurrentFrame();
  const p = PADS[pad];
  const bob = Math.sin((frame + pad * 9) / 7) * 4;
  return (
    <div style={{ position: "absolute", left: p.x - 120, top: p.y - 170 + bob, width: 240, transform: `scale(${s})`, transformOrigin: "50% 100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
      {awakened && <div style={{ position: "absolute", inset: 10, borderRadius: "50%", background: `radial-gradient(circle, ${GOLD}aa, transparent 65%)` }} />}
      <Img src={unit(id, awakened)} style={{ width: 240, height: 240, position: "relative" }} />
      {label && <div style={{ ...chunky(34, awakened ? GOLD : "#fff"), marginTop: -16 }}>{label}</div>}
    </div>
  );
}

/** Monsters marching down the lane; each one spawns `gap` frames after the last. */
export function March({ ids, start, gap = 22, speed = 9, dieAt }: { ids: string[]; start: number; gap?: number; speed?: number; dieAt?: number }) {
  const frame = useCurrentFrame();
  return (
    <>
      {ids.map((id, i) => {
        const t = frame - start - i * gap;
        if (t < 0) return null;
        const d = t * speed;
        if (dieAt !== undefined && d > dieAt + i * 40) return null;
        if (d > laneLen) return null;
        const p = along(d);
        return <Img key={i} src={staticFile(`cm/monsters/${id}.webp`)} style={{ position: "absolute", left: p.x - 70, top: p.y - 100, width: 140, height: 140 }} />;
      })}
    </>
  );
}

export function Caption({ kicker, title, sub, at = 0, top = 70 }: { kicker?: string; title: string; sub?: string; at?: number; top?: number }) {
  const s = usePop(at, 12);
  return (
    <div style={{ position: "absolute", top, left: 40, right: 40, display: "flex", flexDirection: "column", alignItems: "center", gap: 14, transform: `scale(${s})` }}>
      {kicker && <div style={chunky(42, SKY)}>{kicker}</div>}
      <div style={chunky(84)}>{title}</div>
      {sub && <div style={{ ...body(36), background: `${NAVY}cc`, padding: "10px 24px", borderRadius: 18 }}>{sub}</div>}
    </div>
  );
}

// ---------------------------------------------------------------- scenes

const S_TITLE = 120;
const S_DRAFT = 210;
const S_PLACE = 300;
const S_SPAM = 270;
const S_FIX = 165;
const S_OUT = 165;
export const CM_LEN = S_TITLE + S_DRAFT + S_PLACE + S_SPAM + S_FIX * 4 + S_OUT;

function Title() {
  const frame = useCurrentFrame();
  const a = usePop(6, 10);
  const b = usePop(24, 9);
  const c = usePop(52, 12);
  const fox = usePop(14, 8);
  return (
    <AbsoluteFill>
      <Backdrop />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 36, padding: 60 }}>
        <div style={{ transform: `scale(${a})` }}>
          <Ribbon text="FANTASY MODE" size={52} color="linear-gradient(#b45cff, #6b2bbf)" />
        </div>
        <Img src={unit("fox_samurai", true)} style={{ width: 520, transform: `scale(${fox}) translateY(${Math.sin(frame / 9) * 8}px)` }} />
        <div style={{ ...chunky(140, GOLD), transform: `scale(${b})` }}>COMMAND MODE</div>
        <div style={{ ...body(46), opacity: c, maxWidth: 900 }}>No random summons. No lucky merges. You pick the squad, you place every unit.</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

function Draft() {
  return (
    <AbsoluteFill>
      <Backdrop />
      <Caption kicker="STEP 1" title="DRAFT 10 UNITS" sub="Your squad is your whole toolbox this run." />
      <div style={{ position: "absolute", top: 520, left: 60, right: 60, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 34 }}>
        {SQUAD.map((u, i) => (
          <PopIn key={u.id} at={20 + i * 9}>
            <Card {...u} size={170} />
          </PopIn>
        ))}
      </div>
      <PopIn at={130} style={{ position: "absolute", bottom: 170, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <Ribbon text="SQUAD LOCKED · 10/10" size={54} color="linear-gradient(#3fcf63, #1f8f3b)" />
      </PopIn>
    </AbsoluteFill>
  );
}

export function PopIn({ at, children, style }: { at: number; children: React.ReactNode; style?: React.CSSProperties }) {
  const s = usePop(at, 10);
  return <div style={{ transform: `scale(${s})`, ...style }}>{children}</div>;
}

/** The hand along the bottom; tapping a card drops it on the next pad. */
function Hand({ used }: { used: string[] }) {
  return (
    <div style={{ position: "absolute", bottom: 40, left: 20, right: 20, display: "flex", justifyContent: "center", gap: 10, background: `${NAVY}dd`, borderRadius: 30, padding: "16px 10px", border: `4px solid ${SKY}55` }}>
      {SQUAD.map((u) => (
        <Card key={u.id} id={u.id} rarity={u.rarity} size={90} dim={used.includes(u.id)} />
      ))}
    </div>
  );
}

function Place() {
  const frame = useCurrentFrame();
  // A cursor drags the first card to pad 0; the next ones are tap-placed.
  const drag = interpolate(frame, [40, 90], [0, 1], clamp);
  const from = { x: 80, y: 1820 };
  const to = PADS[0];
  const cx = from.x + (to.x - from.x) * drag;
  const cy = from.y + (to.y - from.y) * drag - Math.sin(drag * Math.PI) * 200;
  const placed = [
    { id: "hooded_archer", pad: 0, at: 92 },
    { id: "frost_sorceress", pad: 1, at: 130 },
    { id: "thunder_dwarf", pad: 2, at: 160 },
    { id: "lava_golem", pad: 3, at: 190 },
    { id: "valkyrie", pad: 4, at: 220 },
  ];
  const used = placed.filter((p) => frame >= p.at).map((p) => p.id);
  return (
    <Board>
      <March ids={["goblin_runner", "wolf_raider", "goblin_runner", "armored_beetle", "goblin_runner", "wolf_raider"]} start={150} gap={18} speed={8} dieAt={1500} />
      {placed.map((p) => (
        <OnPad key={p.pad} {...p} />
      ))}
      {frame >= 40 && frame < 92 && <Img src={unit("hooded_archer")} style={{ position: "absolute", left: cx - 90, top: cy - 140, width: 180, opacity: 0.85 }} />}
      {frame >= 30 && frame < 100 && <div style={{ position: "absolute", left: cx, top: cy, fontSize: 90, transform: "rotate(-20deg)" }}>👆</div>}
      <Hand used={used} />
      <Caption kicker="STEP 2" title="DRAG OR TAP TO PLACE" sub="Pads beside the lane. Spend mana, pick the spot." top={40} />
    </Board>
  );
}

function Spam() {
  const frame = useCurrentFrame();
  const stamp = usePop(170, 7);
  const flipAt = [80, 95, 110, 125, 140, 155];
  return (
    <Board>
      <March ids={["door_ogre", "armored_beetle", "iron_snail", "boulder_crab"]} start={40} gap={30} speed={7} dieAt={700} />
      {PADS.map((_, i) => (
        <OnPad key={i} id="fox_samurai" pad={i} at={10 + i * 8} awakened={frame >= flipAt[i]} label={frame >= flipAt[i] ? "AWAKENED" : undefined} />
      ))}
      <Caption kicker="THE PROBLEM" title="FOX SAMURAI × 6" sub="In Classic, luck gates awakening. Here, nothing does." top={40} />
      {frame >= 170 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div style={{ transform: `scale(${2 - stamp}) rotate(-12deg)`, opacity: Math.min(1, stamp * 1.4), border: `14px solid ${RED}`, borderRadius: 30, padding: "10px 50px", background: `${NAVY}cc` }}>
            <div style={chunky(130, RED)}>TOO EASY</div>
          </div>
        </AbsoluteFill>
      )}
    </Board>
  );
}

function FixFrame({ n, title, sub, children }: { n: number; title: string; sub: string; children: React.ReactNode }) {
  return (
    <AbsoluteFill>
      <Backdrop />
      <Caption kicker={`FIX ${n} OF 4`} title={title} sub={sub} top={90} />
      <AbsoluteFill style={{ top: 560, alignItems: "center", justifyContent: "flex-start" }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
}

/** Fix 1: a per-rarity limit on copies of one unit on the board. */
function FixCap() {
  const caps = [
    ["common", "Common", 6],
    ["rare", "Rare", 4],
    ["epic", "Epic", 3],
    ["legendary", "Legendary", 2],
    ["mythic", "Mythic", 1],
  ] as const;
  const lock = usePop(100, 9);
  return (
    <FixFrame n={1} title="COPY CAP" sub="Rarer units: fewer copies on the board.">
      <div style={{ display: "flex", flexDirection: "column", gap: 18, width: 860 }}>
        {caps.map(([r, label, n], i) => (
          <PopIn key={r} at={10 + i * 8}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: `${NAVY}cc`, border: `5px solid ${RARITY_COLOR[r]}`, borderRadius: 22, padding: "12px 34px" }}>
              <div style={chunky(52, RARITY_COLOR[r])}>{label}</div>
              <div style={chunky(60)}>× {n}</div>
            </div>
          </PopIn>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 50, alignItems: "flex-end" }}>
        {[0, 1, 2].map((i) => (
          <PopIn key={i} at={60 + i * 8}>
            <Img src={unit("fox_samurai")} style={{ width: 200 }} />
          </PopIn>
        ))}
        <div style={{ position: "relative", transform: `scale(${lock})` }}>
          <Img src={unit("fox_samurai")} style={{ width: 200, filter: "grayscale(1) brightness(0.4)" }} />
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 110 }}>🔒</div>
        </div>
      </div>
    </FixFrame>
  );
}

/** Fix 2: each extra copy of the same unit costs more. */
function FixPrice() {
  const frame = useCurrentFrame();
  const prices = [100, 150, 225];
  return (
    <FixFrame n={2} title="RISING PRICE" sub="Every extra copy costs +50%. A new unit is always cheaper.">
      <div style={{ display: "flex", gap: 40, alignItems: "flex-end", height: 760 }}>
        {prices.map((p, i) => {
          const h = interpolate(frame, [20 + i * 18, 45 + i * 18], [0, p * 2.4], clamp);
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <div style={chunky(56, GOLD)}>{Math.round((h / 2.4) / 5) * 5}</div>
              <div style={{ width: 170, height: h, background: `linear-gradient(${GOLD}, #c98a00)`, border: `6px solid ${NAVY}`, borderRadius: 18 }} />
              <Img src={unit("fox_samurai")} style={{ width: 190 }} />
              <div style={body(32)}>Fox #{i + 1}</div>
            </div>
          );
        })}
        <PopIn at={90}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <div style={chunky(56, GREEN)}>100</div>
            <div style={{ width: 170, height: 240, background: `linear-gradient(${GREEN}, #2a9a44)`, border: `6px solid ${NAVY}`, borderRadius: 18 }} />
            <Img src={unit("frost_sorceress")} style={{ width: 190 }} />
            <div style={body(32)}>New unit</div>
          </div>
        </PopIn>
      </div>
    </FixFrame>
  );
}

/** Fix 3: ranks are bought in place, and only one copy per unit can awaken. */
function FixCrown() {
  const frame = useCurrentFrame();
  const rank = Math.min(7, 1 + Math.floor(Math.max(0, frame - 15) / 9));
  const awake = frame >= 85;
  const crown = usePop(85, 8);
  return (
    <FixFrame n={3} title="ONE CROWN EACH" sub="Upgrade in place, Rank 1 to 7. Only one copy of a unit may awaken.">
      <div style={{ display: "flex", gap: 30, alignItems: "flex-end" }}>
        <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center" }}>
          {awake && <div style={{ position: "absolute", top: -120, fontSize: 120, transform: `scale(${crown})` }}>👑</div>}
          {awake && <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: `radial-gradient(circle, ${GOLD}99, transparent 65%)` }} />}
          <Img src={unit("fox_samurai", awake)} style={{ width: 400, position: "relative" }} />
          <div style={chunky(64, awake ? GOLD : "#fff")}>{awake ? "AWAKENED" : `RANK ${rank}`}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {[0, 1].map((i) => (
            <PopIn key={i} at={110 + i * 10}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <Img src={unit("fox_samurai")} style={{ width: 200 }} />
                <div style={chunky(38)}>RANK 7 MAX</div>
              </div>
            </PopIn>
          ))}
        </div>
      </div>
      <PopIn at={125} style={{ marginTop: 40 }}>
        <div style={{ ...body(38, SKY), background: `${NAVY}cc`, padding: "12px 28px", borderRadius: 18 }}>Board limit: 3 awakened units, all different.</div>
      </PopIn>
    </FixFrame>
  );
}

/** Fix 4: wave traits that one heavy single-target unit can't handle. */
function FixWaves() {
  const frame = useCurrentFrame();
  const runners = ["goblin_runner", "wolf_raider", "vampire_bat", "goblin_runner", "fire_wisp", "wolf_raider"];
  const leak = usePop(110, 9);
  return (
    <FixFrame n={4} title="WAVES THAT COUNTER" sub="Fast, Dodge, Splitter, Armored. One unit type can't answer them all.">
      <div style={{ position: "relative", width: 1000, height: 640 }}>
        <div style={{ position: "absolute", top: 300, left: 0, right: 0, height: 120, background: "#d9b77a", border: `8px solid ${NAVY}`, borderRadius: 60 }} />
        <Img src={unit("fox_samurai", true)} style={{ position: "absolute", left: 380, top: 30, width: 260 }} />
        <div style={{ ...chunky(36, GOLD), position: "absolute", left: 330, top: 0, width: 360 }}>1 big hit / 1.2 s</div>
        {runners.map((id, i) => {
          const x = interpolate(frame, [10 + i * 12, 90 + i * 12], [-160, 1060], clamp);
          return <Img key={i} src={staticFile(`cm/monsters/${id}.webp`)} style={{ position: "absolute", left: x, top: 280, width: 140 }} />;
        })}
        <div style={{ position: "absolute", right: 0, top: 470, transform: `scale(${leak})` }}>
          <div style={chunky(64, RED)}>5 LEAKED</div>
        </div>
      </div>
      <PopIn at={125}>
        <div style={{ ...body(40, GREEN), background: `${NAVY}cc`, padding: "12px 28px", borderRadius: 18 }}>A Frost Sorceress or Storm Whelp would have held.</div>
      </PopIn>
    </FixFrame>
  );
}

function Outro() {
  const a = usePop(5, 10);
  const b = usePop(30, 10);
  const c = usePop(70, 12);
  return (
    <AbsoluteFill>
      <Backdrop />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 46, padding: 70 }}>
        <div style={{ ...chunky(96), transform: `scale(${a})` }}>SPAM IS A CHOICE.</div>
        <div style={{ ...chunky(96, GOLD), transform: `scale(${b})` }}>VARIETY IS THE STRATEGY.</div>
        <div style={{ display: "flex", gap: 6, transform: `scale(${b})` }}>
          {["fox_samurai", "frost_sorceress", "storm_whelp", "valkyrie", "hooded_archer"].map((id) => (
            <Img key={id} src={unit(id)} style={{ width: 190 }} />
          ))}
        </div>
        <Img src={staticFile("cm/logo.png")} style={{ width: 640, transform: `scale(${c})` }} />
        <div style={{ ...body(32, "#9fb0e8"), opacity: c }}>Fantasy concept · not on the roadmap</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

export const CommandMode = () => {
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
      {seq(S_DRAFT, <Draft />)}
      {seq(S_PLACE, <Place />)}
      {seq(S_SPAM, <Spam />)}
      {seq(S_FIX, <FixCap />)}
      {seq(S_FIX, <FixPrice />)}
      {seq(S_FIX, <FixCrown />)}
      {seq(S_FIX, <FixWaves />)}
      {seq(S_OUT, <Outro />)}
    </AbsoluteFill>
  );
};
