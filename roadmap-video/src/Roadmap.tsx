import React from "react";
import { AbsoluteFill, Easing, Img, Series, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadLilita } from "@remotion/google-fonts/LilitaOne";
import { loadFont as loadNunito } from "@remotion/google-fonts/Nunito";
import { BUILT, GAPS, STAGES, type Status } from "./data";

const { fontFamily: DISPLAY } = loadLilita();
const { fontFamily: BODY } = loadNunito("normal", { weights: ["800"], subsets: ["latin"] });

const NAVY = "#14183a";
const PANEL = "#1b2257";
const GOLD = "#f2b630";

export const INTRO = 150;
export const BUILT_LEN = 300;
export const STAGE_LEN = 130;
export const GAPS_LEN = 120;
export const OUTRO = 160;
export const TOTAL = INTRO + BUILT_LEN + STAGE_LEN * STAGES.length + GAPS_LEN + OUTRO;

// ---------------------------------------------------------------- helpers

const chunky = (size: number, color = "#fff"): React.CSSProperties => ({
  fontFamily: DISPLAY,
  fontSize: size,
  color,
  WebkitTextStroke: `${Math.round(size / 9)}px ${NAVY}`,
  paintOrder: "stroke fill",
  textShadow: `0 ${Math.round(size / 12)}px 0 ${NAVY}`,
  lineHeight: 1.05,
});

const panel: React.CSSProperties = {
  background: PANEL,
  border: `6px solid ${GOLD}`,
  borderRadius: 32,
  boxShadow: `0 12px 0 ${NAVY}`,
};

function Background({ src, dim = 0.45, zoom = 0.06 }: { src: string; dim?: number; zoom?: number }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const s = 1 + zoom * (frame / durationInFrames);
  return (
    <AbsoluteFill>
      <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${s})` }} />
      <AbsoluteFill style={{ background: `rgba(10, 12, 40, ${dim})` }} />
    </AbsoluteFill>
  );
}

/** Fade a whole scene in and out at its edges. */
function Fade({ children, len }: { children: React.ReactNode; len: number }) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 12, len - 12, len], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
}

/** Pop-in scale driven by a spring starting at `at`. */
function usePop(at: number, damping = 11) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - at, fps, config: { damping, mass: 0.7 } });
}

/** A 16-frame horizontal sprite sheet from the game. */
function Sprite({ src, size, fps = 14 }: { src: string; size: number; fps?: number }) {
  const frame = useCurrentFrame();
  const i = Math.floor((frame * fps) / 30) % 16;
  return (
    <div
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${staticFile(src)})`,
        backgroundSize: `${size * 16}px ${size}px`,
        backgroundPosition: `-${i * size}px 0`,
      }}
    />
  );
}

function Card({ src, size, border = GOLD }: { src: string; size: number; border?: string }) {
  return (
    <Img
      src={staticFile(src)}
      style={{ width: size, height: size, borderRadius: size * 0.18, border: `${Math.max(3, size / 22)}px solid ${border}`, boxShadow: `0 ${size / 16}px 0 ${NAVY}`, objectFit: "cover", background: PANEL }}
    />
  );
}

const Check = ({ size = 44, done = true }: { size?: number; done?: boolean }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: done ? "#59d64a" : "transparent",
      border: `4px solid ${done ? NAVY : "#7c84b8"}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    }}
  >
    {done && (
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24">
        <path d="M4 12.5l5 5L20 6.5" fill="none" stroke={NAVY} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )}
  </div>
);

// ---------------------------------------------------------------- scenes

function Intro() {
  const logo = usePop(8, 9);
  const title = usePop(38);
  const frame = useCurrentFrame();
  const sub = interpolate(frame, [60, 80], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <Fade len={INTRO}>
      <Background src="loading_keyart.webp" dim={0.35} zoom={0.1} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 10 }}>
        <Img src={staticFile("icons/logo.webp")} style={{ width: 720, transform: `scale(${logo}) rotate(${(1 - logo) * -8}deg)` }} />
        <div style={{ ...chunky(150, "#ffd23a"), transform: `scale(${title})`, marginTop: -30 }}>ROADMAP</div>
        <div style={{ ...chunky(46, "#fff4c2"), opacity: sub, transform: `translateY(${(1 - sub) * 20}px)` }}>
          What's built, and where the game goes next
        </div>
      </AbsoluteFill>
    </Fade>
  );
}

function Built() {
  const frame = useCurrentFrame();
  const head = usePop(4);
  const king = usePop(BUILT.length * 22 + 30, 12);
  return (
    <Fade len={BUILT_LEN}>
      <Background src="lobby_landscape.webp" dim={0.55} />
      <AbsoluteFill style={{ padding: "70px 110px", flexDirection: "row", gap: 40 }}>
        <div style={{ flex: 1 }}>
          <div style={{ ...chunky(96, "#ffd23a"), transform: `scale(${head})`, transformOrigin: "left center", marginBottom: 34 }}>Already built</div>
          {BUILT.map((b, i) => {
            const at = 24 + i * 22;
            const p = interpolate(frame, [at, at + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.6)) });
            return (
              <div
                key={b.text}
                style={{
                  ...panel,
                  borderWidth: 4,
                  display: "flex",
                  alignItems: "center",
                  gap: 26,
                  padding: "12px 26px",
                  marginBottom: 16,
                  opacity: Math.min(1, p * 1.5),
                  transform: `translateX(${(1 - p) * -160}px)`,
                  width: 1180,
                }}
              >
                <Card src={b.icon} size={72} border={b.isNew ? GOLD : "#3d8bff"} />
                <div style={{ fontFamily: BODY, fontWeight: 800, fontSize: 36, color: "#fff", flex: 1 }}>{b.text}</div>
                {b.isNew && <div style={{ ...chunky(30, NAVY), WebkitTextStroke: 0, textShadow: "none", background: GOLD, borderRadius: 14, padding: "6px 16px" }}>NEW</div>}
                <Check />
              </div>
            );
          })}
        </div>
        <div style={{ width: 460, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", paddingBottom: 40 }}>
          <div style={{ transform: `scale(${king})`, transformOrigin: "bottom center" }}>
            <Sprite src="sheets/young_king_victory.webp" size={440} fps={16} />
          </div>
        </div>
      </AbsoluteFill>
    </Fade>
  );
}

const STATUS_COLOR: Record<Status, string> = {
  next: "#59d64a",
  "in progress": "#ffd23a",
  planned: "#5fb4ff",
  "big one": "#ff6b8a",
  launch: "#c18bff",
};
const SHORT = ["Housekeeping", "Unused art", "Retention", "Admin", "Multiplayer", "Release"];
const NODES = STAGES.map((_, i) => ({ x: 200 + i * 304, y: i % 2 ? 330 : 250 }));
const START = { x: -120, y: 300 };
const TRAVEL = 34;

/** The roadmap as a trail on the world map; the Young King walks from stop to stop. */
function Trail() {
  const frame = useCurrentFrame();
  const stage = Math.min(STAGES.length - 1, Math.floor(frame / STAGE_LEN));
  const local = frame - stage * STAGE_LEN;
  const from = stage === 0 ? START : NODES[stage - 1];
  const to = NODES[stage];
  const t = interpolate(local, [0, TRAVEL], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
  const walker = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
  const hop = local < TRAVEL ? Math.abs(Math.sin((local / TRAVEL) * Math.PI * 3)) * 26 : 0;

  const pathD = NODES.map((n, i) => {
    if (i === 0) return `M ${n.x} ${n.y}`;
    const p = NODES[i - 1];
    const mx = (p.x + n.x) / 2;
    return `C ${mx} ${p.y}, ${mx} ${n.y}, ${n.x} ${n.y}`;
  }).join(" ");
  // Fraction of the trail behind the walker.
  const progress = (stage + t - 1) / (NODES.length - 1);

  const s = STAGES[stage];
  const cardIn = interpolate(local, [TRAVEL - 6, TRAVEL + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.back(1.4)) });
  const cardOut = stage < STAGES.length - 1 ? interpolate(local, [STAGE_LEN - 14, STAGE_LEN], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1;

  return (
    <AbsoluteFill>
      <Background src="world_map.webp" dim={0.5} zoom={0.04} />
      <div style={{ position: "absolute", left: 80, top: 40, ...chunky(64, "#ffd23a") }}>The road ahead</div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <path d={pathD} fill="none" stroke={NAVY} strokeWidth={26} strokeLinecap="round" opacity={0.7} />
        <path d={pathD} fill="none" stroke="#e8d9b0" strokeWidth={14} strokeLinecap="round" strokeDasharray="2 26" />
        <path d={pathD} fill="none" stroke={GOLD} strokeWidth={14} strokeLinecap="round" pathLength={1} strokeDasharray={`${Math.max(0, progress)} 1`} />
      </svg>
      {NODES.map((n, i) => {
        const reached = i < stage || (i === stage && t >= 1);
        const pop = reached ? spring({ frame: frame - (i * STAGE_LEN + TRAVEL), fps: 30, config: { damping: 8 } }) : 0;
        const size = 118;
        return (
          <div key={i} style={{ position: "absolute", left: n.x - size / 2, top: n.y - size / 2, width: size, textAlign: "center" }}>
            <div
              style={{
                width: size,
                height: size,
                borderRadius: "50%",
                background: reached ? PANEL : "#2a2f55",
                border: `7px solid ${reached ? STATUS_COLOR[STAGES[i].status] : "#5a6090"}`,
                boxShadow: `0 8px 0 ${NAVY}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transform: `scale(${1 + pop * 0.12 - (reached ? 0.12 : 0)})`,
                filter: reached ? "none" : "grayscale(0.9) brightness(0.7)",
                overflow: "hidden",
              }}
            >
              <Img src={staticFile(STAGES[i].icon)} style={{ width: size * 0.78, height: size * 0.78, objectFit: "contain" }} />
            </div>
            <div style={{ ...chunky(30, reached ? "#fff" : "#9aa0c3"), marginTop: 10, whiteSpace: "nowrap", marginLeft: -60, marginRight: -60 }}>
              {i + 1}. {SHORT[i]}
            </div>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: walker.x - 80, top: walker.y - 205 - hop }}>
        <Sprite src="sheets/young_king_idle.webp" size={160} />
      </div>

      <div
        style={{
          position: "absolute",
          left: 260,
          right: 260,
          top: 520,
          ...panel,
          padding: "30px 44px",
          display: "flex",
          gap: 40,
          opacity: cardIn * cardOut,
          transform: `translateY(${(1 - cardIn) * 120}px) scale(${0.9 + 0.1 * cardIn})`,
        }}
      >
        <Card src={s.icon} size={210} border={STATUS_COLOR[s.status]} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 18 }}>
            <div style={{ ...chunky(60) }}>
              {stage + 1}. {s.title}
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ fontFamily: DISPLAY, fontSize: 30, color: NAVY, background: STATUS_COLOR[s.status], borderRadius: 16, padding: "6px 18px", textTransform: "uppercase" }}>
              {s.status}
            </div>
            <div style={{ fontFamily: DISPLAY, fontSize: 30, color: "#fff", border: "3px solid #7c84b8", borderRadius: 16, padding: "3px 16px" }}>{s.effort}</div>
          </div>
          {s.items.map((it, j) => {
            const at = TRAVEL + 14 + j * 9;
            const p = interpolate(local, [at, at + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <div key={it.text} style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 12, opacity: p, transform: `translateX(${(1 - p) * 40}px)` }}>
                <Check size={38} done={!!it.done} />
                <div style={{ fontFamily: BODY, fontWeight: 800, fontSize: 36, color: it.done ? "#9be38f" : "#fff", textDecoration: it.done ? "line-through" : "none" }}>
                  {it.text}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
}

function Gaps() {
  const frame = useCurrentFrame();
  const head = usePop(4);
  return (
    <Fade len={GAPS_LEN}>
      <Background src="arena_meadow.webp" dim={0.7} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ ...panel, padding: "40px 70px", width: 1100, transform: `scale(${0.85 + 0.15 * head})` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 24 }}>
            <Img src={staticFile("icons/boss_warning.webp")} style={{ width: 96 }} />
            <div style={chunky(64, "#ffb0b0")}>Known gaps</div>
          </div>
          {GAPS.map((g, i) => {
            const p = interpolate(frame, [18 + i * 10, 30 + i * 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <div key={g} style={{ fontFamily: BODY, fontWeight: 800, fontSize: 40, color: "#fff", margin: "10px 0", opacity: p, transform: `translateX(${(1 - p) * 40}px)` }}>
                <span style={{ color: "#ff8a8a", marginRight: 16 }}>●</span>
                {g}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </Fade>
  );
}

const HEROES = ["young_king", "elf_archmage", "dark_knight", "sea_witch", "panda_brewmaster", "griffin_knight", "gnome_mech", "orc_warchief"];

function Outro() {
  const frame = useCurrentFrame();
  const logo = usePop(6, 10);
  const line = interpolate(frame, [30, 48], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <Fade len={OUTRO}>
      <Background src="loading_keyart.webp" dim={0.55} zoom={0.08} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 18 }}>
        <Img src={staticFile("icons/logo.webp")} style={{ width: 520, transform: `scale(${logo})` }} />
        <div style={{ ...chunky(92, "#ffd23a"), opacity: line }}>Next up</div>
        <div style={{ ...chunky(48, "#fff4c2"), opacity: line, transform: `translateY(${(1 - line) * 20}px)` }}>
          Housekeeping, then HD sprites and daily rewards
        </div>
        <div style={{ display: "flex", gap: 22, marginTop: 34 }}>
          {HEROES.map((h, i) => {
            const p = spring({ frame: frame - 56 - i * 5, fps: 30, config: { damping: 9 } });
            const bob = Math.sin((frame + i * 9) / 9) * 6;
            return (
              <div key={h} style={{ transform: `translateY(${(1 - p) * 220 + bob}px)`, opacity: Math.min(1, p * 2) }}>
                <Card src={`heroes/${h}.webp`} size={150} />
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </Fade>
  );
}

export const Roadmap: React.FC = () => (
  <AbsoluteFill style={{ background: NAVY }}>
    <Series>
      <Series.Sequence durationInFrames={INTRO}>
        <Intro />
      </Series.Sequence>
      <Series.Sequence durationInFrames={BUILT_LEN}>
        <Built />
      </Series.Sequence>
      <Series.Sequence durationInFrames={STAGE_LEN * STAGES.length}>
        <Fade len={STAGE_LEN * STAGES.length}>
          <Trail />
        </Fade>
      </Series.Sequence>
      <Series.Sequence durationInFrames={GAPS_LEN}>
        <Gaps />
      </Series.Sequence>
      <Series.Sequence durationInFrames={OUTRO}>
        <Outro />
      </Series.Sequence>
    </Series>
  </AbsoluteFill>
);
