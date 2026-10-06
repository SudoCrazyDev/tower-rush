import React from "react";
import { AbsoluteFill, Easing, Img, Series, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadLilita } from "@remotion/google-fonts/LilitaOne";
import { loadFont as loadNunito } from "@remotion/google-fonts/Nunito";
import { CAST_V11, COVERS, RELEASES, STORY_HEROES, type Release } from "./release-data";

const { fontFamily: DISPLAY } = loadLilita();
const { fontFamily: BODY } = loadNunito("normal", { weights: ["800"], subsets: ["latin"] });

const NAVY = "#14183a";
const PANEL = "#1b2257";
const GOLD = "#f2b630";
const TEAL = "#4fd1c5";
const PINK = "#ff8fd8";

export const R_INTRO = 120;
export const R_OVERVIEW = 200;
export const R_SCENE = 170;
export const R_OUTRO = 140;
export const R_TOTAL = R_INTRO + R_OVERVIEW + R_SCENE * RELEASES.length + R_OUTRO;

const art = (p: string) => staticFile(`rl/${p}`);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const kindColor = (r: Release) => (r.kind === "qol" ? TEAL : r.kind === "next" ? "#9aa0c8" : GOLD);

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

const body = (size: number, color = "#fff4c2"): React.CSSProperties => ({ fontFamily: BODY, fontWeight: 800, fontSize: size, color, lineHeight: 1.15 });

function Background({ src, dim = 0.5, zoom = 0.08 }: { src: string; dim?: number; zoom?: number }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <AbsoluteFill>
      <Img src={art(src)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${1 + zoom * (frame / durationInFrames)})` }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, rgba(10,12,40,${dim * 0.6}) 0%, rgba(10,12,40,${Math.min(0.95, dim + 0.25)}) 100%)` }} />
    </AbsoluteFill>
  );
}

function Fade({ children, len }: { children: React.ReactNode; len: number }) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 12, len - 12, len], [0, 1, 1, 0], clamp);
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
}

function usePop(at: number, damping = 11) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - at, fps, config: { damping, mass: 0.7 } });
}

/** A square portrait in a gold game-card frame. */
function Card({ src, size, border = GOLD, glow }: { src: string; size: number; border?: string; glow?: string }) {
  return (
    <Img
      src={art(src)}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.16,
        border: `${Math.max(3, size / 22)}px solid ${border}`,
        boxShadow: `0 ${size / 16}px 0 ${NAVY}${glow ? `, 0 0 ${size / 3}px ${glow}` : ""}`,
        objectFit: "cover",
        background: PANEL,
      }}
    />
  );
}

/** The release's node on a timeline: a framed round icon. */
function Node({ r, size, active = true }: { r: Release; size: number; active?: boolean }) {
  const c = kindColor(r);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: PANEL,
        border: `${Math.max(4, size / 14)}px ${r.kind === "next" ? "dashed" : "solid"} ${c}`,
        boxShadow: `0 ${size / 14}px 0 ${NAVY}${active ? `, 0 0 ${size / 2.5}px ${c}aa` : ""}`,
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Img src={art(r.icon)} style={{ width: "100%", height: "100%", objectFit: "cover", filter: r.kind === "next" ? "grayscale(0.6) brightness(0.85)" : undefined, transform: r.kind === "next" || r.icon.startsWith("items/") ? "scale(0.7)" : undefined }} />
    </div>
  );
}

/** Ornate gold card frame (like the lobby cards): rim plus blue corner gems. */
function Frame({ children, w, h, color = GOLD }: { children?: React.ReactNode; w: number; h: number; color?: string }) {
  const gem = (style: React.CSSProperties) => (
    <div style={{ position: "absolute", width: 26, height: 34, ...style }}>
      <svg viewBox="0 0 26 34" width={26} height={34}>
        <path d="M13 0 L26 17 L13 34 L0 17 Z" fill="#6b3f08" />
        <path d="M13 3 L23 17 L13 31 L3 17 Z" fill={color} />
        <path d="M13 7 L19.5 17 L13 27 L6.5 17 Z" fill="#3f8cff" />
        <path d="M13 7 L15.5 13 L13 17 L10.5 13 Z" fill="#fff" opacity={0.75} />
      </svg>
    </div>
  );
  return (
    <div style={{ position: "relative", width: w, height: h, borderRadius: 34, background: "rgba(20,24,58,0.92)", border: `10px solid ${color}`, outline: `5px solid #6b3f08`, boxShadow: `0 14px 0 ${NAVY}, inset 0 0 0 3px #fff0a855` }}>
      {children}
      {gem({ left: -18, top: -22 })}
      {gem({ right: -18, top: -22 })}
      {gem({ left: -18, bottom: -22 })}
      {gem({ right: -18, bottom: -22 })}
    </div>
  );
}

/** The five releases along the bottom; the active one is lit. */
function MiniTimeline({ active }: { active: number }) {
  const frame = useCurrentFrame();
  const n = RELEASES.length;
  const x0 = 360;
  const x1 = 1560;
  const xs = RELEASES.map((_, i) => x0 + ((x1 - x0) * i) / (n - 1));
  const fill = interpolate(frame, [10, 40], [xs[Math.max(0, active - 1)], xs[active]], { ...clamp, easing: Easing.out(Easing.cubic) });
  return (
    <AbsoluteFill style={{ top: 960 }}>
      <div style={{ position: "absolute", left: x0, width: x1 - x0, top: 30, height: 10, borderRadius: 5, background: "rgba(255,255,255,0.18)" }} />
      <div style={{ position: "absolute", left: x0, width: fill - x0, top: 30, height: 10, borderRadius: 5, background: GOLD }} />
      {RELEASES.map((r, i) => {
        const on = i === active;
        const done = i < active;
        const s = on ? 1 + 0.08 * Math.sin(frame / 6) : 1;
        return (
          <div key={r.version} style={{ position: "absolute", left: xs[i] - 60, width: 120, top: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: on ? 40 : 26,
                height: on ? 40 : 26,
                marginTop: on ? 15 : 22,
                borderRadius: "50%",
                background: on || done ? kindColor(r) : NAVY,
                border: `4px solid ${on || done ? NAVY : "#7c84b8"}`,
                boxShadow: on ? `0 0 24px ${kindColor(r)}` : undefined,
                transform: `scale(${s})`,
              }}
            />
            <div style={{ ...body(on ? 26 : 22, on ? "#fff" : "#9aa3d8") }}>{r.version}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------- scenes

function Intro() {
  const logo = usePop(6, 9);
  const title = usePop(30);
  const frame = useCurrentFrame();
  const sub = interpolate(frame, [52, 72], [0, 1], clamp);
  return (
    <Fade len={R_INTRO}>
      <Background src="locations/loading_keyart.webp" dim={0.35} zoom={0.1} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 8 }}>
        <Img src={art("ui/logo.webp")} style={{ width: 640, transform: `scale(${logo}) rotate(${(1 - logo) * -8}deg)` }} />
        <div style={{ ...chunky(140, "#ffd23a"), transform: `scale(${title})`, marginTop: -24 }}>RELEASE ROADMAP</div>
        <div style={{ ...chunky(46, "#fff4c2"), opacity: sub, transform: `translateY(${(1 - sub) * 20}px)` }}>Every update so far, and what's next</div>
      </AbsoluteFill>
    </Fade>
  );
}

/** All five on one line: the line draws itself and each node pops in as it passes. */
function Overview() {
  const frame = useCurrentFrame();
  const n = RELEASES.length;
  const x0 = 220;
  const x1 = 1700;
  const xs = RELEASES.map((_, i) => x0 + ((x1 - x0) * i) / (n - 1));
  const draw = interpolate(frame, [20, 130], [x0, x1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const head = usePop(4);
  return (
    <Fade len={R_OVERVIEW}>
      <Background src="locations/world_map.webp" dim={0.55} />
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 90 }}>
        <div style={{ ...chunky(92, "#ffd23a"), transform: `scale(${head})` }}>The journey so far</div>
      </AbsoluteFill>
      <div style={{ position: "absolute", left: x0, width: x1 - x0, top: 556, height: 16, borderRadius: 8, background: "rgba(255,255,255,0.15)" }} />
      <div style={{ position: "absolute", left: x0, width: Math.min(draw, xs[n - 2]) - x0, top: 556, height: 16, borderRadius: 8, background: GOLD, boxShadow: `0 0 18px ${GOLD}` }} />
      {draw > xs[n - 2] && (
        <div style={{ position: "absolute", left: xs[n - 2], width: draw - xs[n - 2], top: 562, height: 0, borderTop: "5px dashed #9aa0c8" }} />
      )}
      {RELEASES.map((r, i) => {
        const at = 20 + ((xs[i] - x0) / (x1 - x0)) * 110;
        const p = spring({ frame: frame - at, fps: 30, config: { damping: 10, mass: 0.7 } });
        const small = r.kind === "qol";
        const size = small ? 110 : 150;
        return (
          <div key={r.version} style={{ position: "absolute", left: xs[i] - 160, width: 320, top: 564 - size / 2 - 120, display: "flex", flexDirection: "column", alignItems: "center", transform: `scale(${p})`, opacity: p }}>
            <div style={{ ...chunky(small ? 44 : 60, kindColor(r)), height: 80, display: "flex", alignItems: "flex-end", paddingBottom: 18 }}>{r.version}</div>
            <div style={{ marginTop: small ? 20 : 0 }}>
              <Node r={r} size={size} active={r.kind !== "next"} />
            </div>
            <div style={{ ...chunky(small ? 30 : 36, "#fff"), marginTop: small ? 40 : 22, textAlign: "center" }}>{r.title}</div>
            <div style={{ ...body(26, "#c9d2ff"), marginTop: 8 }}>{r.date}</div>
          </div>
        );
      })}
    </Fade>
  );
}

/** One release: its tag, title and points on the left, its art on the right. */
function ReleaseScene({ i }: { i: number }) {
  const r = RELEASES[i];
  const frame = useCurrentFrame();
  const tag = usePop(4);
  const title = usePop(12);
  const bg = r.kind === "next" ? "locations/world_map.webp" : i === 0 ? "locations/lobby_landscape.webp" : i === 1 ? "locations/arena_crystal_cave.webp" : i === 2 ? "locations/arena_meadow.webp" : "locations/arena_corrupted_candy_kingdom.webp";
  const label = r.kind === "qol" ? "QUALITY OF LIFE" : r.kind === "next" ? "COMING NEXT" : `RELEASE ${r.version}.0`;
  return (
    <Fade len={R_SCENE}>
      <Background src={bg} dim={0.6} />
      <AbsoluteFill style={{ flexDirection: "row", padding: "80px 100px 150px", gap: 60 }}>
        <div style={{ width: 860, display: "flex", flexDirection: "column" }}>
          <div style={{ alignSelf: "flex-start", transform: `scale(${tag})`, transformOrigin: "left center", background: kindColor(r), color: NAVY, fontFamily: DISPLAY, fontSize: 34, padding: "8px 26px", borderRadius: 40, border: `5px solid ${NAVY}` }}>
            {r.kind === "next" ? label : `${label} · ${r.date.toUpperCase()}`}
          </div>
          <div style={{ ...chunky(r.title.length > 16 ? 92 : 120, "#ffd23a"), marginTop: 22, transform: `translateX(${(1 - title) * -60}px)`, opacity: title }}>{r.title}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 34 }}>
            {r.points.map((p, j) => {
              const at = 34 + j * 14;
              const q = interpolate(frame, [at, at + 14], [0, 1], { ...clamp, easing: Easing.out(Easing.back(1.6)) });
              return (
                <div key={p.text} style={{ display: "flex", alignItems: "center", gap: 22, opacity: q, transform: `translateX(${(1 - q) * -50}px)` }}>
                  <Img src={art(p.icon)} style={{ width: 70, height: 70, objectFit: "contain", borderRadius: 14, filter: `drop-shadow(0 4px 0 ${NAVY})` }} />
                  <div style={{ ...body(r.points.length > 4 ? 34 : 38, "#fff") }}>{p.text}</div>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <SceneArt i={i} />
        </div>
      </AbsoluteFill>
      <MiniTimeline active={i} />
    </Fade>
  );
}

/** The right-hand art for each release. */
function SceneArt({ i }: { i: number }) {
  const frame = useCurrentFrame();
  const r = RELEASES[i];
  const pop = (at: number) => spring({ frame: frame - at, fps: 30, config: { damping: 11, mass: 0.7 } });
  const bob = (k: number) => Math.sin((frame + k * 17) / 14) * 6;
  if (r.version === "v1.1") {
    return (
      <Frame w={720} h={560}>
        <div style={{ position: "absolute", inset: 30, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 22, alignContent: "center" }}>
          {CAST_V11.map((id, k) => (
            <div key={id} style={{ transform: `scale(${pop(20 + k * 7)}) translateY(${bob(k)}px)`, display: "flex", justifyContent: "center" }}>
              <Card src={`portraits/${id}.webp`} size={140} border={k % 2 ? "#b56cff" : "#4f9dff"} />
            </div>
          ))}
        </div>
      </Frame>
    );
  }
  if (r.version === "v1.2") {
    const fan = [-1, 0, 1];
    return (
      <div style={{ position: "relative", width: 760, height: 720 }}>
        {COVERS.map((c, k) => {
          const p = pop(18 + k * 9);
          const off = fan[k];
          return (
            <Img
              key={c}
              src={art(`story/covers/${c}.webp`)}
              style={{
                position: "absolute",
                left: 380 - 150 + off * 210,
                top: 40 + Math.abs(off) * 40,
                width: 300,
                height: 398,
                borderRadius: 16,
                border: `8px solid ${GOLD}`,
                boxShadow: `0 14px 0 ${NAVY}`,
                transform: `rotate(${off * 12 * p}deg) scale(${p})`,
                zIndex: off === 0 ? 2 : 1,
              }}
            />
          );
        })}
        <div style={{ position: "absolute", left: 0, right: 0, top: 470, display: "flex", justifyContent: "center", gap: 26, zIndex: 3 }}>
          {STORY_HEROES.map((id, k) => (
            <div key={id} style={{ transform: `scale(${pop(50 + k * 8)}) translateY(${bob(k)}px)` }}>
              <Card src={`portraits/${id}.webp`} size={id === "princess_muse" ? 190 : 160} border={id === "princess_muse" ? PINK : "#b56cff"} glow={id === "princess_muse" ? PINK : undefined} />
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (r.kind === "qol") {
    const els = ["fire", "ice", "lightning", "nature", "poison", "arcane"];
    return (
      <Frame w={620} h={520} color={TEAL}>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 34 }}>
          <div style={{ display: "flex", gap: 18 }}>
            {els.map((e, k) => (
              <Img key={e} src={art(`ui/element_${e}.webp`)} style={{ width: 76, height: 76, transform: `scale(${pop(24 + k * 5)}) translateY(${bob(k)}px)` }} />
            ))}
          </div>
          <div style={{ ...chunky(54, "#fff"), transform: `scale(${pop(60)})` }}>Small fixes,</div>
          <div style={{ ...chunky(54, TEAL), transform: `scale(${pop(70)})`, marginTop: -26 }}>smoother play</div>
        </div>
      </Frame>
    );
  }
  if (r.kind === "next") {
    return (
      <div style={{ display: "flex", gap: 30 }}>
        {["BOOK 2", "BOOK 3", "BOOK 4"].map((b, k) => (
          <div
            key={b}
            style={{
              width: 200,
              height: 270,
              borderRadius: 16,
              border: "6px dashed #9aa0c8",
              background: "rgba(27,34,87,0.85)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              transform: `scale(${pop(24 + k * 9)}) rotate(${(k - 1) * 6}deg) translateY(${bob(k)}px)`,
            }}
          >
            <Img src={art("ui/padlock.webp")} style={{ width: 96 }} />
            <div style={{ ...chunky(40, "#c9d2ff") }}>{b}</div>
          </div>
        ))}
      </div>
    );
  }
  // v1.0: the launch build's highlights as a framed card grid.
  const icons = ["portraits/fox_spearman.webp", "ui/icon_pvp.webp", "ui/league_3.webp", "ui/icon_quests.webp", "items/chest_epic.webp", "items/spell_book.webp"];
  return (
    <Frame w={640} h={480}>
      <div style={{ position: "absolute", inset: 40, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 30, alignContent: "center", justifyItems: "center" }}>
        {icons.map((ic, k) => (
          <div key={ic} style={{ width: 150, height: 150, borderRadius: 26, background: PANEL, border: `5px solid ${GOLD}`, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${pop(20 + k * 7)}) translateY(${bob(k)}px)`, overflow: "hidden" }}>
            <Img src={art(ic)} style={ic.startsWith("portraits/") ? { width: "100%", height: "100%", objectFit: "cover" } : { width: 112, height: 112, objectFit: "contain" }} />
          </div>
        ))}
      </div>
    </Frame>
  );
}

function Outro() {
  const frame = useCurrentFrame();
  const logo = usePop(6, 9);
  const line = usePop(26);
  const cta = usePop(48, 8);
  const pulse = 1 + 0.04 * Math.sin(frame / 6);
  return (
    <Fade len={R_OUTRO}>
      <Background src="locations/arena_corrupted_candy_kingdom.webp" dim={0.7} zoom={0.12} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 18 }}>
        <Img src={art("ui/logo.webp")} style={{ width: 560, transform: `scale(${logo})` }} />
        <div style={{ ...chunky(64, "#fff"), transform: `scale(${line})` }}>v1.0 → v1.1 → QoL → v1.2</div>
        <div style={{ ...chunky(110, "#ffd23a"), transform: `scale(${cta * pulse})`, marginTop: 10 }}>v1.2 STORIES OUT NOW</div>
        <div style={{ ...chunky(42, "#ff9df0"), opacity: interpolate(frame, [70, 90], [0, 1], clamp) }}>Book 1 "The Chosen" · Books 2 – 4 coming</div>
      </AbsoluteFill>
    </Fade>
  );
}

export function Releases() {
  return (
    <AbsoluteFill style={{ background: NAVY }}>
      <Series>
        <Series.Sequence durationInFrames={R_INTRO}>
          <Intro />
        </Series.Sequence>
        <Series.Sequence durationInFrames={R_OVERVIEW}>
          <Overview />
        </Series.Sequence>
        {RELEASES.map((r, i) => (
          <Series.Sequence key={r.version} durationInFrames={R_SCENE}>
            <ReleaseScene i={i} />
          </Series.Sequence>
        ))}
        <Series.Sequence durationInFrames={R_OUTRO}>
          <Outro />
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
}
