/**
 * v2.7: what each unit's own ultimate does (the numbers and text live in shared/awakened.ts).
 *
 * The Sim hands every ultimate a small UltCtx instead of its private state. Ultimates must draw
 * randomness from ctx.rand() only (seeded: PvP lockstep and the golden tests replay exactly).
 */
import type { Path, Pt } from "./path.ts";
import type { SimField, SimMonster, SimUnit, SimEvent } from "./sim.ts";
import { ULTIMATES, ultOf, type UltDef, type UltId } from "./awakened.ts";

/** Grace of Mjolnir's chain colour: the client draws these zaps as hammer bolts. */
export const MJOLNIR_COLOR = "#fff6b0";

export interface UltCtx {
  readonly now: number;
  rand(): number;
  /** The board's monster paths. */
  readonly paths: Path[];
  /** Monsters units may target right now (as Sim.pickTarget), in board order. */
  targets(): SimMonster[];
  pick(mode: "first" | "strongest"): SimMonster | null;
  /** Live, hittable monsters within `radius` of `center`. */
  nearby(center: Pt, radius: number, except?: SimMonster): SimMonster[];
  /** The unit's hit damage right now (stats, hero, Herald, Muse aura). */
  hitDamage(u: SimUnit): number;
  /** Raw damage to one monster from the unit (its perks apply; `plunder` multiplies Plunder mana). */
  hurt(u: SimUnit, m: SimMonster, amount: number, opts?: { crit?: boolean; plunder?: number }): void;
  /** A normal homing shot from the unit (lands like any of its attacks: kit riders apply). */
  shoot(u: SimUnit, target: SimMonster, damage: number): void;
  /** The unit's attack landing on `m` at once (kit riders apply). */
  applyHit(u: SimUnit, damage: number, m: SimMonster): void;
  /** Up to `jumps` more monsters, each the nearest within chain range of the last, skipping `skip`. */
  chainOn(first: SimMonster, skip: SimMonster[], jumps: number): SimMonster[];
  burn(u: SimUnit, m: SimMonster, dps: number, time: number): void;
  emit(e: SimEvent): void;
  view(e: SimEvent): void;
  text(x: number, y: number, color: string, text: string): void;
  ring(x: number, y: number, color: string, radius: number): void;
  /** Leave something on the path (see SimField). */
  field(kind: SimField["kind"], u: SimUnit, path: Path, dist: number, o: { radius: number; until: number; dps: number; readyAt?: number }): void;
  /** Scorched Earth: every monster burns at `dps` for `time` seconds (new ones too). */
  scorch(u: SimUnit, dps: number, time: number): void;
  /** Frozen Fields: every monster is slowed by `slow` for `time` seconds (new ones too). */
  frost(slow: number, time: number): void;
  /** Units on the board that attack (no supports, buffers or units that never attack themselves). */
  units(): SimUnit[];
}

/** Ultimate event for the renderer. */
function cast(ctx: UltCtx, u: SimUnit, ult: UltDef, x: number, y: number, radius: number, extra: { points?: Pt[]; targets?: number[] } = {}) {
  ctx.emit({ type: "ultimate", t: ctx.now, uid: u.uid, kind: "special", ult: ult.id, x, y, radius, points: extra.points, targets: extra.targets });
  ctx.text(x, y - 70, "#ffd93b", ult.name.toUpperCase());
}

const ids = (ms: SimMonster[]) => ms.map((m) => m.uid);

/** `n` distinct monsters picked at random from `list`. */
function sample<T>(ctx: UltCtx, list: T[], n: number): T[] {
  const pool = [...list];
  const out: T[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(ctx.rand() * pool.length), 1)[0]);
  return out;
}

/** Point `dist` px along a monster's path (clamped to the path), raised like SimMonster.pos. */
const along = (m: SimMonster, dist: number): Pt => {
  const p = m.path.at(Math.max(0, Math.min(m.path.length, dist)));
  return { x: p.x, y: p.y - 30 };
};

/**
 * Cast a timer ultimate. `scale` multiplies its damage (1, or an Echo Spirit's strength).
 * False when there was nothing to cast it on (the unit keeps its charge).
 */
export function castUltimate(ctx: UltCtx, u: SimUnit, scale: number): boolean {
  const ult = ultOf(u.def.id);
  if (!ult || ult.mode !== "timer") return false;
  const p = ult.params;
  const hit = ctx.hitDamage(u) * scale;
  const all = ctx.targets();
  // Big Ben needs no monsters: it goes off between waves too.
  if (!all.length && ult.id !== "big_ben") return false;
  switch (ult.id as UltId) {
    case "burning_spear": {
      const front = [...all].sort((a, b) => b.progress - a.progress).slice(0, p.targets);
      cast(ctx, u, ult, front[0].pos.x, front[0].pos.y, 0, { points: front.map((m) => m.pos), targets: ids(front) });
      for (const m of front) {
        ctx.hurt(u, m, hit * p.damage);
        ctx.burn(u, m, hit * p.burnDps, p.burnTime);
      }
      return true;
    }
    case "bomberman": {
      const points: Pt[] = [];
      for (let i = 0; i < p.bombs; i++) {
        const m = all[Math.floor(ctx.rand() * all.length)];
        points.push(along(m, m.dist + (ctx.rand() * 2 - 1) * p.spread));
      }
      cast(ctx, u, ult, points[0].x, points[0].y, p.radius, { points });
      for (const pt of points) {
        ctx.ring(pt.x, pt.y, "#ff8a3b", p.radius);
        for (const m of ctx.nearby(pt, p.radius)) ctx.hurt(u, m, hit * p.damage);
      }
      return true;
    }
    case "wisp": {
      const picked = sample(ctx, all, p.targets);
      cast(ctx, u, ult, u.x, u.y, 0, { points: picked.map((m) => m.pos), targets: ids(picked) });
      for (const m of picked) ctx.burn(u, m, hit * p.burnDps, p.burnTime);
      return true;
    }
    case "primal_roar": {
      const now = ctx.now;
      const hits = all.filter((m) => now >= m.roarImmuneUntil);
      if (!hits.length) return false;
      cast(ctx, u, ult, u.x, u.y, 0, { targets: ids(hits) });
      for (const m of hits) {
        const t = m.boss ? p.bossStun : p.stun;
        m.stunUntil = Math.max(m.stunUntil, now + t);
        m.roarImmuneUntil = now + t + p.immune;
        ctx.view({ type: "proc", t: now, kind: "stun", x: m.pos.x, y: m.pos.y - 30 });
      }
      return true;
    }
    case "broadside": {
      const front = [...all].sort((a, b) => b.progress - a.progress)[0];
      const points = Array.from({ length: p.balls }, (_, i) => along(front, front.dist - i * p.spacing));
      cast(ctx, u, ult, points[0].x, points[0].y, p.radius, { points });
      for (const pt of points) {
        ctx.ring(pt.x, pt.y, "#ff8a3b", p.radius);
        for (const m of ctx.nearby(pt, p.radius)) ctx.hurt(u, m, hit * p.damage, { plunder: p.plunder });
      }
      return true;
    }
    case "scorched_earth": {
      cast(ctx, u, ult, u.x, u.y, 0, { targets: ids(all) });
      ctx.scorch(u, hit * p.burnDps, p.duration);
      return true;
    }
    case "winter_storm": {
      const now = ctx.now;
      const frozen = sample(ctx, all, p.freezes);
      cast(ctx, u, ult, u.x, u.y, 0, { targets: ids(frozen), points: frozen.map((m) => m.pos) });
      for (const m of all) {
        m.slowPct = Math.max(m.slowUntil > now ? m.slowPct : 0, p.slow);
        m.slowUntil = Math.max(m.slowUntil, now + p.slowTime);
      }
      for (const m of frozen) {
        m.frozenUntil = Math.max(m.frozenUntil, now + (m.boss ? p.bossFreeze : p.freeze));
        ctx.view({ type: "proc", t: now, kind: "frozen", x: m.pos.x, y: m.pos.y - 30 });
      }
      return true;
    }
    case "overheat": {
      cast(ctx, u, ult, u.x, u.y, 0);
      u.overheatUntil = ctx.now + p.duration;
      u.jamUntil = ctx.now + p.duration + p.jam;
      return true;
    }
    case "rag_doll": {
      const points: Pt[] = [];
      const per = Math.ceil(p.dolls / ctx.paths.length);
      for (let i = 0; i < p.dolls; i++) {
        const path = ctx.paths[i % ctx.paths.length];
        const dist = (path.length * (Math.floor(i / ctx.paths.length) + 1)) / (per + 1);
        ctx.field("doll", u, path, dist, { radius: p.radius, until: ctx.now + p.duration, dps: hit * p.dps });
        points.push(path.at(dist));
      }
      cast(ctx, u, ult, points[0].x, points[0].y, p.radius, { points });
      return true;
    }
    case "judgment_slam": {
      const target = [...all].sort((a, b) => b.hp - a.hp)[0];
      const c = target.pos;
      cast(ctx, u, ult, c.x, c.y, p.radius, { targets: [target.uid] });
      ctx.ring(c.x, c.y, "#ff7ad9", p.radius);
      // The curse lands first, so the slam itself is judged too.
      for (const m of ctx.nearby(c, p.radius)) {
        m.judged = Math.max(m.judgedUntil > ctx.now ? m.judged : 0, p.curse);
        m.judgedUntil = ctx.now + p.curseTime;
      }
      ctx.hurt(u, target, hit * p.damage, { crit: true });
      return true;
    }
    case "crystal_throw": {
      // The crystal lands on the monster with the most company around it.
      let best = all[0];
      let most = -1;
      for (const m of all) {
        const n = ctx.nearby(m.pos, p.radius).length;
        if (n > most) [best, most] = [m, n];
      }
      const c = best.pos;
      const hits = ctx.nearby(c, p.radius);
      cast(ctx, u, ult, c.x, c.y, p.radius, { points: [c], targets: ids(hits) });
      ctx.ring(c.x, c.y, "#b58cff", p.radius);
      for (const m of hits) ctx.hurt(u, m, hit * p.damage);
      return true;
    }
    case "moonshine": {
      const now = ctx.now;
      const blessed = sample(ctx, ctx.units(), p.targets);
      if (!blessed.length) return false;
      cast(ctx, u, ult, u.x, u.y, 0, { points: blessed.map((v) => ({ x: v.x, y: v.y })), targets: blessed.map((v) => v.uid) });
      for (const v of blessed) v.blessings.push(now + p.duration);
      return true;
    }
    case "reborn": {
      // It waits (fully charged) until a monster gets deep into the path.
      if (!all.some((m) => m.progress >= p.at)) return false;
      cast(ctx, u, ult, u.x, u.y, 0);
      u.eggUntil = ctx.now + p.egg;
      ctx.scorch(u, hit * p.burnDps, p.egg);
      return true;
    }
    case "shadow_clones": {
      cast(ctx, u, ult, u.x, u.y, 0);
      u.clonesUntil = ctx.now + p.duration;
      return true;
    }
    case "hunting_storm": {
      const now = ctx.now;
      const fast = [...all].sort((a, b) => b.baseSpeed - a.baseSpeed || b.progress - a.progress).slice(0, p.bolts);
      cast(ctx, u, ult, fast[0].pos.x, fast[0].pos.y, 0, { points: fast.map((m) => m.pos), targets: ids(fast) });
      for (const m of fast) {
        // Shock shares the Judgment Slam curse (the stronger one wins).
        m.judged = Math.max(m.judgedUntil > now ? m.judged : 0, p.shock);
        m.judgedUntil = Math.max(m.judgedUntil, now + p.shockTime);
        ctx.hurt(u, m, hit * p.damage);
      }
      return true;
    }
    case "forest_grasp": {
      const now = ctx.now;
      const big = [...all].sort((a, b) => b.hp - a.hp).slice(0, p.targets);
      cast(ctx, u, ult, big[0].pos.x, big[0].pos.y, 0, { points: big.map((m) => m.pos), targets: ids(big) });
      for (const m of big) {
        m.stunUntil = Math.max(m.stunUntil, now + (m.boss ? p.bossHold : p.hold));
        ctx.view({ type: "proc", t: now, kind: "stun", x: m.pos.x, y: m.pos.y - 30 });
        ctx.hurt(u, m, hit * p.damage);
      }
      return true;
    }
    case "tidal_wave": {
      const now = ctx.now;
      cast(ctx, u, ult, u.x, u.y, 0, { targets: ids(all) });
      for (const m of all) {
        if (m.pinned === null) m.dist = Math.max(0, m.dist - (m.boss ? p.bossPush : p.push));
        m.slowPct = Math.max(m.slowUntil > now ? m.slowPct : 0, p.slow);
        m.slowUntil = Math.max(m.slowUntil, now + p.slowTime);
        ctx.hurt(u, m, hit * p.damage);
      }
      return true;
    }
    case "frozen_fields": {
      const now = ctx.now;
      cast(ctx, u, ult, u.x, u.y, 0, { targets: ids(all) });
      for (const m of all) {
        m.frozenUntil = Math.max(m.frozenUntil, now + (m.boss ? p.bossFreeze : p.freeze));
        ctx.view({ type: "proc", t: now, kind: "frozen", x: m.pos.x, y: m.pos.y - 30 });
      }
      ctx.frost(p.slow, p.duration);
      u.frostUntil = now + p.duration;
      return true;
    }
    case "black_hole": {
      // The first hole opens on the thickest crowd, the next on the thickest crowd clear of it;
      // with too few monsters, the rest open ahead of the leader.
      const until = ctx.now + p.duration;
      const points: Pt[] = [];
      let left = all;
      while (points.length < p.holes && left.length) {
        let best = left[0];
        let most = -1;
        for (const m of left) {
          const n = ctx.nearby(m.pos, p.radius).length;
          if (n > most) [best, most] = [m, n];
        }
        ctx.field("blackhole", u, best.path, best.dist, { radius: p.radius, until, dps: 0 });
        points.push(best.path.at(best.dist));
        const c = best.pos;
        left = left.filter((m) => Math.hypot(m.pos.x - c.x, m.pos.y - c.y) > p.radius * 2);
      }
      const front = [...all].sort((a, b) => b.progress - a.progress)[0];
      for (let k = 1; points.length < p.holes; k++) {
        const d = Math.min(front.path.length * 0.95, front.dist + p.radius * 2 * k);
        ctx.field("blackhole", u, front.path, d, { radius: p.radius, until, dps: 0 });
        points.push(front.path.at(d));
      }
      cast(ctx, u, ult, points[0].x, points[0].y, p.radius, { points });
      return true;
    }
    case "big_ben": {
      const picked = sample(ctx, ctx.units().filter((v) => v !== u), p.targets);
      if (!picked.length) return false;
      cast(ctx, u, ult, u.x, u.y, 0, { points: picked.map((v) => ({ x: v.x, y: v.y })), targets: picked.map((v) => v.uid) });
      for (const v of picked) v.benUntil = ctx.now + p.duration;
      return true;
    }
  }
  return false;
}

/** Reborn (Phoenix Chick): the egg hatches and stuns every monster. */
export function hatchReborn(ctx: UltCtx, u: SimUnit) {
  const ult = ULTIMATES.reborn;
  const p = ult.params;
  const now = ctx.now;
  const all = ctx.targets();
  ctx.emit({ type: "ultimate", t: now, uid: u.uid, kind: "special", ult: "reborn", x: u.x, y: u.y, radius: 1, targets: ids(all) });
  ctx.text(u.x, u.y - 70, "#ffb35c", "REBORN!");
  for (const m of all) {
    m.stunUntil = Math.max(m.stunUntil, now + (m.boss ? p.bossStun : p.stun));
    ctx.view({ type: "proc", t: now, kind: "stun", x: m.pos.x, y: m.pos.y - 30 });
  }
}

/**
 * A passive ultimate on one attack (the unit already rolled irritation and computed `damage`).
 * True when it replaced the attack (the Sim fires nothing else).
 */
export function ultimateAttack(ctx: UltCtx, u: SimUnit, target: SimMonster, damage: number): boolean {
  const ult = ultOf(u.def.id);
  if (!ult || ult.mode !== "passive") return false;
  const p = ult.params;
  switch (ult.id as UltId) {
    case "multi_shot": {
      const others = ctx
        .targets()
        .filter((m) => m !== target)
        .sort((a, b) => b.progress - a.progress)
        .slice(0, p.arrows - 1);
      for (const m of [target, ...others]) ctx.shoot(u, m, damage * p.damage);
      return true;
    }
    case "mjolnir": {
      let from: Pt = target.pos;
      ctx.chainOn(target, [target], p.jumps).forEach((m, n) => {
        ctx.view({ type: "zap", t: ctx.now, kind: "chain", n, x: from.x, y: from.y, x2: m.pos.x, y2: m.pos.y, color: MJOLNIR_COLOR });
        from = m.pos;
        ctx.applyHit(u, damage * p.damage, m);
      });
      return false;
    }
    case "black_plague": {
      // The flask never aims at a monster: each one lands on a random spot of the stretch of path
      // the monsters are walking (from the last one to just ahead of the first).
      const n = Math.min(p.max, 1 + Math.floor(u.kills / p.per));
      const points: Pt[] = [];
      const walkers = ctx.targets();
      for (let i = 0; i < n; i++) {
        const path = walkers.length ? walkers[Math.floor(ctx.rand() * walkers.length)].path : ctx.paths[0];
        const on = walkers.filter((m) => m.path === path).map((m) => m.dist);
        const lo = on.length ? Math.max(0, Math.min(...on) - p.radius) : 0;
        const hi = on.length ? Math.min(path.length, Math.max(...on) + p.radius) : path.length;
        const dist = lo + ctx.rand() * (hi - lo);
        ctx.field("plague", u, path, dist, { radius: p.radius, until: ctx.now + p.duration, dps: damage * p.dps });
        points.push(path.at(dist));
      }
      ctx.emit({ type: "ultimate", t: ctx.now, uid: u.uid, kind: "special", ult: "black_plague", x: points[0].x, y: points[0].y, radius: p.radius, points });
      return true;
    }
    case "tesla_coil": {
      const all = ctx.targets();
      const first = all[Math.floor(ctx.rand() * all.length)];
      if (!first) return false;
      const chain = [first, ...ctx.chainOn(first, [first], p.jumps)];
      let from: Pt = { x: u.x, y: u.y - 40 };
      chain.forEach((m, n) => {
        ctx.view({ type: "zap", t: ctx.now, kind: "storm", n, x: from.x, y: from.y, x2: m.pos.x, y2: m.pos.y, color: "#9ff0ff" });
        from = m.pos;
        ctx.applyHit(u, damage * p.damage, m);
      });
      return false;
    }
  }
  return false;
}
