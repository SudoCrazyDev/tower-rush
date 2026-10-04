/**
 * Plays a simulation on a small drawing of the arena: units on their tiles, monsters
 * walking the ring with health bars and status rings, shots, hits and floating text.
 */
import { useEffect, useRef, useState } from "react";
import { asset } from "./api";
import { Sim, SIM_DT, type SimSetup } from "../../shared/sim.ts";
import { ELEMENT_COLOR } from "../../shared/units.ts";

const AW = 752;
const AH = 1344;

const images = new Map<string, HTMLImageElement>();
function img(src: string) {
  let i = images.get(src);
  if (!i) {
    i = new Image();
    i.src = src;
    images.set(src, i);
  }
  return i.complete && i.naturalWidth ? i : null;
}

const hex = (n: number) => `#${n.toString(16).padStart(6, "0")}`;

export function ArenaView({ setup, height = 620, autoplay = true }: { setup: SimSetup; height?: number; autoplay?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const sim = useRef<Sim | null>(null);
  const [seedOffset, setSeedOffset] = useState(0);
  const [playing, setPlaying] = useState(autoplay);
  const [speed, setSpeed] = useState(2);
  const [restart, setRestart] = useState(0);
  const [, setTick] = useState(0);
  const playingRef = useRef(playing);
  const speedRef = useRef(speed);
  playingRef.current = playing;
  speedRef.current = speed;
  const key = JSON.stringify(setup);
  const width = Math.round((AW * height) / AH);

  useEffect(() => {
    sim.current = new Sim({ ...setup, seed: setup.seed + seedOffset });
    setPlaying(autoplay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, seedOffset, restart]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let hud = 0;
    const frame = (t: number) => {
      const dt = Math.min(0.1, (t - last) / 1000);
      last = t;
      const s = sim.current;
      if (s && playingRef.current && !s.over) {
        acc += dt * speedRef.current;
        while (acc >= SIM_DT && !s.over) {
          s.step(SIM_DT);
          acc -= SIM_DT;
        }
      }
      if (s) draw(canvas.current, s, width, height);
      if ((hud += dt) > 0.2) {
        hud = 0;
        setTick((n) => n + 1);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [width, height]);

  const s = sim.current;
  const boss = s?.boss;
  return (
    <div className="arena-view">
      <div className="toolbar">
        <button className="btn small primary" onClick={() => (s?.over ? setRestart((n) => n + 1) : setPlaying((p) => !p))}>
          {s?.over ? "Replay" : playing ? "Pause" : "Play"}
        </button>
        <div className="seg small">
          {[1, 2, 4, 8].map((x) => (
            <button key={x} className={speed === x ? "on" : ""} onClick={() => setSpeed(x)}>
              {x}×
            </button>
          ))}
        </div>
        <button className="btn small ghost" onClick={() => setRestart((n) => n + 1)}>
          Restart
        </button>
        <button className="btn small ghost" onClick={() => setSeedOffset((n) => n + 1)} title="Same setup, different luck">
          New run
        </button>
      </div>
      <div className="arena-stage" style={{ width, height }}>
        <canvas ref={canvas} width={width * (devicePixelRatio || 1)} height={height * (devicePixelRatio || 1)} style={{ width, height }} />
        {s && (
          <div className="arena-hud">
            <span>{s.now.toFixed(1)}s</span>
            <span>Wave {s.wave}</span>
            <span>♥ {s.lives}</span>
            <span>☠ {s.kills}</span>
            {s.leaks > 0 && <span className="bad">↓ {s.leaks}</span>}
            <span>👾 {s.monsters.length}</span>
          </div>
        )}
        {boss && (
          <div className="arena-boss">
            <div>{boss.boss!.name}</div>
            <div className="bar">
              <div style={{ width: `${Math.max(0, (100 * boss.hp) / boss.maxHp)}%`, background: "#e53935" }} />
            </div>
          </div>
        )}
        {s?.over && (
          <div className={`arena-over ${s.outcome === "lost" ? "bad" : ""}`}>
            {s.outcome === "lost" ? "Lost" : s.outcome === "timeout" ? "Time's up" : s.outcome === "done" ? "Done" : "Cleared"} in {s.now.toFixed(1)}s
            {s.leaks > 0 && ` · ${s.leaks} got through`}
          </div>
        )}
      </div>
      <p className="muted small">Run seed {setup.seed + seedOffset}. Same setup and seed always plays out the same way.</p>
    </div>
  );
}

function draw(c: HTMLCanvasElement | null, s: Sim, width: number, height: number) {
  const ctx = c?.getContext("2d");
  if (!c || !ctx) return;
  const k = (width / AW) * (devicePixelRatio || 1);
  ctx.setTransform(k, 0, 0, k, 0, 0);
  ctx.clearRect(0, 0, AW, AH);
  const bg = img(asset("locations", `arena_${s.arena.id}`));
  if (bg) ctx.drawImage(bg, 0, 0, AW, AH);
  else {
    ctx.fillStyle = "#2b3a2a";
    ctx.fillRect(0, 0, AW, AH);
  }
  ctx.fillStyle = "rgba(10,12,30,.25)";
  ctx.fillRect(0, 0, AW, AH);

  // Paths.
  ctx.lineWidth = 6;
  ctx.strokeStyle = "rgba(255,255,255,.18)";
  for (const p of s.paths) {
    ctx.beginPath();
    p.pts.forEach((pt, i) => (i ? ctx.lineTo(pt.x, pt.y) : ctx.moveTo(pt.x, pt.y)));
    ctx.stroke();
  }

  const now = s.now;
  // Units.
  for (const u of s.units) {
    if (!u) continue;
    const r = u.awakened ? 44 : 38;
    const recoil = now - u.firedAt < 0.12 ? 1.08 : 1;
    if (u.awakened) {
      ctx.fillStyle = "rgba(255,217,59,.3)";
      ctx.beginPath();
      ctx.ellipse(u.x, u.y + 30, 56, 22, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    circleImage(ctx, asset(u.awakened ? "portraits_awakened" : "portraits", u.def.id), u.x, u.y - 10, r * recoil, hex(ELEMENT_COLOR[u.def.element]));
    if (now < u.frozenUntil) {
      ctx.fillStyle = "rgba(127,216,255,.55)";
      ctx.beginPath();
      ctx.arc(u.x, u.y - 10, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // Rank pips.
    const gap = 11;
    const x0 = u.x - ((u.rank - 1) * gap) / 2;
    for (let i = 0; i < u.rank; i++) {
      ctx.fillStyle = "#14183a";
      ctx.beginPath();
      ctx.arc(x0 + i * gap, u.y + 38, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = u.rank === 7 ? "#ffd93b" : hex(ELEMENT_COLOR[u.def.element]);
      ctx.beginPath();
      ctx.arc(x0 + i * gap, u.y + 38, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Monsters, back to front.
  const ms = [...s.monsters].filter((m) => !m.gone).sort((a, b) => a.foot.y - b.foot.y);
  for (const m of ms) {
    const p = m.pos;
    const r = Math.max(18, m.size * 0.36);
    let ring: string | null = null;
    if (now < m.shieldUntil) ring = "#9fb4ff";
    else if (now < m.frozenUntil) ring = "#7fd8ff";
    else if (now < m.stunUntil) ring = "#ffd93b";
    else if (m.poison.length) ring = "#c89bff";
    else if (now < m.slowUntil) ring = "#b8e8ff";
    else if (m.burn.until > now) ring = "#ff8a3b";
    circleImage(ctx, asset(m.boss ? "bosses" : "monsters", m.id), p.x, p.y, r, ring ?? (m.boss ? "#e53935" : "#14183a"), m.intro > 0 ? 0.5 : 1);
    if (now < m.frozenUntil) {
      ctx.fillStyle = "rgba(127,216,255,.4)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    if (m.boss) continue; // Boss health is in the bar above the arena.
    const w = Math.max(36, r * 1.6);
    const frac = Math.max(0, m.hp / m.maxHp);
    ctx.fillStyle = "#14183a";
    ctx.fillRect(p.x - w / 2 - 2, p.y - r - 14, w + 4, 10);
    ctx.fillStyle = frac > 0.5 ? "#59d64a" : frac > 0.25 ? "#ffb21e" : "#e53935";
    ctx.fillRect(p.x - w / 2, p.y - r - 12, w * frac, 6);
  }

  // Shots.
  for (const sh of s.shots) {
    ctx.fillStyle = hex(ELEMENT_COLOR[sh.unit.def.element]);
    ctx.strokeStyle = "#14183a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(sh.x, sh.y, sh.unit.def.arch === "sniper" ? 10 : 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Effects.
  for (const f of s.fx) {
    const age = now - f.t;
    const a = Math.max(0, 1 - age / 0.8);
    ctx.globalAlpha = a;
    if (f.kind === "hit") {
      ctx.fillStyle = f.color;
      ctx.beginPath();
      ctx.arc(f.x, f.y, 10 + age * 40, 0, Math.PI * 2);
      ctx.globalAlpha = a * 0.5;
      ctx.fill();
    } else if (f.kind === "ring") {
      ctx.strokeStyle = f.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(f.x, f.y, (f.x2 ?? 80) * Math.min(1, 0.4 + age * 3), 0, Math.PI * 2);
      ctx.stroke();
    } else if (f.kind === "zap") {
      ctx.strokeStyle = f.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(f.x, f.y);
      ctx.lineTo(f.x2 ?? f.x, f.y2 ?? f.y);
      ctx.stroke();
    } else if (f.kind === "text" && f.text) {
      ctx.font = "800 26px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#14183a";
      ctx.strokeText(f.text, f.x, f.y - age * 50);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y - age * 50);
    }
    ctx.globalAlpha = 1;
  }
}

function circleImage(ctx: CanvasRenderingContext2D, src: string, x: number, y: number, r: number, border: string, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#14183a";
  ctx.beginPath();
  ctx.arc(x, y, r + 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = border;
  ctx.beginPath();
  ctx.arc(x, y, r + 2, 0, Math.PI * 2);
  ctx.fill();
  const i = img(src);
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  if (i) ctx.drawImage(i, x - r, y - r, r * 2, r * 2);
  else {
    ctx.fillStyle = "#3b4270";
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}
