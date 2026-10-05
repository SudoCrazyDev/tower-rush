import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { loadFont as loadLilita } from "@remotion/google-fonts/LilitaOne";
import { loadFont as loadNunito } from "@remotion/google-fonts/Nunito";
import {
  BOSSES,
  CANDY_FOLK,
  CHAOS_BORN,
  EVENT_DECK,
  HAS_ART,
  HAS_EVENT_FRAME,
  HAS_PALACE,
  KNIGHT,
  MERC,
  MUSE,
  MUSE_SCALE,
  PENTAGONAL,
  PINK,
  PINK_LIGHT,
  ROGUE,
  STORIES,
  VIOLET,
  VIOLET_DARK,
  type Foe,
  type StoryDef,
  type StoryUnit,
} from "./storyCast";
import { StoryGlyph } from "./StoryGlyphs";

/**
 * Promo graphics for v1.2 "Stories": key art, social posts, a header banner and
 * infographics. See docs/features/v1.2-stories/PROMO.md. Units, monsters and bosses with no
 * art yet are drawn as placeholder glyphs (see storyCast.ts).
 */

const { fontFamily: DISPLAY } = loadLilita();
const { fontFamily: BODY } = loadNunito("normal", { weights: ["800"], subsets: ["latin"] });

const NAVY = "#14183a";
const PANEL = "#1b2257";
const GOLD = "#ffd93b";
const BG = HAS_PALACE ? "st/arena_candy_palace.webp" : "st/arena_candy_land.webp";

// ---------------------------------------------------------------- pieces

const chunky = (size: number, color = "#fff"): React.CSSProperties => ({
  fontFamily: DISPLAY,
  fontSize: size,
  color,
  WebkitTextStroke: `${Math.round(size / 8)}px ${NAVY}`,
  paintOrder: "stroke fill",
  textShadow: `0 ${Math.round(size / 11)}px 0 ${NAVY}`,
  lineHeight: 1.02,
  textAlign: "center",
});

const body = (size: number, color = "#e8ecff"): React.CSSProperties => ({ fontFamily: BODY, fontWeight: 800, fontSize: size, color, lineHeight: 1.25 });

/** Violet chaos cracks across the sky. */
function Cracks({ opacity = 1 }: { opacity?: number }) {
  const d = "M0 120 L180 160 L260 90 L420 180 L520 120 M260 90 L300 10 M420 180 L470 300 M1000 60 L860 150 L800 260 L660 300 M860 150 L900 0 M800 260 L840 380";
  return (
    <AbsoluteFill style={{ opacity }}>
      <svg viewBox="0 0 1000 600" preserveAspectRatio="none" style={{ width: "100%", height: "60%" }}>
        <path d={d} fill="none" stroke={VIOLET} strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" opacity={0.35} />
        <path d={d} fill="none" stroke="#e9d2ff" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </AbsoluteFill>
  );
}

/** Candy Land, with a violet corruption wash (0 = sweet, 1 = fully corrupted). */
function Backdrop({ corrupt = 0.5, dim = 0.45, cracks = true }: { corrupt?: number; dim?: number; cracks?: boolean }) {
  return (
    <AbsoluteFill style={{ background: NAVY }}>
      <Img src={staticFile(BG)} style={{ width: "100%", height: "100%", objectFit: "cover", filter: `blur(3px) saturate(${1 - corrupt * 0.4})`, transform: "scale(1.06)" }} />
      <AbsoluteFill style={{ background: `rgba(12, 10, 44, ${dim})` }} />
      <AbsoluteFill style={{ background: `linear-gradient(180deg, ${VIOLET_DARK}${Math.round(corrupt * 230).toString(16).padStart(2, "0")} 0%, transparent 55%, ${VIOLET_DARK}${Math.round(corrupt * 160).toString(16).padStart(2, "0")} 100%)` }} />
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 42%, ${PINK}44 0%, transparent 55%)` }} />
      {cracks && <Cracks opacity={corrupt} />}
      <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 50%, transparent 55%, rgba(5,6,24,0.78) 100%)" }} />
    </AbsoluteFill>
  );
}

const SIDE_COLOR = { barkeeper: PINK, knight: KNIGHT, mercenary: MERC };
const SIDE_LABEL = { barkeeper: "BARKEEPER", knight: "KNIGHT", mercenary: "MERCENARY" };

/** Small "art to come" tag on placeholder art, so a draft never gets posted by mistake. */
const Tbd = ({ w }: { w: number }) => (
  <div
    style={{
      position: "absolute",
      right: w * 0.1,
      bottom: w * 0.1,
      padding: `${w * 0.01}px ${w * 0.035}px`,
      background: "rgba(10,12,40,0.75)",
      border: `${Math.max(2, w * 0.008)}px dashed #9fb2ff`,
      borderRadius: w * 0.04,
      ...body(Math.max(12, w * 0.055), "#cfe0ff"),
    }}
  >
    ART TBD
  </div>
);

/** A unit card: the real portrait when it exists, otherwise a glyph. */
function UnitCard({ u, w, name = true }: { u: StoryUnit; w: number; name?: boolean }) {
  const color = SIDE_COLOR[u.side];
  const art = HAS_ART.has(u.id);
  const imageFrame = u.rarity === "epic" || (u.rarity === "event" && HAS_EVENT_FRAME);
  const frame =
    u.rarity === "epic" ? (
      <Img src={staticFile("st/frame_epic.webp")} style={{ position: "absolute", inset: 0, width: w, height: w }} />
    ) : u.rarity === "event" && HAS_EVENT_FRAME ? (
      <Img src={staticFile("st/frame_event.webp")} style={{ position: "absolute", inset: 0, width: w, height: w }} />
    ) : (
      // Drawn frame: pink with hearts for Event, the side colour for story-only units.
      <div
        style={{
          position: "absolute",
          inset: w * 0.03,
          borderRadius: w * 0.13,
          border: `${w * 0.075}px solid ${u.rarity === "event" ? PINK : color}`,
          boxShadow: `inset 0 0 0 ${w * 0.018}px ${NAVY}, 0 0 0 ${w * 0.018}px ${NAVY}, inset 0 0 0 ${w * 0.035}px ${u.rarity === "event" ? PINK_LIGHT : "#ffffff55"}`,
        }}
      >
        {u.rarity === "event" &&
          [
            [-0.06, -0.06],
            [0.78, -0.06],
            [-0.06, 0.78],
            [0.78, 0.78],
          ].map(([x, y], i) => (
            <div key={i} style={{ position: "absolute", left: x * w, top: y * w, fontSize: w * 0.12, lineHeight: 1, color: "#fff", WebkitTextStroke: `${w * 0.008}px ${NAVY}` }}>
              ♥
            </div>
          ))}
      </div>
    );
  return (
    <div style={{ width: w, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ position: "relative", width: w, height: w, filter: `drop-shadow(0 ${w * 0.04}px 0 ${NAVY})` }}>
        {imageFrame && frame}
        <div style={{ position: "absolute", inset: w * 0.11, borderRadius: w * 0.08, background: `radial-gradient(circle at 50% 45%, ${color}cc 0%, ${color}33 55%, ${NAVY}aa 85%)` }} />
        {art ? (
          <Img src={staticFile(`st/portraits/${u.id}.webp`)} style={{ position: "absolute", inset: w * 0.11, width: w * 0.78, height: w * 0.78, borderRadius: w * 0.08, objectFit: "cover" }} />
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <StoryGlyph glyph={u.glyph} size={w * 0.62} />
          </div>
        )}
        {!imageFrame && frame}
        {!art && <Tbd w={w} />}
      </div>
      {name && (
        <div
          style={{
            marginTop: -w * 0.05,
            padding: `${w * 0.025}px ${w * 0.06}px`,
            background: PANEL,
            border: `${Math.max(3, w * 0.018)}px solid ${u.rarity === "event" ? PINK : GOLD}`,
            borderRadius: w * 0.08,
            boxShadow: `0 ${w * 0.02}px 0 ${NAVY}`,
            whiteSpace: "nowrap",
            zIndex: 1,
          }}
        >
          <div style={chunky(w * 0.1)}>{u.name}</div>
        </div>
      )}
    </div>
  );
}

/** A round token for a monster or boss, with a violet corruption glow. */
function FoeToken({ f, w, label = true }: { f: Foe; w: number; label?: boolean }) {
  const art = HAS_ART.has(f.id);
  return (
    <div style={{ width: w, display: "flex", flexDirection: "column", alignItems: "center", gap: w * 0.05 }}>
      <div
        style={{
          position: "relative",
          width: w,
          height: w,
          borderRadius: "50%",
          background: `radial-gradient(circle at 50% 45%, ${f.color}55 0%, ${VIOLET_DARK} 75%)`,
          border: `${w * 0.05}px solid ${f.boss ? GOLD : VIOLET}`,
          boxShadow: `0 0 ${w * 0.18}px ${VIOLET}, 0 ${w * 0.04}px 0 ${NAVY}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        {art ? <Img src={staticFile(`st/portraits/${f.id}.webp`)} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <StoryGlyph glyph={f.glyph} size={w * 0.72} />}
      </div>
      {label && <div style={{ ...chunky(w * 0.15), width: w * 1.5 }}>{f.name}</div>}
      {label && <div style={{ ...body(w * 0.12, "#d9c2ff"), textAlign: "center", marginTop: -w * 0.04 }}>{f.trait}</div>}
    </div>
  );
}

function Title({ size, brand = false }: { size: number; brand?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      {brand && <div style={chunky(size * 0.42, PINK_LIGHT)}>TOWER RUSH</div>}
      <div style={{ ...chunky(size), letterSpacing: size * 0.02 }}>STORIES</div>
    </div>
  );
}

function Ribbon({ text, size, bg = VIOLET }: { text: string; size: number; bg?: string }) {
  return (
    <div style={{ display: "inline-block", padding: `${size * 0.25}px ${size * 0.8}px`, background: bg, border: `${size * 0.14}px solid ${NAVY}`, borderRadius: size, boxShadow: `0 ${size * 0.18}px 0 ${NAVY}` }}>
      <div style={chunky(size)}>{text}</div>
    </div>
  );
}

function Button({ text, size }: { text: string; size: number }) {
  return (
    <div style={{ padding: `${size * 0.35}px ${size * 1.2}px`, background: "linear-gradient(#ffe36b, #f2a91a)", border: `${size * 0.14}px solid ${NAVY}`, borderRadius: size * 0.6, boxShadow: `0 ${size * 0.22}px 0 ${NAVY}` }}>
      <div style={chunky(size)}>{text}</div>
    </div>
  );
}

const Logo = ({ w }: { w: number }) => <Img src={staticFile("st/logo.webp")} style={{ width: w }} />;

const Tagline = ({ size }: { size: number }) => <div style={{ ...chunky(size, PINK_LIGHT), fontStyle: "italic" }}>The Candy Kingdom is falling to chaos.</div>;

function Panel({ children, border = GOLD, pad = 30, style }: { children: React.ReactNode; border?: string; pad?: number; style?: React.CSSProperties }) {
  return (
    <div style={{ background: `${PANEL}ee`, border: `6px solid ${border}`, borderRadius: 30, boxShadow: `0 10px 0 ${NAVY}`, padding: pad, ...style }}>
      {children}
    </div>
  );
}

/** A story's cover: number, title, its key unit and the reward. Story 3 is locked. */
function StoryCover({ s, w }: { s: StoryDef; w: number }) {
  const locked = s.n === 3;
  const unit = s.n === 1 ? MUSE : s.n === 2 ? PENTAGONAL : null;
  return (
    <div
      style={{
        width: w,
        height: w * 1.38,
        borderRadius: w * 0.09,
        border: `${w * 0.03}px solid ${locked ? "#4a5290" : s.color}`,
        background: locked ? `linear-gradient(${NAVY}, #0b0d26)` : `linear-gradient(160deg, ${s.color}55 0%, ${PANEL} 55%, ${NAVY} 100%)`,
        boxShadow: `0 ${w * 0.035}px 0 ${NAVY}, 0 0 0 ${w * 0.012}px ${NAVY}`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: w * 0.06,
        gap: w * 0.03,
      }}
    >
      <div style={chunky(w * 0.09, locked ? "#7f8bc9" : GOLD)}>STORY {s.n}</div>
      <div style={{ ...chunky(w * 0.13, locked ? "#7f8bc9" : "#fff"), minHeight: w * 0.28, display: "flex", alignItems: "center" }}>{s.title}</div>
      <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
        {locked ? <Img src={staticFile("st/padlock.webp")} style={{ width: w * 0.42 }} /> : <UnitCard u={unit!} w={w * 0.56} name={false} />}
      </div>
      <div style={{ ...body(w * 0.065, locked ? "#7f8bc9" : PINK_LIGHT), textAlign: "center" }}>{locked ? "Coming soon" : `Reward: ${s.reward}`}</div>
    </div>
  );
}

const Covers = ({ w, gap }: { w: number; gap: number }) => (
  <div style={{ display: "flex", gap, alignItems: "flex-end" }}>
    {STORIES.map((s) => (
      <StoryCover key={s.n} s={s} w={w} />
    ))}
  </div>
);

const Footer = ({ size = 26 }: { size?: number }) => <div style={{ ...body(size, "#9f8bd9") }}>v1.2 Stories · #TowerRushStories</div>;

// ---------------------------------------------------------------- posts and banners

export const StKeyArt = () => (
  <AbsoluteFill>
    <Backdrop corrupt={0.6} />
    <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", padding: "0 90px", gap: 60 }}>
      <div style={{ flex: "0 0 720px", display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
        <Logo w={340} />
        <Ribbon text="v1.2 UPDATE" size={40} />
        <Title size={150} />
        <Tagline size={44} />
        <div style={{ ...body(30), textAlign: "center" }}>Story mode is here. Two connected stories, three new cards, and new candy monsters and bosses.</div>
      </div>
      <Covers w={300} gap={30} />
    </AbsoluteFill>
  </AbsoluteFill>
);

export const StSquare = () => (
  <AbsoluteFill>
    <Backdrop corrupt={0.6} />
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 34, padding: 50 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
        <Logo w={210} />
        <Ribbon text="v1.2" size={40} />
      </div>
      <Title size={120} />
      <Covers w={290} gap={24} />
      <Tagline size={40} />
    </AbsoluteFill>
  </AbsoluteFill>
);

export const StStory = () => (
  <AbsoluteFill>
    <Backdrop corrupt={0.6} />
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 46, padding: 60 }}>
      <Logo w={400} />
      <Ribbon text="v1.2 UPDATE" size={44} />
      <Title size={170} />
      <Tagline size={44} />
      <Covers w={300} gap={22} />
      <Button text="PLAY NOW" size={60} />
    </AbsoluteFill>
  </AbsoluteFill>
);

export const StTeaserStory = () => (
  <AbsoluteFill>
    <Backdrop corrupt={1} dim={0.35} />
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 50, padding: 70 }}>
      <Logo w={360} />
      <div style={{ height: 120 }} />
      <div style={chunky(84, PINK_LIGHT)}>Something's wrong</div>
      <div style={chunky(110)}>in Candy Land...</div>
      <div style={{ display: "flex", gap: 50, marginTop: 30 }}>
        {[CANDY_FOLK[0], CANDY_FOLK[1], CANDY_FOLK[2]].map((f) => (
          <FoeToken key={f.id} f={f} w={240} label={false} />
        ))}
      </div>
      <div style={{ height: 80 }} />
      <Ribbon text="v1.2 STORIES · SOON" size={46} />
    </AbsoluteFill>
  </AbsoluteFill>
);

/** X (Twitter) / Facebook header banner, 1500×500. */
export const StBanner = () => (
  <AbsoluteFill>
    <Backdrop corrupt={0.7} dim={0.5} />
    <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 60, padding: "0 60px" }}>
      <UnitCard u={MUSE} w={240} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <Logo w={220} />
        <Title size={110} />
        <Tagline size={30} />
        <Ribbon text="v1.2 · OUT NOW" size={28} />
      </div>
      <div style={{ display: "flex", gap: 20 }}>
        <UnitCard u={PENTAGONAL} w={200} />
        <UnitCard u={ROGUE} w={200} />
      </div>
    </AbsoluteFill>
  </AbsoluteFill>
);

// ---------------------------------------------------------------- infographics (1080×1350)

/** The story path: 3 stories, 3 chapters each, waves, bosses and rewards. */
export const StInfoPath = () => (
  <AbsoluteFill>
    <Backdrop corrupt={0.5} dim={0.6} cracks={false} />
    <AbsoluteFill style={{ alignItems: "center", padding: "48px 56px", gap: 22 }}>
      <Title size={96} brand />
      <div style={{ ...body(32, PINK_LIGHT), textAlign: "center" }}>Three canon stories, played in order.</div>
      {STORIES.map((s) => {
        const locked = s.n === 3;
        return (
          <Panel key={s.n} border={locked ? "#4a5290" : s.color} pad={22} style={{ width: "100%" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <div style={{ ...chunky(48, locked ? "#7f8bc9" : "#fff"), textAlign: "left" }}>
                {s.n}. {s.title}
              </div>
              <div style={body(26, locked ? "#7f8bc9" : GOLD)}>{locked ? "🔒 Coming soon" : s.deck}</div>
            </div>
            {!locked && (
              <>
                <div style={{ display: "flex", gap: 14, marginTop: 16 }}>
                  {s.chapters.map((c, i) => (
                    <div key={c.title} style={{ flex: 1, background: NAVY, borderRadius: 18, border: `4px solid ${s.color}88`, padding: "12px 14px" }}>
                      <div style={body(20, "#9fb2ff")}>CHAPTER {i + 1} · {c.waves} WAVES</div>
                      <div style={{ ...body(25), marginTop: 4 }}>{c.title}</div>
                      <div style={{ ...body(21, "#d9c2ff"), marginTop: 6 }}>👑 {c.boss}</div>
                    </div>
                  ))}
                </div>
                <div style={{ ...body(27, PINK_LIGHT), marginTop: 14 }}>🎁 Reward: {s.reward}</div>
              </>
            )}
          </Panel>
        );
      })}
      <div style={{ ...body(26, "#cfe0ff"), textAlign: "center" }}>Finish a story to unlock the next. Win chapters for up to 3 stars.</div>
      <Footer />
    </AbsoluteFill>
  </AbsoluteFill>
);

/** Muse reveal with her 3×3 Last Call area on the 5×3 board. */
export const StInfoMuse = () => {
  const tile = 96;
  return (
    <AbsoluteFill>
      <Backdrop corrupt={0.2} dim={0.55} cracks={false} />
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 30%, ${PINK}55 0%, transparent 55%)` }} />
      <AbsoluteFill style={{ alignItems: "center", padding: "46px 60px", gap: 18 }}>
        <div style={chunky(44, PINK_LIGHT)}>NEW EVENT CARD</div>
        <UnitCard u={MUSE} w={360} name={false} />
        <div style={chunky(88)}>Princess Muse</div>
        <div style={{ display: "flex", gap: 14 }}>
          {[
            ["EVENT", PINK],
            ["BARKEEPER", "#c2417f"],
            ["HUMAN", "#4a5290"],
          ].map(([t, c]) => (
            <div key={t} style={{ padding: "6px 22px", background: c, border: `5px solid ${NAVY}`, borderRadius: 40, boxShadow: `0 6px 0 ${NAVY}` }}>
              <div style={chunky(32)}>{t}</div>
            </div>
          ))}
        </div>
        <Panel border={PINK} pad={22} style={{ width: "100%", display: "flex", gap: 30, alignItems: "center" }}>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(5, ${tile}px)`, gridTemplateRows: `repeat(3, ${tile * 0.8}px)`, gap: 6 }}>
            {Array.from({ length: 15 }, (_, i) => {
              const col = i % 5;
              const inArea = col >= 1 && col <= 3;
              const isMuse = i === 7;
              return (
                <div
                  key={i}
                  style={{
                    borderRadius: 14,
                    background: isMuse ? PINK : inArea ? `${PINK}55` : "#2a3170",
                    border: `4px solid ${inArea ? PINK_LIGHT : "#3d4590"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    ...chunky(isMuse ? 46 : 34, isMuse ? "#fff" : PINK_LIGHT),
                  }}
                >
                  {isMuse ? "M" : inArea ? "♥" : ""}
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={chunky(40, PINK_LIGHT)}>LAST CALL</div>
            <div style={body(24)}>Never attacks. Every ally in the 3×3 around her gets:</div>
            <div style={body(28, GOLD)}>{MUSE_SCALE.speed[0]} to {MUSE_SCALE.speed[1]} attack speed</div>
            <div style={body(28, GOLD)}>{MUSE_SCALE.damage[0]} to {MUSE_SCALE.damage[1]} damage</div>
            <div style={body(20, "#9fb2ff")}>★1 → ★7, plus card level</div>
          </div>
        </Panel>
        <div style={{ ...body(30, PINK_LIGHT), textAlign: "center", fontStyle: "italic" }}>"A round on the house, and the whole bar fights harder."</div>
        <div style={{ ...body(26, "#cfe0ff") }}>Earn her in Story 1: Saving the Muse</div>
        <Footer />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Story 2's Event deck: Knights vs Mercenaries, and the status effects. */
export const StInfoDeck = () => {
  const row = (u: StoryUnit) => (
    <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 14, background: NAVY, borderRadius: 18, padding: "8px 12px", border: `3px solid ${SIDE_COLOR[u.side]}66` }}>
      <UnitCard u={u} w={112} name={false} />
      <div style={{ flex: 1 }}>
        <div style={{ ...body(25), color: "#fff" }}>
          {u.name} {u.rarity === "epic" && <span style={{ color: GOLD }}>★</span>}
        </div>
        <div style={body(19, "#9fb2ff")}>{u.stats}</div>
        <div style={body(20, "#e8ecff")}>{u.effect}</div>
      </div>
    </div>
  );
  const knights = EVENT_DECK.filter((u) => u.side === "knight");
  const mercs = EVENT_DECK.filter((u) => u.side === "mercenary");
  return (
    <AbsoluteFill>
      <Backdrop corrupt={0.9} dim={0.65} cracks={false} />
      <AbsoluteFill style={{ alignItems: "center", padding: "40px 40px", gap: 14 }}>
        <div style={chunky(36, PINK_LIGHT)}>STORY 2 · CHAORRUPTION</div>
        <div style={chunky(70)}>THE EVENT DECK</div>
        <div style={{ ...body(26, "#cfe0ff"), textAlign: "center" }}>Your deck stays home. Pick 5 of 9. Everyone plays at the same level.</div>
        <div style={{ display: "flex", gap: 18, width: "100%" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={chunky(38, KNIGHT)}>KNIGHTS</div>
            <div style={{ ...body(19, "#cfe0ff"), textAlign: "center" }}>Fight for each other</div>
            {knights.map(row)}
            <Panel border={GOLD} pad={14} style={{ marginTop: 6 }}>
              <div style={chunky(26, GOLD)}>PLACEMENT IS THE PUZZLE</div>
              <div style={{ ...body(20), marginTop: 6 }}>Keep Mercenaries away from your best unit, or put an Aegis Knight next to them.</div>
            </Panel>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={chunky(38, MERC)}>MERCENARIES</div>
            <div style={{ ...body(19, "#cfe0ff"), textAlign: "center" }}>Fight for themselves</div>
            {mercs.map(row)}
            <Panel border={VIOLET} pad={14} style={{ marginTop: 6 }}>
              <div style={chunky(26, "#d9c2ff")}>NEW: STATUS EFFECTS</div>
              {[
                ["Rally", "+100% attack speed", GOLD],
                ["Irritation", "attacks miss", "#ff8a8a"],
                ["Fatigue", "attacks slower", "#b8c0e0"],
                ["Shellshock", "stunned briefly", "#ffd0a0"],
              ].map(([n, t, c]) => (
                <div key={n} style={{ ...body(21), marginTop: 4 }}>
                  <span style={{ color: c }}>{n}</span>: {t}
                </div>
              ))}
            </Panel>
          </div>
        </div>
        <div style={{ marginTop: "auto" }}>
          <Footer />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** A 3×3 patch of the board: the unit in the middle and the 4 tiles its effect reaches. */
function Adjacent({ u, color, mark, tile = 78 }: { u: StoryUnit; color: string; mark: string; tile?: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(3, ${tile}px)`, gap: 6 }}>
      {Array.from({ length: 9 }, (_, i) => {
        const centre = i === 4;
        const adj = i === 1 || i === 3 || i === 5 || i === 7;
        return (
          <div
            key={i}
            style={{
              height: tile,
              borderRadius: 12,
              background: centre ? NAVY : adj ? `${color}66` : "#2a3170",
              border: `4px solid ${adj ? color : "#3d4590"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              ...chunky(tile * 0.36, "#fff"),
            }}
          >
            {centre ? <StoryGlyph glyph={u.glyph} size={tile * 0.8} /> : adj ? mark : ""}
          </div>
        );
      })}
    </div>
  );
}

/** The two Epic reward knights. */
export const StInfoKnights = () => {
  const card = (u: StoryUnit, tag: string, tip: string) => (
    <Panel border={SIDE_COLOR[u.side]} pad={24} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <UnitCard u={u} w={300} name={false} />
      <div style={chunky(52)}>{u.name}</div>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ padding: "4px 16px", background: "#a24cff", border: `4px solid ${NAVY}`, borderRadius: 30 }}>
          <div style={chunky(24)}>EPIC</div>
        </div>
        <div style={{ padding: "4px 16px", background: SIDE_COLOR[u.side], border: `4px solid ${NAVY}`, borderRadius: 30 }}>
          <div style={chunky(24)}>{SIDE_LABEL[u.side]}</div>
        </div>
      </div>
      <div style={body(24, "#9fb2ff")}>{u.stats}</div>
      <div style={chunky(44, GOLD)}>{tag}</div>
      <div style={{ ...body(25), textAlign: "center" }}>{u.effect}</div>
      <div style={{ marginTop: 10 }}>
        <Adjacent u={u} color={u.side === "knight" ? GOLD : "#ff6a7a"} mark={u.side === "knight" ? "x2" : "✗"} />
      </div>
      <div style={{ ...body(22, PINK_LIGHT), textAlign: "center", fontStyle: "italic", marginTop: "auto" }}>💡 {tip}</div>
    </Panel>
  );
  return (
    <AbsoluteFill>
      <Backdrop corrupt={0.8} dim={0.6} cracks={false} />
      <AbsoluteFill style={{ alignItems: "center", padding: "50px 46px", gap: 22 }}>
        <div style={chunky(36, PINK_LIGHT)}>STORY 2 REWARD</div>
        <div style={chunky(76)}>TWO NEW KNIGHTS</div>
        <div style={{ display: "flex", gap: 24, width: "100%", flex: 1 }}>
          {card(PENTAGONAL, "RALLY", "Surround it with fast attackers.")}
          {card(ROGUE, "IRRITATION", "Keep it on an edge, away from your carry.")}
        </div>
        <div style={{ ...body(26, "#cfe0ff"), textAlign: "center" }}>Fight beside them in Chaorruption, then keep them. Both drop from chests afterwards.</div>
        <Footer />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** The bestiary: candy folk, chaos-born and bosses. */
export const StInfoBestiary = () => (
  <AbsoluteFill>
    <Backdrop corrupt={1} dim={0.65} cracks={false} />
    <AbsoluteFill style={{ alignItems: "center", padding: "40px 40px", gap: 14 }}>
      <div style={chunky(36, PINK_LIGHT)}>v1.2 STORIES</div>
      <div style={chunky(70)}>THE CORRUPTED</div>
      <div style={chunky(30, "#d9c2ff")}>CANDY FOLK</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 170px)", columnGap: 70, rowGap: 14 }}>
        {CANDY_FOLK.map((f) => (
          <FoeToken key={f.id} f={f} w={170} />
        ))}
      </div>
      <div style={{ display: "flex", gap: 40, width: "100%", justifyContent: "center", marginTop: 4 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <div style={chunky(30, "#d9c2ff")}>CHAOS-BORN</div>
          <div style={{ display: "flex", gap: 60 }}>
            {CHAOS_BORN.map((f) => (
              <FoeToken key={f.id} f={f} w={150} />
            ))}
          </div>
        </div>
      </div>
      <div style={chunky(30, GOLD)}>BOSSES</div>
      <div style={{ display: "flex", gap: 46 }}>
        {BOSSES.map((f) => (
          <FoeToken key={f.id} f={f} w={150} />
        ))}
      </div>
      <div style={{ marginTop: "auto" }}>
        <Footer />
      </div>
    </AbsoluteFill>
  </AbsoluteFill>
);
