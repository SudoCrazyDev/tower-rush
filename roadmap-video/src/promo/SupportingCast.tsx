import React from "react";
import { AbsoluteFill, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadLilita } from "@remotion/google-fonts/LilitaOne";
import { loadFont as loadNunito } from "@remotion/google-fonts/Nunito";
import { CAST, ELEMENT_COLOR, RARITY_COLOR, type CastId, type CastUnit } from "./cast";
import { Emblem } from "./Emblems";
import ART from "./cast-art.json";

/** Units with a card portrait in the game's art (promo-sc.mjs copies them); the rest show their emblem. */
const HAS_ART = new Set<string>(ART.portraits);
/** Share of the card frame the portrait fills (the game's PORTRAIT_FIT). */
const PORTRAIT_FIT = 0.68;

/**
 * Promo graphics and teaser video for v1.1 "Supporting Cast Arrival".
 * See docs/features/v1.1-supporting-cast-arrival/PROMO.md.
 */

const { fontFamily: DISPLAY } = loadLilita();
const { fontFamily: BODY } = loadNunito("normal", { weights: ["800"], subsets: ["latin"] });

const NAVY = "#14183a";
const PANEL = "#1b2257";
const GOLD = "#ffd93b";
const BG = "locations/arena_crystal_cave.webp";

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

function Backdrop({ tint, dim = 0.55, spin = 0 }: { tint?: string; dim?: number; spin?: number }) {
  return (
    <AbsoluteFill style={{ background: NAVY }}>
      <Img src={staticFile(BG)} style={{ width: "100%", height: "100%", objectFit: "cover", filter: "blur(3px)", transform: "scale(1.05)" }} />
      <AbsoluteFill style={{ background: `rgba(12, 14, 44, ${dim})` }} />
      <AbsoluteFill
        style={{
          background: `repeating-conic-gradient(from ${spin}deg at 50% 45%, rgba(255,217,59,0.10) 0deg 9deg, transparent 9deg 22deg)`,
          maskImage: "radial-gradient(circle at 50% 45%, black 0%, transparent 70%)",
        }}
      />
      {tint && <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 42%, ${tint}66 0%, transparent 60%)` }} />}
      <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 50%, transparent 55%, rgba(5,6,24,0.75) 100%)" }} />
    </AbsoluteFill>
  );
}

/** A unit card in the game's frame: emblem art over an element glow, name plate below. */
function CastCard({ unit, w, silhouette = false, name = true }: { unit: CastUnit; w: number; silhouette?: boolean; name?: boolean }) {
  const color = ELEMENT_COLOR[unit.element];
  return (
    <div style={{ width: w, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ position: "relative", width: w, height: w, filter: `drop-shadow(0 ${w * 0.04}px 0 ${NAVY})` }}>
        <Img src={staticFile(`cards/frame_${unit.rarity}.webp`)} style={{ position: "absolute", inset: 0, width: w, height: w }} />
        <div
          style={{
            position: "absolute",
            inset: w * 0.11,
            borderRadius: w * 0.08,
            background: silhouette
              ? "radial-gradient(circle at 50% 45%, rgba(120,150,255,0.35) 0%, rgba(10,12,40,0.6) 75%)"
              : `radial-gradient(circle at 50% 45%, ${color}cc 0%, ${color}33 55%, transparent 80%)`,
          }}
        />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {HAS_ART.has(unit.id) ? (
            <Img
              src={staticFile(`portraits/${unit.id}.webp`)}
              style={{
                width: w * PORTRAIT_FIT,
                height: w * PORTRAIT_FIT,
                borderRadius: w * 0.06,
                // Teasers: a dark shape with a cool rim, like the emblem silhouettes.
                filter: silhouette ? "brightness(0) drop-shadow(0 0 6px rgba(140,170,255,0.9))" : undefined,
              }}
            />
          ) : (
            <Emblem id={unit.id} size={w * 0.7} silhouette={silhouette} />
          )}
        </div>
        {silhouette && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={chunky(w * 0.42, GOLD)}>?</div>
          </div>
        )}
      </div>
      {name && (
        <div
          style={{
            marginTop: -w * 0.05,
            padding: `${w * 0.025}px ${w * 0.06}px`,
            background: silhouette ? NAVY : PANEL,
            border: `${Math.max(3, w * 0.018)}px solid ${silhouette ? "#4a5290" : GOLD}`,
            borderRadius: w * 0.08,
            boxShadow: `0 ${w * 0.02}px 0 ${NAVY}`,
            whiteSpace: "nowrap",
            zIndex: 1,
          }}
        >
          <div style={chunky(w * 0.105)}>{silhouette ? "???" : unit.name}</div>
        </div>
      )}
    </div>
  );
}

function Title({ size, align = "center" }: { size: number; align?: "center" | "left" }) {
  const t = { ...chunky(size), textAlign: align } as React.CSSProperties;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: align === "center" ? "center" : "flex-start" }}>
      <div style={t}>SUPPORTING CAST</div>
      <div style={{ ...t, ...chunky(size * 1.32, GOLD), textAlign: align }}>ARRIVAL</div>
    </div>
  );
}

function Ribbon({ text, size }: { text: string; size: number }) {
  return (
    <div
      style={{
        display: "inline-block",
        padding: `${size * 0.25}px ${size * 0.8}px`,
        background: "#e8344a",
        border: `${size * 0.14}px solid ${NAVY}`,
        borderRadius: size,
        boxShadow: `0 ${size * 0.18}px 0 ${NAVY}`,
      }}
    >
      <div style={chunky(size)}>{text}</div>
    </div>
  );
}

function Button({ text, size }: { text: string; size: number }) {
  return (
    <div
      style={{
        padding: `${size * 0.35}px ${size * 1.2}px`,
        background: "linear-gradient(#ffe36b, #f2a91a)",
        border: `${size * 0.14}px solid ${NAVY}`,
        borderRadius: size * 0.6,
        boxShadow: `0 ${size * 0.22}px 0 ${NAVY}`,
      }}
    >
      <div style={chunky(size)}>{text}</div>
    </div>
  );
}

const Logo = ({ w }: { w: number }) => <Img src={staticFile("icons/logo.webp")} style={{ width: w }} />;

const Tagline = ({ size }: { size: number }) => <div style={{ ...chunky(size, "#cfe0ff"), fontStyle: "italic" }}>Not every hero swings a sword.</div>;

function Grid({ w, gap, cols = 4, silhouette = false, names = true }: { w: number; gap: number; cols?: number; silhouette?: boolean; names?: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, ${w}px)`, gap, justifyContent: "center" }}>
      {CAST.map((u) => (
        <CastCard key={u.id} unit={u} w={w} silhouette={silhouette} name={names} />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- stills

export const KeyArt = () => (
  <AbsoluteFill>
    <Backdrop />
    <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", padding: "0 90px", gap: 70 }}>
      <div style={{ flex: "0 0 780px", display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
        <Logo w={360} />
        <Ribbon text="v1.1 UPDATE" size={40} />
        <Title size={92} />
        <Tagline size={44} />
        <div style={{ ...body(30), textAlign: "center" }}>8 new support units that copy, swap, brew and rally.</div>
      </div>
      <Grid w={220} gap={30} />
    </AbsoluteFill>
  </AbsoluteFill>
);

export const Square = () => (
  <AbsoluteFill>
    <Backdrop />
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 34, padding: 50 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
        <Logo w={210} />
        <Ribbon text="v1.1" size={40} />
      </div>
      <Title size={78} />
      <Grid w={205} gap={26} />
      <Tagline size={42} />
    </AbsoluteFill>
  </AbsoluteFill>
);

export const Story = () => (
  <AbsoluteFill>
    <Backdrop />
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 50, padding: 60 }}>
      <Logo w={400} />
      <Ribbon text="v1.1 UPDATE" size={44} />
      <Title size={100} />
      <Grid w={210} gap={28} />
      <Tagline size={46} />
      <Button text="UPDATE NOW" size={56} />
    </AbsoluteFill>
  </AbsoluteFill>
);

export const TeaserStory = () => (
  <AbsoluteFill>
    <Backdrop dim={0.72} />
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 60, padding: 60 }}>
      <Logo w={360} />
      <div style={chunky(96)}>8 NEW ALLIES</div>
      <div style={chunky(76, GOLD)}>ARE COMING</div>
      <Grid w={210} gap={28} silhouette />
      <div style={{ ...chunky(50, "#cfe0ff") }}>They don't attack.</div>
      <div style={{ ...chunky(62, GOLD), marginTop: -40 }}>They change everything.</div>
      <Ribbon text="v1.1 · SOON" size={44} />
    </AbsoluteFill>
  </AbsoluteFill>
);

/** One character reveal post (1080×1350). */
export const UnitPost = ({ id }: { id: CastId }) => {
  const u = CAST.find((c) => c.id === id)!;
  const color = ELEMENT_COLOR[u.element];
  const chip = (text: string, bg: string) => (
    <div style={{ padding: "8px 26px", background: bg, border: `5px solid ${NAVY}`, borderRadius: 40, boxShadow: `0 6px 0 ${NAVY}` }}>
      <div style={chunky(36)}>{text}</div>
    </div>
  );
  return (
    <AbsoluteFill>
      <Backdrop tint={color} />
      <AbsoluteFill style={{ alignItems: "center", padding: "50px 70px", gap: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <Logo w={170} />
          <div style={chunky(44, GOLD)}>MEET THE CAST</div>
        </div>
        <CastCard unit={u} w={480} name={false} />
        <div style={chunky(96)}>{u.name}</div>
        <div style={{ display: "flex", gap: 16 }}>
          {chip(u.rarity.toUpperCase(), RARITY_COLOR[u.rarity])}
          {chip(u.element.toUpperCase(), color)}
          {chip(u.race.toUpperCase(), "#4a5290")}
        </div>
        <div
          style={{
            marginTop: 8,
            width: "100%",
            background: `${PANEL}ee`,
            border: `6px solid ${GOLD}`,
            borderRadius: 32,
            boxShadow: `0 10px 0 ${NAVY}`,
            padding: "26px 40px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div style={chunky(58, GOLD)}>{u.verb}</div>
          <div style={{ ...body(38), textAlign: "center" }}>{u.ability}</div>
          <div style={{ ...body(32, "#9fb2ff"), textAlign: "center" }}>
            ★1 {u.scale[0]} → ★7 {u.scale[1]} <span style={{ color: "#7f8bc9" }}>({u.scaleLabel})</span>
          </div>
        </div>
        <div style={{ ...body(36, GOLD), textAlign: "center", fontStyle: "italic" }}>💡 {u.tip}</div>
        <div style={{ ...body(26, "#7f8bc9"), marginTop: "auto" }}>v1.1 Supporting Cast Arrival · #SupportingCastArrival</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- teaser video

const HEROES = ["valkyrie", "fox_samurai", "crystal_queen"];
const REVEAL = 36;
export const T = { heroes: 0, mystery: 90, title: 180, reveals: 240, fan: 240 + REVEAL * 8, end: 240 + REVEAL * 8 + 96 };
export const TEASER_LEN = T.end + 96;

function usePop(at: number, damping = 11) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - at, fps, config: { damping, mass: 0.7 } });
}

function Caption({ text, size = 72, color = "#fff", at = 0, y = 260 }: { text: string; size?: number; color?: string; at?: number; y?: number }) {
  const p = usePop(at, 14);
  return (
    <div style={{ position: "absolute", top: y, left: 0, right: 0, display: "flex", justifyContent: "center", transform: `scale(${p})`, opacity: p }}>
      <div style={chunky(size, color)}>{text}</div>
    </div>
  );
}

function HeroScene() {
  return (
    <AbsoluteFill>
      <Caption text="You know the heroes..." at={4} />
      <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 40 }}>
        {HEROES.map((h, i) => {
          const p = usePop(14 + i * 10, 10);
          return (
            <div key={h} style={{ transform: `scale(${p}) translateY(${(1 - p) * 120}px)`, borderRadius: 40, overflow: "hidden", border: `8px solid ${GOLD}`, boxShadow: `0 12px 0 ${NAVY}` }}>
              <Img src={staticFile(`portraits/${h}.webp`)} style={{ width: 280, height: 280, display: "block" }} />
            </div>
          );
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

function MysteryScene() {
  return (
    <AbsoluteFill>
      <Caption text="...but who has their back?" at={4} color={GOLD} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", paddingTop: 120 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 210px)", gap: 28 }}>
          {CAST.map((u, i) => {
            const p = usePop(10 + i * 5, 12);
            return (
              <div key={u.id} style={{ transform: `translateY(${(1 - p) * -900}px)` }}>
                <CastCard unit={u} w={210} silhouette />
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

function TitleScene() {
  const frame = useCurrentFrame();
  const flash = interpolate(frame, [0, 4, 20], [0, 1, 0], { extrapolateRight: "clamp" });
  const p = usePop(4, 9);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ transform: `scale(${interpolate(p, [0, 1], [2.4, 1])})`, opacity: Math.min(1, p * 2) }}>
        <Title size={112} />
      </div>
      <AbsoluteFill style={{ background: "#fff", opacity: flash }} />
    </AbsoluteFill>
  );
}

function RevealScene({ unit }: { unit: CastUnit }) {
  const frame = useCurrentFrame();
  // Flip: the silhouette folds away, the real card unfolds.
  const fold = interpolate(frame, [0, 6], [1, 0], { extrapolateRight: "clamp" });
  const open = usePop(6, 10);
  const verb = usePop(12, 9);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 45%, ${ELEMENT_COLOR[unit.element]}88 0%, transparent 55%)` }} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 40 }}>
        <div style={{ ...chunky(84), opacity: open }}>{unit.name}</div>
        <div style={{ transform: `scaleX(${frame < 6 ? fold : open})` }}>
          <CastCard unit={unit} w={560} silhouette={frame < 6} name={false} />
        </div>
        <div style={{ ...chunky(150, GOLD), transform: `scale(${verb}) rotate(${(1 - verb) * -12}deg)` }}>{unit.verb}!</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

function FanScene() {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 70 }}>
      <Title size={92} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 210px)", gap: 28 }}>
        {CAST.map((u, i) => {
          const p = spring({ frame: frame - i * 3, fps: 30, config: { damping: 12 } });
          return (
            <div key={u.id} style={{ transform: `scale(${p})` }}>
              <CastCard unit={u} w={210} />
            </div>
          );
        })}
      </div>
      <div style={{ opacity: interpolate(frame, [30, 44], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
        <Tagline size={54} />
      </div>
    </AbsoluteFill>
  );
}

function EndScene() {
  const logo = usePop(0, 10);
  const cta = usePop(16, 10);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 60 }}>
      <div style={{ transform: `scale(${logo})` }}>
        <Logo w={720} />
      </div>
      <div style={{ transform: `scale(${cta})`, display: "flex", flexDirection: "column", alignItems: "center", gap: 50 }}>
        <Ribbon text="v1.1 SUPPORTING CAST ARRIVAL" size={44} />
        <Button text="PLAY NOW" size={72} />
      </div>
    </AbsoluteFill>
  );
}

export const Teaser = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Backdrop dim={frame < T.title ? 0.5 : 0.62} spin={frame * 0.6} />
      <Sequence from={T.heroes} durationInFrames={T.mystery - T.heroes}>
        <HeroScene />
      </Sequence>
      <Sequence from={T.mystery} durationInFrames={T.title - T.mystery}>
        <MysteryScene />
      </Sequence>
      <Sequence from={T.title} durationInFrames={T.reveals - T.title}>
        <TitleScene />
      </Sequence>
      {CAST.map((u, i) => (
        <Sequence key={u.id} from={T.reveals + i * REVEAL} durationInFrames={REVEAL}>
          <RevealScene unit={u} />
        </Sequence>
      ))}
      <Sequence from={T.fan} durationInFrames={T.end - T.fan}>
        <FanScene />
      </Sequence>
      <Sequence from={T.end}>
        <EndScene />
      </Sequence>
    </AbsoluteFill>
  );
};
