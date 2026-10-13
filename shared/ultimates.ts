/**
 * v2.7: what each unit's own ultimate does (the numbers and text live in shared/awakened.ts).
 *
 * The Sim hands every ultimate a small UltCtx instead of its private state. Ultimates must draw
 * randomness from ctx.rand() only (seeded: PvP lockstep and the golden tests replay exactly).
 */
import type { Path, Pt } from "./path.ts";
import type { SimField, SimMonster, SimUnit, SimEvent } from "./sim.ts";
import { ultOf, type UltDef, type UltId } from "./awakened.ts";

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
}

/** Ultimate event for the renderer. */
function cast(ctx: UltCtx, u: SimUnit, ult: UltDef, x: number, y: number, radius: number, extra: { points?: Pt[]; targets?: number[] } = {}) {
  ctx.emit({ type: "ultimate", t: ctx.now, uid: u.uid, kind: "special", ult: ult.id, x, y, radius, points: extra.points, targets: extra.targets });
  ctx.text(x, y - 70, "#ffd93b", ult.name.toUpperCase());
}

const ids = (ms: SimMonster[]) => ms.map((m) => m.uid);

/** `n` distinct monsters picked at random from `list`. */
function sample(ctx: UltCtx, list: SimMonster[], n: number) {
  const pool = [...list];
  const out: SimMonster[] = [];
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
  if (!all.length) return false;
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
  }
  return false;
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
        ctx.view({ type: "zap", t: ctx.now, kind: "chain", n, x: from.x, y: from.y, x2: m.pos.x, y2: m.pos.y, color: "#fff27a" });
        from = m.pos;
        ctx.applyHit(u, damage * p.damage, m);
      });
      return false;
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
