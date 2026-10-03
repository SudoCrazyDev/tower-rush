/**
 * All sound is synthesized with the Web Audio API, so there are no audio files to load.
 *
 * - sfx(name): short effects (summon, merge, hits, deaths, UI...). Busy effects such as
 *   hits are rate-limited so a full board doesn't turn into noise.
 * - music(song): looping chiptune-style tracks played by a small step sequencer.
 *
 * Browsers only allow audio after a user gesture; call unlockAudio() from a tap/click.
 */

type Song = "lobby" | "battle" | "boss";

const SETTINGS_KEY = "tower-rush-audio";
const settings = { music: true, sfx: true };
try {
  Object.assign(settings, JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}"));
} catch {
  // Defaults.
}

let ctx: AudioContext | null = null;
let master: GainNode;
let musicBus: GainNode;
let sfxBus: GainNode;
let noise: AudioBuffer;

function init() {
  if (ctx) return ctx;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.8;
  // Gentle limiter so stacked effects don't clip.
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -12;
  comp.ratio.value = 6;
  master.connect(comp).connect(ctx.destination);
  musicBus = ctx.createGain();
  musicBus.gain.value = settings.music ? 0.32 : 0;
  musicBus.connect(master);
  sfxBus = ctx.createGain();
  sfxBus.gain.value = settings.sfx ? 0.7 : 0;
  sfxBus.connect(master);
  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  // Pause everything while the tab is hidden.
  document.addEventListener("visibilitychange", () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend();
    else ctx.resume();
  });
  return ctx;
}

/** Call from a user gesture (first tap) so the browser lets us play sound. */
export function unlockAudio() {
  const c = init();
  if (c && c.state === "suspended") c.resume();
}

export function audioSettings() {
  return { ...settings };
}

export function setAudio(kind: "music" | "sfx", on: boolean) {
  settings[kind] = on;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Not persisted.
  }
  if (!ctx) return;
  const bus = kind === "music" ? musicBus : sfxBus;
  bus.gain.setTargetAtTime(on ? (kind === "music" ? 0.32 : 0.7) : 0, ctx.currentTime, 0.05);
}

// ---------------------------------------------------------------- synth voices

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

interface ToneOpts {
  type?: OscillatorType;
  vol?: number;
  attack?: number;
  release?: number;
  /** Pitch slide target in Hz. */
  slideTo?: number;
  filter?: number;
  detune?: number;
  dest?: AudioNode;
}

function tone(freq: number, t: number, dur: number, o: ToneOpts = {}) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = o.type ?? "square";
  osc.frequency.setValueAtTime(freq, t);
  if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.slideTo), t + dur);
  if (o.detune) osc.detune.value = o.detune;
  const vol = o.vol ?? 0.2;
  const a = o.attack ?? 0.005;
  const r = o.release ?? Math.min(0.12, dur * 0.6);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + a);
  g.gain.setValueAtTime(vol, t + Math.max(a, dur - r));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node: AudioNode = osc;
  if (o.filter) {
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = o.filter;
    osc.connect(f);
    node = f;
  }
  node.connect(g).connect(o.dest ?? sfxBus);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function burst(t: number, dur: number, o: { vol?: number; type?: BiquadFilterType; freq?: number; q?: number; sweepTo?: number; dest?: AudioNode } = {}) {
  if (!ctx) return;
  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.playbackRate.value = 0.8 + Math.random() * 0.4;
  const f = ctx.createBiquadFilter();
  f.type = o.type ?? "bandpass";
  f.frequency.setValueAtTime(o.freq ?? 1200, t);
  if (o.sweepTo) f.frequency.exponentialRampToValueAtTime(o.sweepTo, t + dur);
  f.Q.value = o.q ?? 1;
  const g = ctx.createGain();
  g.gain.setValueAtTime(o.vol ?? 0.3, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(o.dest ?? sfxBus);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.02);
}

// ---------------------------------------------------------------- effects

const lastPlayed = new Map<string, number>();
/** Minimum seconds between two plays of the same effect. */
const COOLDOWN: Record<string, number> = { hit: 0.05, shoot: 0.06, die: 0.05, coin: 0.08, freeze: 0.15, zap: 0.08 };

const SFX = {
  click: (t: number) => tone(880, t, 0.05, { type: "square", vol: 0.08, slideTo: 1200 }),
  summon: (t: number) => {
    [0, 4, 7, 12].forEach((n, i) => tone(hz(72 + n), t + i * 0.045, 0.14, { type: "triangle", vol: 0.16 }));
    burst(t, 0.3, { type: "highpass", freq: 3000, vol: 0.08 });
  },
  merge: (t: number) => {
    [0, 7, 12, 16, 19].forEach((n, i) => tone(hz(76 + n), t + i * 0.05, 0.22, { type: "square", vol: 0.1, filter: 4000 }));
    tone(hz(52), t, 0.3, { type: "sine", vol: 0.25, slideTo: hz(64) });
  },
  powerup: (t: number) => {
    tone(hz(60), t, 0.35, { type: "sawtooth", vol: 0.12, slideTo: hz(84), filter: 3000 });
    [0, 4, 7, 12].forEach((n, i) => tone(hz(84 + n), t + 0.18 + i * 0.04, 0.12, { type: "square", vol: 0.07 }));
  },
  shoot: (t: number, kind: string) => {
    if (kind === "arrow" || kind === "spark") burst(t, 0.08, { type: "highpass", freq: 2500, vol: 0.12 });
    else if (kind === "cannonball") {
      tone(140, t, 0.12, { type: "sine", vol: 0.3, slideTo: 50 });
      burst(t, 0.1, { type: "lowpass", freq: 900, vol: 0.15 });
    } else if (kind === "fireball") burst(t, 0.18, { type: "bandpass", freq: 600, sweepTo: 1800, vol: 0.14 });
    else if (kind === "ice_shard") tone(1800, t, 0.08, { type: "triangle", vol: 0.07, slideTo: 2600 });
    else tone(500, t, 0.1, { type: "triangle", vol: 0.08, slideTo: 900 });
  },
  hit: (t: number, element: string) => {
    if (element === "fire") burst(t, 0.22, { type: "lowpass", freq: 1500, sweepTo: 300, vol: 0.2 });
    else if (element === "ice") {
      tone(2200, t, 0.1, { type: "sine", vol: 0.06 });
      tone(3100, t + 0.02, 0.1, { type: "sine", vol: 0.04 });
    } else if (element === "poison") burst(t, 0.2, { type: "bandpass", freq: 500, q: 6, vol: 0.12 });
    else burst(t, 0.07, { type: "bandpass", freq: 1800, q: 2, vol: 0.14 });
  },
  zap: (t: number) => {
    tone(1200, t, 0.12, { type: "sawtooth", vol: 0.06, slideTo: 200, filter: 5000 });
    burst(t, 0.12, { type: "highpass", freq: 4000, vol: 0.1 });
  },
  die: (t: number) => {
    tone(420, t, 0.12, { type: "square", vol: 0.07, slideTo: 140, filter: 2500 });
    burst(t, 0.08, { type: "lowpass", freq: 1200, vol: 0.08 });
  },
  freeze: (t: number) => [0, 5, 12].forEach((n, i) => tone(hz(91 + n), t + i * 0.03, 0.25, { type: "sine", vol: 0.05 })),
  coin: (t: number) => {
    tone(hz(88), t, 0.06, { type: "square", vol: 0.06 });
    tone(hz(95), t + 0.05, 0.12, { type: "square", vol: 0.06 });
  },
  hurt: (t: number) => {
    tone(220, t, 0.35, { type: "sawtooth", vol: 0.18, slideTo: 70, filter: 1200 });
    burst(t, 0.25, { type: "lowpass", freq: 600, vol: 0.2 });
  },
  wave: (t: number) => {
    // Little brass horn: two notes, fifth up.
    for (const [n, dt, d] of [[60, 0, 0.16], [67, 0.16, 0.35]] as const) {
      tone(hz(n), t + dt, d, { type: "sawtooth", vol: 0.1, filter: 1800, attack: 0.03 });
      tone(hz(n), t + dt, d, { type: "sawtooth", vol: 0.08, filter: 1800, attack: 0.03, detune: 8 });
    }
  },
  boss: (t: number) => {
    for (let i = 0; i < 3; i++) tone(hz(40), t + i * 0.32, 0.3, { type: "sawtooth", vol: 0.16, filter: 700 });
    [45, 48, 52].forEach((n) => tone(hz(n), t + 0.96, 0.9, { type: "sawtooth", vol: 0.08, filter: 1200, attack: 0.05 }));
    tone(80, t, 1.6, { type: "sine", vol: 0.25, slideTo: 40 });
  },
  boss_die: (t: number) => {
    burst(t, 0.9, { type: "lowpass", freq: 2000, sweepTo: 100, vol: 0.35 });
    tone(160, t, 0.8, { type: "sine", vol: 0.3, slideTo: 30 });
    [0, 4, 7, 12, 16].forEach((n, i) => tone(hz(72 + n), t + 0.4 + i * 0.07, 0.25, { type: "square", vol: 0.08 }));
  },
  win: (t: number) =>
    [60, 64, 67, 72, 67, 72, 76].forEach((n, i) => tone(hz(n + 12), t + i * 0.11, i === 6 ? 0.6 : 0.14, { type: "square", vol: 0.1, filter: 4000 })),
  lose: (t: number) => [67, 66, 65, 64].forEach((n, i) => tone(hz(n), t + i * 0.22, i === 3 ? 0.7 : 0.22, { type: "triangle", vol: 0.16 })),
  chest: (t: number) => {
    burst(t, 0.15, { type: "lowpass", freq: 800, vol: 0.2 });
    [0, 4, 7, 11, 12, 16, 19, 24].forEach((n, i) => tone(hz(72 + n), t + 0.15 + i * 0.05, 0.2, { type: "triangle", vol: 0.1 }));
  },
  upgrade: (t: number) => [0, 4, 7, 12].forEach((n, i) => tone(hz(67 + n), t + i * 0.08, 0.2, { type: "square", vol: 0.09, filter: 3500 })),
  error: (t: number) => tone(160, t, 0.18, { type: "square", vol: 0.1, filter: 900 }),
  /** A unit reaches max rank and awakens: shimmer up into a held chord. */
  awaken: (t: number) => {
    burst(t, 0.6, { type: "highpass", freq: 2500, sweepTo: 8000, vol: 0.12 });
    [0, 4, 7, 11, 14, 19].forEach((n, i) => tone(hz(67 + n), t + i * 0.06, 0.9 - i * 0.08, { type: "triangle", vol: 0.09, attack: 0.02 }));
    tone(hz(43), t, 0.9, { type: "sine", vol: 0.25 });
  },
  ultimate: (t: number) => {
    tone(hz(55), t, 0.4, { type: "sawtooth", vol: 0.12, slideTo: hz(79), filter: 2500 });
    burst(t + 0.05, 0.35, { type: "lowpass", freq: 2500, sweepTo: 200, vol: 0.25 });
  },
  /** Hero ability: rising whoosh into a bright major chord. */
  hero: (t: number) => {
    burst(t, 0.45, { type: "bandpass", freq: 400, sweepTo: 4000, q: 2, vol: 0.18 });
    tone(hz(48), t, 0.6, { type: "sawtooth", vol: 0.12, slideTo: hz(60), filter: 1500 });
    [0, 4, 7, 12].forEach((n) => tone(hz(72 + n), t + 0.3, 0.5, { type: "square", vol: 0.06, filter: 3500, attack: 0.02 }));
  },
};

export type SfxName = keyof typeof SFX;

export function sfx(name: SfxName, variant = "") {
  if (!ctx || !settings.sfx || ctx.state !== "running") return;
  const now = ctx.currentTime;
  const cd = COOLDOWN[name];
  if (cd) {
    const key = name + variant;
    if (now - (lastPlayed.get(key) ?? -1) < cd) return;
    lastPlayed.set(key, now);
  }
  SFX[name](now + 0.005, variant);
}

// ---------------------------------------------------------------- music

const _ = -1;
interface Track {
  bpm: number;
  /** Per bar: chord tones (MIDI), bass root (MIDI), 16-step melody (MIDI or _). */
  bars: { chord: number[]; bass: number; melody: number[] }[];
  kick: number[];
  snare: number[];
  hat: number[];
  bassPattern: number[];
  lead: OscillatorType;
  leadVol: number;
  padVol: number;
}

const BATTLE_BARS = [
  { chord: [57, 60, 64], bass: 45, melody: [76, _, _, 74, 72, _, 74, _, 76, _, _, _, 69, _, 72, _] },
  { chord: [53, 57, 60], bass: 41, melody: [77, _, _, 76, 74, _, 72, _, 69, _, _, _, _, _, 72, 74] },
  { chord: [48, 52, 55], bass: 48, melody: [76, _, _, 74, 72, _, _, 67, 72, _, 74, _, 76, _, 79, _] },
  { chord: [55, 59, 62], bass: 43, melody: [79, _, 77, _, 76, _, 74, _, 71, _, _, _, 74, _, _, _] },
  { chord: [57, 60, 64], bass: 45, melody: [81, _, 79, _, 76, _, 74, _, 76, _, 72, _, 69, _, _, _] },
  { chord: [53, 57, 60], bass: 41, melody: [72, _, 74, _, 77, _, 76, 74, 72, _, _, _, 69, _, 72, _] },
  { chord: [55, 59, 62], bass: 43, melody: [74, _, _, 76, 79, _, 77, _, 76, _, 74, _, 71, _, 74, _] },
  { chord: [57, 60, 64], bass: 45, melody: [76, _, _, _, 72, _, 69, _, 69, _, _, _, _, _, _, _] },
];

const TRACKS: Record<Song, Track> = {
  lobby: {
    bpm: 96,
    bars: [
      { chord: [48, 52, 55], bass: 36, melody: [72, _, _, _, 76, _, 74, _, 72, _, _, _, 67, _, _, _] },
      { chord: [45, 48, 52], bass: 33, melody: [69, _, _, _, 72, _, 76, _, 74, _, _, _, _, _, _, _] },
      { chord: [41, 45, 48], bass: 29, melody: [77, _, _, _, 76, _, 74, _, 72, _, _, _, 69, _, _, _] },
      { chord: [43, 47, 50], bass: 31, melody: [71, _, _, _, 74, _, 79, _, 77, _, 76, _, 74, _, _, _] },
    ],
    kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    snare: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    bassPattern: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    lead: "triangle",
    leadVol: 0.16,
    padVol: 0.05,
  },
  battle: {
    bpm: 128,
    bars: BATTLE_BARS,
    kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1],
    bassPattern: [1, 0, 1, 1, 0, 0, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0],
    lead: "square",
    leadVol: 0.09,
    padVol: 0.035,
  },
  boss: {
    bpm: 144,
    // Same tune, a fourth higher and harder-hitting.
    bars: BATTLE_BARS.map((b) => ({ chord: b.chord.map((n) => n + 5), bass: b.bass + 5, melody: b.melody.map((n) => (n === _ ? _ : n + 5)) })),
    kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
    hat: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    bassPattern: [1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1],
    lead: "sawtooth",
    leadVol: 0.07,
    padVol: 0.04,
  },
};

let current: Song | null = null;
let timer: number | undefined;
let step = 0;
let nextTime = 0;

function playStep(track: Track, s: number, t: number) {
  const bar = track.bars[Math.floor(s / 16) % track.bars.length];
  const i = s % 16;
  const sixteenth = 60 / track.bpm / 4;
  const m = musicBus;
  if (track.kick[i]) tone(150, t, 0.16, { type: "sine", vol: 0.55, slideTo: 45, dest: m });
  if (track.snare[i]) burst(t, 0.14, { type: "bandpass", freq: 1800, q: 0.8, vol: 0.28, dest: m });
  if (track.hat[i]) burst(t, 0.04, { type: "highpass", freq: 7000, vol: 0.12, dest: m });
  if (track.bassPattern[i]) tone(hz(bar.bass), t, sixteenth * 1.8, { type: "triangle", vol: 0.32, dest: m });
  const note = bar.melody[i];
  if (note !== _) {
    // Hold the note until the next one (or 4 steps max).
    let len = 1;
    while (len < 4 && bar.melody[i + len] === _ && i + len < 16) len++;
    tone(hz(note), t, sixteenth * len * 0.95, { type: track.lead, vol: track.leadVol, filter: 3500, dest: m });
  }
  if (i === 0) {
    // Soft pad chord for the whole bar.
    for (const n of bar.chord) tone(hz(n + 12), t, sixteenth * 16, { type: "sawtooth", vol: track.padVol, filter: 1100, attack: 0.15, release: 0.3, detune: 6, dest: m });
  }
}

/** Switch the background music (no-op if it's already playing). Pass null to stop. */
export function music(song: Song | null) {
  if (song === current) return;
  current = song;
  if (timer !== undefined) clearInterval(timer);
  timer = undefined;
  if (!song) return;
  const c = init();
  if (!c) return;
  const track = TRACKS[song];
  step = 0;
  nextTime = c.currentTime + 0.1;
  timer = window.setInterval(() => {
    if (!ctx || ctx.state !== "running") {
      nextTime = (ctx?.currentTime ?? 0) + 0.1;
      return;
    }
    const sixteenth = 60 / track.bpm / 4;
    // Schedule a little ahead so timer jitter never causes gaps.
    while (nextTime < ctx.currentTime + 0.15) {
      playStep(track, step, nextTime);
      step++;
      nextTime += sixteenth;
    }
  }, 30);
}

/** "running" once sound is unlocked; useful for debugging. */
export const audioState = () => ctx?.state ?? "not started";
if (import.meta.env.DEV) (window as unknown as { __audio: object }).__audio = { audioState, sfx, music };
