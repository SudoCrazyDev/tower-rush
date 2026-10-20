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
  const tick = (t: number) => {
    vsyncs.push(t);
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
      gpu.slice(0, 48);
  }, 500);
}
