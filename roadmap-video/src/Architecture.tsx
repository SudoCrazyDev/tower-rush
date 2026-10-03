import React from "react";
import { AbsoluteFill, Easing, Img, Series, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadLilita } from "@remotion/google-fonts/LilitaOne";
import { loadFont as loadNunito } from "@remotion/google-fonts/Nunito";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

const { fontFamily: DISPLAY } = loadLilita();
const { fontFamily: BODY } = loadNunito("normal", { weights: ["800"], subsets: ["latin"] });
const { fontFamily: MONO } = loadMono("normal", { weights: ["700"], subsets: ["latin"] });

const NAVY = "#14183a";
const PANEL = "#1b2257";
const GOLD = "#f2b630";
const GREEN = "#59d64a";
const BLUE = "#5fb4ff";
const PINK = "#ff6b8a";
const PURPLE = "#c18bff";
const CREAM = "#fff4c2";

export const A_INTRO = 120;
export const A_REPO = 240;
export const A_DEV = 330;
export const A_CONFIG = 330;
export const A_TRUST = 300;
export const A_DATA = 240;
export const A_PROD = 300;
export const A_OUTRO = 120;
export const A_TOTAL = A_INTRO + A_REPO + A_DEV + A_CONFIG + A_TRUST + A_DATA + A_PROD + A_OUTRO;

// ---------------------------------------------------------------- helpers

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const chunky = (size: number, color = "#fff"): React.CSSProperties => ({
  fontFamily: DISPLAY,
  fontSize: size,
  color,
  WebkitTextStroke: `${Math.round(size / 9)}px ${NAVY}`,
  paintOrder: "stroke fill",
  textShadow: `0 ${Math.round(size / 12)}px 0 ${NAVY}`,
  lineHeight: 1.05,
});

const body = (size: number, color = "#fff"): React.CSSProperties => ({ fontFamily: BODY, fontWeight: 800, fontSize: size, color, lineHeight: 1.2 });
const mono = (size: number, color = CREAM): React.CSSProperties => ({ fontFamily: MONO, fontWeight: 700, fontSize: size, color });

const panel = (border = GOLD): React.CSSProperties => ({
  background: PANEL,
  border: `6px solid ${border}`,
  borderRadius: 28,
  boxShadow: `0 10px 0 ${NAVY}`,
});

function Background({ src, dim = 0.6, zoom = 0.05 }: { src: string; dim?: number; zoom?: number }) {
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

/** 0→1 ease-in between two frames. */
function useIn(at: number, len = 14) {
  const frame = useCurrentFrame();
  return interpolate(frame, [at, at + len], [0, 1], { ...clamp, easing: Easing.out(Easing.back(1.5)) });
}

function Title({ children, sub, color = "#ffd23a" }: { children: React.ReactNode; sub?: string; color?: string }) {
  const head = usePop(2);
  const s = useIn(14, 16);
  return (
    <div style={{ position: "absolute", left: 90, top: 50 }}>
      <div style={{ ...chunky(84, color), transform: `scale(${head})`, transformOrigin: "left center" }}>{children}</div>
      {sub && <div style={{ ...body(34, CREAM), marginTop: 10, opacity: s }}>{sub}</div>}
    </div>
  );
}

const Tag = ({ children, color }: { children: React.ReactNode; color: string }) => (
  <span style={{ fontFamily: DISPLAY, fontSize: 26, color: NAVY, background: color, borderRadius: 12, padding: "4px 14px", whiteSpace: "nowrap" }}>{children}</span>
);

/** A labelled box placed absolutely; pops in at `at`. */
function Node({
  x, y, w, h, at, color, title, lines = [], icon, port,
}: {
  x: number; y: number; w: number; h: number; at: number; color: string; title: string; lines?: string[]; icon?: string; port?: string;
}) {
  const p = useIn(at, 16);
  return (
    <div
      style={{
        position: "absolute", left: x, top: y, width: w, height: h, ...panel(color), padding: "18px 24px",
        boxSizing: "border-box", opacity: Math.min(1, p * 1.4), transform: `scale(${0.7 + 0.3 * p})`,
        display: "flex", flexDirection: "column", gap: 6,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {icon && <Img src={staticFile(icon)} style={{ width: 56, height: 56, objectFit: "contain" }} />}
        <div style={{ ...chunky(42), flex: 1 }}>{title}</div>
        {port && <Tag color={color}>{port}</Tag>}
      </div>
      {lines.map((l) => (
        <div key={l} style={body(26, "#cfd5ff")}>{l}</div>
      ))}
    </div>
  );
}

type Pt = { x: number; y: number };

/** A connector that draws itself in at `at`, then streams packets along it. */
function Wire({ from, to, at, color = GOLD, label, labelAt, packets = true, bend = 0, reverse = false }: {
  from: Pt; to: Pt; at: number; color?: string; label?: string; labelAt?: Pt; packets?: boolean; bend?: number; reverse?: boolean;
}) {
  const frame = useCurrentFrame();
  const draw = interpolate(frame, [at, at + 20], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const mx = (from.x + to.x) / 2, my = (from.y + to.y) / 2 + bend;
  const d = `M ${from.x} ${from.y} Q ${mx} ${my} ${to.x} ${to.y}`;
  const point = (t: number) => ({
    x: (1 - t) ** 2 * from.x + 2 * (1 - t) * t * mx + t ** 2 * to.x,
    y: (1 - t) ** 2 * from.y + 2 * (1 - t) * t * my + t ** 2 * to.y,
  });
  const live = frame - at - 22;
  const dots = packets && live > 0 ? [0, 1, 2].map((k) => {
    const t = ((live / 45 + k / 3) % 1);
    return point(reverse ? 1 - t : t);
  }) : [];
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
      <path d={d} fill="none" stroke={NAVY} strokeWidth={18} strokeLinecap="round" pathLength={1} strokeDasharray={`${draw} 1`} opacity={0.8} />
      <path d={d} fill="none" stroke={color} strokeWidth={8} strokeLinecap="round" pathLength={1} strokeDasharray={`${draw} 1`} />
      {dots.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={11} fill="#fff" stroke={NAVY} strokeWidth={4} />
      ))}
      {label && labelAt && draw > 0.6 && (
        <foreignObject x={labelAt.x - 200} y={labelAt.y - 24} width={400} height={50}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <span style={{ ...mono(24, NAVY), background: color, borderRadius: 10, padding: "4px 12px", border: `3px solid ${NAVY}` }}>{label}</span>
          </div>
        </foreignObject>
      )}
    </svg>
  );
}

// ---------------------------------------------------------------- scenes

function Intro() {
  const logo = usePop(6, 9);
  const t1 = usePop(30);
  const sub = useIn(52, 18);
  return (
    <Fade len={A_INTRO}>
      <Background src="loading_keyart.webp" dim={0.4} zoom={0.1} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 6 }}>
        <Img src={staticFile("icons/logo.webp")} style={{ width: 620, transform: `scale(${logo}) rotate(${(1 - logo) * -8}deg)` }} />
        <div style={{ ...chunky(118, "#ffd23a"), transform: `scale(${t1})`, marginTop: -20 }}>ARCHITECTURE</div>
        <div style={{ ...chunky(52, CREAM), opacity: sub, transform: `translateY(${(1 - sub) * 20}px)` }}>& infrastructure, in one minute</div>
      </AbsoluteFill>
    </Fade>
  );
}

const PACKAGES = [
  { name: "game/", tech: "Phaser 3 · TypeScript · Vite", what: "The game client: 7 scenes, battle sim, Canvas/WebGL", color: GREEN, icon: "icons/wave_horn.webp" },
  { name: "admin/", tech: "React 19 · Vite", what: "Balance editor, players, versions, audit log", color: BLUE, icon: "icons/spell_book.webp" },
  { name: "server/", tech: "Node 24 · Express 5 · node:sqlite", what: "Auth, economy, rewards, config store", color: GOLD, icon: "icons/trophy.webp" },
  { name: "shared/", tech: "Plain TypeScript", what: "Units, monsters, arenas, economy + validateConfig()", color: PURPLE, icon: "icons/scroll_upgrade.webp" },
  { name: "assets/", tech: "Python · Pillow → WebP", what: "Raw art pack → game/public/assets (~250 MB)", color: PINK, icon: "icons/chest_legendary.webp" },
  { name: "roadmap-video/", tech: "Remotion", what: "These explainer videos", color: "#9aa0c3", icon: "icons/banner_victory.webp" },
];

function Repo() {
  return (
    <Fade len={A_REPO}>
      <Background src="lobby_landscape.webp" dim={0.65} />
      <Title sub="One repo, three apps, one shared rulebook. No framework glue, no external services.">The monorepo</Title>
      <div style={{ position: "absolute", left: 90, right: 90, top: 250, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 30 }}>
        {PACKAGES.map((p, i) => {
          const s = useIn(26 + i * 14, 16);
          return (
            <div key={p.name} style={{ ...panel(p.color), padding: "22px 26px", height: 300, boxSizing: "border-box", opacity: Math.min(1, s * 1.5), transform: `translateY(${(1 - s) * 80}px)` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <Img src={staticFile(p.icon)} style={{ width: 84, height: 84, objectFit: "contain" }} />
                <div style={{ ...mono(44, "#fff") }}>{p.name}</div>
              </div>
              <div style={{ marginTop: 18 }}><Tag color={p.color}>{p.tech}</Tag></div>
              <div style={{ ...body(32, "#dfe3ff"), marginTop: 18 }}>{p.what}</div>
            </div>
          );
        })}
      </div>
    </Fade>
  );
}

function Dev() {
  const frame = useCurrentFrame();
  const cmd = useIn(10, 14);
  const typed = "npm run dev".slice(0, Math.max(0, Math.floor((frame - 14) / 2)));
  return (
    <Fade len={A_DEV}>
      <Background src="world_map.webp" dim={0.72} zoom={0.03} />
      <Title sub="concurrently starts three processes. Both Vite servers proxy /api to Express.">Local development</Title>
      <div style={{ position: "absolute", right: 90, top: 70, ...panel("#7c84b8"), padding: "14px 26px", opacity: cmd }}>
        <span style={mono(36, GREEN)}>$ </span><span style={mono(36)}>{typed}</span>
        <span style={{ ...mono(36), opacity: frame % 30 < 15 ? 1 : 0 }}>▌</span>
      </div>

      <Node x={90} y={330} w={380} h={160} at={30} color="#9aa0c3" title="Player" lines={["any browser / phone"]} icon="heroes/young_king.webp" />
      <Node x={90} y={700} w={380} h={160} at={40} color="#9aa0c3" title="Admin" lines={["browser"]} icon="heroes/dark_knight.webp" />

      <Node x={640} y={300} w={460} h={220} at={60} color={GREEN} title="Vite" port=":5173" lines={["game/ · Phaser 3", "HMR, serves ../shared"]} />
      <Node x={640} y={670} w={460} h={220} at={72} color={BLUE} title="Vite" port=":5174" lines={["admin/ · React", "base path /admin/"]} />

      <Node x={1290} y={470} w={480} h={240} at={110} color={GOLD} title="Express" port=":8787" lines={["server/src/index.ts", "/api · /api/admin · /assets"]} />
      <Node x={1360} y={820} w={340} h={150} at={140} color={PURPLE} title="SQLite" lines={["data/tower-rush.db"]} />

      <Wire from={{ x: 470, y: 410 }} to={{ x: 640, y: 410 }} at={84} color={GREEN} />
      <Wire from={{ x: 470, y: 780 }} to={{ x: 640, y: 780 }} at={90} color={BLUE} />
      <Wire from={{ x: 1100, y: 430 }} to={{ x: 1290, y: 560 }} at={124} color={GREEN} label="proxy /api" labelAt={{ x: 1180, y: 455 }} />
      <Wire from={{ x: 1100, y: 760 }} to={{ x: 1290, y: 640 }} at={130} color={BLUE} label="/api, /assets" labelAt={{ x: 1180, y: 740 }} />
      <Wire from={{ x: 1530, y: 710 }} to={{ x: 1530, y: 820 }} at={156} color={PURPLE} />
    </Fade>
  );
}

const STEPS = [
  { title: "shared/", body: "Default units, monsters, arenas, chests, economy", color: PURPLE },
  { title: "config_versions", body: "Every published config is a row in SQLite", color: GOLD },
  { title: "Admin draft", body: "Edits are highlighted and collected", color: BLUE },
  { title: "validateConfig()", body: "Same validator on both sides — bad data never goes live", color: PINK },
  { title: "Publish → v(n+1)", body: "New live version, audited; restore or export any old one", color: GOLD },
  { title: "GET /config", body: "Game downloads it at boot, applyConfig() patches tables", color: GREEN },
];

function Config() {
  const frame = useCurrentFrame();
  const STEP = 34;
  const active = Math.min(STEPS.length - 1, Math.max(0, Math.floor((frame - 30) / STEP)));
  return (
    <Fade len={A_CONFIG}>
      <Background src="arena_meadow.webp" dim={0.72} />
      <Title sub="All balance is one JSON document. Change it live without shipping code.">Live game config</Title>
      <div style={{ position: "absolute", left: 90, right: 90, top: 300, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "40px 60px" }}>
        {STEPS.map((s, i) => {
          const p = useIn(30 + i * STEP, 16);
          const on = i === active && frame > 30;
          return (
            <div key={s.title} style={{ ...panel(s.color), padding: "22px 26px", height: 260, boxSizing: "border-box", opacity: Math.min(1, p * 1.5), transform: `scale(${(0.8 + 0.2 * p) * (on ? 1.04 : 1)})`, boxShadow: on ? `0 0 0 8px ${s.color}55, 0 10px 0 ${NAVY}` : `0 10px 0 ${NAVY}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ ...chunky(44, s.color) }}>{i + 1}</div>
                <div style={mono(36, "#fff")}>{s.title}</div>
              </div>
              <div style={{ ...body(32, "#dfe3ff"), marginTop: 16 }}>{s.body}</div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 60, textAlign: "center", ...body(30, CREAM), opacity: useIn(240, 16) }}>
        Players pick up the new version on their next load.
      </div>
    </Fade>
  );
}

function Trust() {
  const left = useIn(24, 16);
  const rows = [
    "Purchases, card upgrades, chest rolls",
    "Battle rewards computed server-side",
    "Reported wave clamped to elapsed time",
    "Bans checked on every request",
  ];
  const sec = [
    "Passwords: scrypt + random salt",
    "Sessions: random bearer tokens (player 365d, admin 7d)",
    "Sign-in rate limit: 10 tries / 5 min / IP",
    "Every admin action → audit log",
  ];
  return (
    <Fade len={A_TRUST}>
      <Background src="lobby_landscape.webp" dim={0.72} />
      <Title sub="The browser plays the battle. The server owns everything that's worth cheating on.">Server is the source of truth</Title>
      <div style={{ position: "absolute", left: 90, top: 300, width: 520, ...panel(GREEN), padding: 30, boxSizing: "border-box", opacity: left, transform: `translateX(${(1 - left) * -80}px)` }}>
        <div style={chunky(46, GREEN)}>Browser</div>
        <div style={{ ...body(32, "#dfe3ff"), marginTop: 14 }}>Runs the Phaser battle simulation locally, then reports wave, kills and bosses.</div>
        <div style={{ ...mono(24), marginTop: 20, background: NAVY, borderRadius: 14, padding: 16 }}>POST /battles<br />POST /battles/:id/finish</div>
      </div>
      <div style={{ position: "absolute", left: 660, top: 300, width: 560, ...panel(GOLD), padding: 30, boxSizing: "border-box", opacity: useIn(60, 16) }}>
        <div style={chunky(46, GOLD)}>Server decides</div>
        {rows.map((r, i) => (
          <div key={r} style={{ ...body(30), marginTop: 14, opacity: useIn(76 + i * 10, 12) }}>✓ {r}</div>
        ))}
        <div style={{ ...mono(26, NAVY), marginTop: 22, background: GOLD, borderRadius: 14, padding: "12px 16px", opacity: useIn(130, 14) }}>
          maxWave = ⌊elapsed / 3s⌋ + 1
        </div>
      </div>
      <div style={{ position: "absolute", left: 1270, top: 300, width: 560, ...panel(PINK), padding: 30, boxSizing: "border-box", opacity: useIn(150, 16) }}>
        <div style={chunky(46, PINK)}>Auth & safety</div>
        {sec.map((r, i) => (
          <div key={r} style={{ ...body(30), marginTop: 14, opacity: useIn(166 + i * 10, 12) }}>• {r}</div>
        ))}
      </div>
    </Fade>
  );
}

const TABLES = [
  { name: "users", cols: "profile JSON · guest flag · ban", color: GREEN },
  { name: "sessions", cols: "token · kind · expires_at", color: PINK },
  { name: "battles", cols: "arena · deck · hero · wave · rewards", color: GOLD },
  { name: "config_versions", cols: "full config JSON · note · admin", color: PURPLE },
  { name: "admins", cols: "username · scrypt hash", color: BLUE },
  { name: "audit", cols: "admin · action · target · details", color: "#9aa0c3" },
];

function Data() {
  return (
    <Fade len={A_DATA}>
      <Background src="world_map.webp" dim={0.75} />
      <Title sub="Node's built-in node:sqlite, WAL mode, foreign keys on. One file to back up.">One SQLite file</Title>
      <div style={{ position: "absolute", left: 90, right: 90, top: 290, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 30 }}>
        {TABLES.map((t, i) => {
          const p = useIn(24 + i * 12, 14);
          return (
            <div key={t.name} style={{ ...panel(t.color), padding: "20px 26px", opacity: Math.min(1, p * 1.5), transform: `translateY(${(1 - p) * 60}px)` }}>
              <div style={mono(40, t.color)}>{t.name}</div>
              <div style={{ ...body(28, "#dfe3ff"), marginTop: 10 }}>{t.cols}</div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 90, right: 90, bottom: 80, display: "flex", gap: 20, justifyContent: "center", opacity: useIn(130, 16) }}>
        <Tag color={GREEN}>player progress = one JSON profile per user</Tag>
        <Tag color={GOLD}>indexes on trophies & best wave → leaderboard</Tag>
      </div>
    </Fade>
  );
}

function Prod() {
  const routes = [
    { path: "/", what: "game/dist", color: GREEN },
    { path: "/admin", what: "admin/dist", color: BLUE },
    { path: "/api", what: "player + admin API", color: GOLD },
    { path: "/assets", what: "WebP art, 1-day cache", color: PINK },
  ];
  return (
    <Fade len={A_PROD}>
      <Background src="arena_meadow.webp" dim={0.72} />
      <Title sub="npm run build, then npm start: a single Node process serves everything.">Production</Title>

      <Node x={90} y={420} w={340} h={170} at={20} color="#9aa0c3" title="Internet" lines={["players & admins"]} />
      <div style={{ position: "absolute", left: 520, top: 380, width: 300, ...panel("#7c84b8"), borderStyle: "dashed", padding: 24, boxSizing: "border-box", opacity: useIn(40, 16) }}>
        <div style={chunky(38, CREAM)}>HTTPS proxy</div>
        <div style={{ ...body(26, "#cfd5ff"), marginTop: 8 }}>Caddy / nginx<br />(you add this)</div>
      </div>
      <div style={{ position: "absolute", left: 910, top: 300, width: 560, ...panel(GOLD), padding: 28, boxSizing: "border-box", opacity: useIn(66, 16) }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={chunky(44)}>node server</div>
          <Tag color={GOLD}>:8787</Tag>
        </div>
        {routes.map((r, i) => (
          <div key={r.path} style={{ display: "flex", gap: 18, alignItems: "center", marginTop: 16, opacity: useIn(84 + i * 10, 12) }}>
            <span style={{ ...mono(30, NAVY), background: r.color, borderRadius: 10, padding: "4px 12px", width: 140, textAlign: "center" }}>{r.path}</span>
            <span style={body(30)}>{r.what}</span>
          </div>
        ))}
      </div>
      <Node x={1570} y={380} w={280} h={300} at={140} color={PURPLE} title="Disk" lines={["server/data/", "tower-rush.db", "← back this up"]} />

      <Wire from={{ x: 430, y: 505 }} to={{ x: 520, y: 505 }} at={50} color="#9aa0c3" />
      <Wire from={{ x: 820, y: 505 }} to={{ x: 910, y: 505 }} at={76} color={GOLD} />
      <Wire from={{ x: 1470, y: 530 }} to={{ x: 1570, y: 530 }} at={150} color={PURPLE} />

      <div style={{ position: "absolute", left: 90, right: 90, bottom: 70, display: "flex", gap: 20, justifyContent: "center", opacity: useIn(190, 16) }}>
        <Tag color={GREEN}>no Docker, no CDN, no cloud DB yet</Tag>
        <Tag color={PINK}>single box → scale up before scaling out</Tag>
      </div>
    </Fade>
  );
}

function Outro() {
  const logo = usePop(6, 10);
  const line = useIn(26, 18);
  return (
    <Fade len={A_OUTRO}>
      <Background src="loading_keyart.webp" dim={0.55} zoom={0.08} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 18 }}>
        <Img src={staticFile("icons/logo.webp")} style={{ width: 520, transform: `scale(${logo})` }} />
        <div style={{ ...chunky(64, CREAM), opacity: line, transform: `translateY(${(1 - line) * 20}px)` }}>
          Phaser + React on the edge · Express + SQLite at the core
        </div>
      </AbsoluteFill>
    </Fade>
  );
}

export const Architecture: React.FC = () => (
  <AbsoluteFill style={{ background: NAVY }}>
    <Series>
      <Series.Sequence durationInFrames={A_INTRO}><Intro /></Series.Sequence>
      <Series.Sequence durationInFrames={A_REPO}><Repo /></Series.Sequence>
      <Series.Sequence durationInFrames={A_DEV}><Dev /></Series.Sequence>
      <Series.Sequence durationInFrames={A_CONFIG}><Config /></Series.Sequence>
      <Series.Sequence durationInFrames={A_TRUST}><Trust /></Series.Sequence>
      <Series.Sequence durationInFrames={A_DATA}><Data /></Series.Sequence>
      <Series.Sequence durationInFrames={A_PROD}><Prod /></Series.Sequence>
      <Series.Sequence durationInFrames={A_OUTRO}><Outro /></Series.Sequence>
    </Series>
  </AbsoluteFill>
);
