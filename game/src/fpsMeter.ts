import Phaser from "phaser";

/**
 * Tester overlay for lag reports: frames drawn vs the screen's refresh rate, frame gaps,
 * CPU time per frame, draw calls and the device's GPU. `?fps` turns it on and keeps it on
 * (so the installed app shows it too), `?fps=0` turns it off. Plain DOM, refreshed twice a
 * second, so it costs the game next to nothing.
 */
const KEY = "tower-rush:fps";

export function fpsMeterWanted() {
  const p = new URLSearchParams(location.search);
  try {
    if (p.has("fps")) {
      if (p.get("fps") === "0") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, "1");
    }
    return localStorage.getItem(KEY) === "1";
  } catch {
    return p.has("fps") && p.get("fps") !== "0";
  }
}

export function fpsMeter(game: Phaser.Game) {
  const el = document.createElement("div");
  el.style.cssText =
    "position:fixed;left:4px;top:4px;z-index:99999;pointer-events:none;padding:4px 6px;border-radius:6px;" +
    "background:rgba(0,0,0,.72);color:#9f9;font:11px/1.35 ui-monospace,Consolas,monospace;white-space:pre";
  document.body.appendChild(el);

  // Screen refresh rate: every rAF callback, whether or not the game draws on it.
  const vsyncs: number[] = [];
  const total = { vsyncs: 0, frames: 0 };
  const tick = (t: number) => {
    vsyncs.push(t);
    total.vsyncs++;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  // Frames the game actually drew, and the CPU time from step start to the end of rendering.
  const frames: { t: number; cpu: number; calls: number }[] = [];
  let stepStart = 0;
  let calls = 0;
  game.events.on(Phaser.Core.Events.PRE_STEP, () => (stepStart = performance.now()));
  game.events.on(Phaser.Core.Events.POST_RENDER, () => {
    const now = performance.now();
    frames.push({ t: now, cpu: now - stepStart, calls });
    total.frames++;
    calls = 0;
  });

  let gpu = "canvas";
  let pipeline = "";
  const r = game.renderer;
  if (r instanceof Phaser.Renderer.WebGL.WebGLRenderer) {
    const gl = r.gl;
    for (const name of ["drawElements", "drawArrays"] as const) {
      const orig = gl[name].bind(gl) as (...a: unknown[]) => void;
      (gl as unknown as Record<string, unknown>)[name] = (...a: unknown[]) => {
        calls++;
        orig(...a);
      };
    }
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    gpu = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER));
    pipeline = r.pipelines.current?.name ?? "";
  }

  const probeKey = new URLSearchParams(location.search).get("probe");
  let probeLines: string[] = [];
  if (probeKey) {
    probeLines = [`probe: open ${probeKey}, then hands off`];
    const wait = setInterval(() => {
      const s = game.scene.getScenes(true).find((x) => x.scene.key === probeKey);
      if (!s) return;
      clearInterval(wait);
      probeLines = [`probe ${probeKey}: running...`];
      setTimeout(() => probe(s, total, (lines) => (probeLines = lines)), 3000);
    }, 500);
  }

  // Every 2 s: frames drawn @ how far the scrolling list (the masked container) is scrolled.
  const history: string[] = [];
  let lastScene = "";
  let histFrames = 0;
  setInterval(() => {
    const s = game.scene.getScenes(true)[0];
    const key = s?.scene.key ?? "";
    if (key !== lastScene) {
      lastScene = key;
      history.length = 0;
    } else {
      const list = (s?.children.list as Obj[] | undefined)?.find((o) => o.mask) as unknown as { y: number } | undefined;
      history.push(`${Math.round((total.frames - histFrames) / 2)}${list ? "@" + Math.round(-list.y) : ""}`);
      if (history.length > 8) history.shift();
    }
    histFrames = total.frames;
  }, 2000);

  setInterval(() => {
    const now = performance.now();
    const since = now - 1000;
    while (vsyncs.length && vsyncs[0] < since) vsyncs.shift();
    while (frames.length && frames[0].t < since) frames.shift();
    if (r instanceof Phaser.Renderer.WebGL.WebGLRenderer) pipeline = r.pipelines.current?.name ?? pipeline;

    const hz = vsyncs.length;
    const fps = frames.length;
    const gaps = frames.slice(1).map((f, i) => f.t - frames[i].t);
    const sorted = [...gaps].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
    // A hitch: a frame that took clearly longer than the usual one.
    const hitches = gaps.filter((g) => g > median * 1.5).length;
    const worst = sorted[sorted.length - 1] ?? 0;
    const cpu = frames.map((f) => f.cpu);
    const cpuAvg = cpu.reduce((a, b) => a + b, 0) / Math.max(1, cpu.length);
    const cpuMax = Math.max(0, ...cpu);
    const callsAvg = frames.reduce((a, f) => a + f.calls, 0) / Math.max(1, fps);
    const scene = game.scene.getScenes(true).map((s) => s.scene.key).join("+");

    el.style.color = fps >= Math.min(hz, 60) - 5 && hitches <= 2 ? "#9f9" : fps >= 40 ? "#fd6" : "#f77";
    el.textContent =
      `FPS ${fps} / screen ${hz} Hz\n` +
      `frame ${median.toFixed(1)}ms  worst ${worst.toFixed(0)}ms  hitches ${hitches}\n` +
      `cpu ${cpuAvg.toFixed(1)}ms  max ${cpuMax.toFixed(1)}ms  draws ${callsAvg.toFixed(0)}\n` +
      `${scene}  ${game.canvas.width}x${game.canvas.height} dpr ${devicePixelRatio}\n` +
      `v${__APP_VERSION__} ${pipeline}\n` +
      gpu.slice(0, 48) +
      (history.length ? "\nfps@scroll " + history.join(" ") : "") +
      (probeLines.length ? "\n" + probeLines.join("\n") : "");
  }, 500);
}

type Obj = Phaser.GameObjects.GameObject & Partial<Phaser.GameObjects.Components.Visible & Phaser.GameObjects.Components.BlendMode & Phaser.GameObjects.Components.Mask>;

/**
 * `?fps&probe=Deck`: once that scene opens, hide one part of it at a time for about three seconds and
 * record the screen's frame rate, so a single screenshot shows what a slow phone chokes on.
 */
async function probe(
  scene: Phaser.Scene,
  total: { vsyncs: number; frames: number },
  show: (lines: string[]) => void,
) {
  const all: Obj[] = [];
  const walk = (list: Phaser.GameObjects.GameObject[]) =>
    list.forEach((o) => {
      all.push(o as Obj);
      const kids = (o as Phaser.GameObjects.Container).list;
      if (kids) walk(kids);
    });
  walk(scene.children.list);
  const top = scene.children.list as Obj[];
  const masked = top.filter((o) => o.mask);
  const isAdd = (o: Obj) => o.blendMode === Phaser.BlendModes.ADD || o.blendMode === "ADD";
  const big = (o: Obj) => {
    const b = (o as unknown as Phaser.GameObjects.Image).getBounds?.();
    return !!b && b.width * b.height > scene.scale.width * scene.scale.height * 0.5;
  };

  const hide = (objs: Obj[]) => {
    const was = objs.map((o) => o.visible);
    objs.forEach((o) => o.setVisible?.(false));
    return () => objs.forEach((o, i) => o.setVisible?.(was[i] ?? true));
  };
  const tests: [string, () => () => void][] = [
    ["base", () => () => {}],
    ["no list", () => hide(masked)],
    ["no mask", () => {
      const m = masked.map((o) => o.mask!);
      masked.forEach((o) => o.clearMask?.());
      return () => masked.forEach((o, i) => o.setMask?.(m[i]));
    }],
    ["no ADD glows", () => hide(all.filter(isAdd))],
    ["no text", () => hide(all.filter((o) => o.type === "Text"))],
    ["no fullscreen", () => hide(top.filter(big))],
    ["list only", () => hide(top.filter((o) => !o.mask))],
    ["no card art", () => hide(all.filter((o) => /^(portrait|card|element|hero_portrait)/.test((o as unknown as Phaser.GameObjects.Image).texture?.key ?? "")))],
    ["nothing", () => hide(top)],
    ["base again", () => () => {}],
  ];
  const lines: string[] = [];
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  for (const [name, apply] of tests) {
    if (!scene.sys.isActive()) {
      show([`probe ${scene.scene.key} stopped: screen left or restarted`, ...lines]);
      return;
    }
    const undo = apply();
    await sleep(600);
    const t0 = performance.now();
    const v0 = total.vsyncs;
    const f0 = total.frames;
    await sleep(2000);
    const secs = (performance.now() - t0) / 1000;
    const hz = (total.vsyncs - v0) / secs;
    const fps = (total.frames - f0) / secs;
    undo();
    lines.push(`${name.padEnd(13)} ${fps.toFixed(0).padStart(3)} fps ${hz.toFixed(0).padStart(3)} Hz`);
    show([`probe ${scene.scene.key}:`, ...lines, "..."]);
  }
  show([`probe ${scene.scene.key} done:`, ...lines]);
}
