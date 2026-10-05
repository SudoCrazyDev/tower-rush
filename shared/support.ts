/**
 * Support units (v1.1 "Supporting Cast Arrival", docs/features/v1.1-supporting-cast-arrival).
 *
 * They never attack. Each has one job: copy, move, mirror, steer merges, charge or repeat
 * ultimates, reward awakenings, or brew mana. The numbers are in effects.ts (one block per
 * job, editable on the admin Effects page); the rules shared by the solo battle
 * (BattleScene) and the headless Sim (Playground and PvP) are here.
 *
 * Every effect scales with the card level × power-up multiplier (`boostMult`): chances and
 * bonuses are multiplied by it and timers divided by it, each with a cap or a floor.
 */
import { EFFECTS, type Effects } from "./effects.ts";
import type { Arch } from "./units.ts";

export type SupportArch = "mime" | "portal" | "mirror" | "lucky" | "hourglass" | "echo" | "herald" | "brewer";
export const SUPPORT_ARCHS: SupportArch[] = ["mime", "portal", "mirror", "lucky", "hourglass", "echo", "herald", "brewer"];

export const isSupport = (arch: Arch): arch is SupportArch => (SUPPORT_ARCHS as Arch[]).includes(arch);
/** Units with no attack of their own: buff units, support units, Muse's aura and the Aegis Knight. */
export const noAttack = (arch: Arch) => arch === "buff" || arch === "aura" || arch === "aegis" || isSupport(arch);
/** Support units the player drags onto another unit (or, for the Portal Imp, an empty tile). */
export const isActiveSupport = (arch: Arch) => arch === "mime" || arch === "portal";

/** The up-to-four tiles touching tile `i` on the 5×3 board. */
export function neighbours(i: number) {
  const col = i % 5;
  return [i - 5, i + 5, col > 0 ? i - 1 : -1, col < 4 ? i + 1 : -1].filter((j) => j >= 0 && j < 15);
}

const step = (base: number, perRank: number, rank: number) => base + perRank * (rank - 1);

/** Seconds a Mime must stand on the board before it can copy. */
export const mimePrep = (mult = 1, e: Effects = EFFECTS) => Math.max(e.mime.prepMin, e.mime.prep / mult);
/** Portal Imp recharge after a swap or hop. */
export const portalCooldown = (rank: number, mult = 1, e: Effects = EFFECTS) => Math.max(e.portal.cooldownMin, step(e.portal.cooldown, -e.portal.cooldownPerRank, rank) / mult);
/** Seconds between Mirror Slime transformations. */
export const mirrorInterval = (rank: number, mult = 1, e: Effects = EFFECTS) => Math.max(e.mirror.intervalMin, step(e.mirror.interval, -e.mirror.intervalPerRank, rank) / mult);
/** Chance a merge next to the Lucky Cat keeps the unit that went in. */
export const luckyChance = (rank: number, mult = 1, e: Effects = EFFECTS) => Math.min(e.lucky.max, step(e.lucky.chance, e.lucky.perRank, rank) * mult);
/** Hourglass Owl: extra ultimate charge rate for awakened neighbours (0.5 = +50%). */
export const owlCharge = (rank: number, mult = 1, e: Effects = EFFECTS) => Math.min(e.hourglass.chargeMax, step(e.hourglass.charge, e.hourglass.chargePerRank, rank) * mult);
/** Hourglass Owl: attack speed for neighbours that can't fire an ultimate yet. */
export const owlSpeed = (rank: number, mult = 1, e: Effects = EFFECTS) => Math.min(e.hourglass.speedMax, step(e.hourglass.speed, e.hourglass.speedPerRank, rank) * mult);
/** Echo Spirit: share of a neighbour's ultimate it repeats. */
export const echoStrength = (rank: number, mult = 1, e: Effects = EFFECTS) => Math.min(e.echo.max, step(e.echo.strength, e.echo.perRank, rank) * mult);
/** Banner Herald: damage bonus for every attacking unit, for `awakened` awakened units on the board. */
export const heraldBonus = (rank: number, awakened: number, mult = 1, e: Effects = EFFECTS) => Math.min(e.herald.max, step(e.herald.perAwakened, e.herald.perRank, rank) * mult * awakened);
/** Gnome Brewer: mana per brew. */
export const brewMana = (rank: number, mult = 1, e: Effects = EFFECTS) => Math.round(e.brewer.perRank * rank * mult);
/** Gnome Brewer: bonus mana when wave `wave` ends. */
export const harvestMana = (rank: number, wave: number, mult = 1, e: Effects = EFFECTS) => Math.round(e.brewer.harvestPerRank * rank * wave * mult);

/** Whether a Mime or Mirror Slime may turn into `target` (same rank, attacker or buff, not awakened). */
export const canBecome = (self: { rank: number }, target: { rank: number; awakened: boolean; def: { arch: Arch } }) =>
  target.rank === self.rank && !target.awakened && !isSupport(target.def.arch);

const pct = (x: number) => `${Math.round(x * 100)}%`;
const secs = (x: number) => `${+x.toFixed(1)}s`;

/** One line describing a support unit's effect at this rank (card details, admin). */
export function supportSummary(arch: SupportArch, rank: number, e: Effects = EFFECTS, mult = 1): string {
  switch (arch) {
    case "mime":
      return `Drag onto a ★${rank} unit to copy it · ready after ${secs(mimePrep(mult, e))}`;
    case "portal":
      return `Swap with a ★${rank} unit or hop to an empty tile · every ${secs(portalCooldown(rank, mult, e))}`;
    case "mirror":
      return `Turns into a ★${rank} neighbour every ${secs(mirrorInterval(rank, mult, e))}`;
    case "lucky":
      return `${pct(luckyChance(rank, mult, e))} chance a neighbour's merge keeps its unit`;
    case "hourglass":
      return `Neighbours charge ultimates +${pct(owlCharge(rank, mult, e))} (or attack +${pct(owlSpeed(rank, mult, e))} faster)`;
    case "echo":
      return `Repeats a neighbour's ultimate at ${pct(echoStrength(rank, mult, e))} strength`;
    case "herald":
      return `All units +${pct(Math.min(e.herald.max, step(e.herald.perAwakened, e.herald.perRank, rank) * mult))} damage per awakened unit`;
    case "brewer":
      return `+${brewMana(rank, mult, e)} mana every ${secs(e.brewer.every)} · +${harvestMana(rank, 1, mult, e)} × wave at wave end`;
  }
}

/** Short ability text for cards ("Copies a unit of the same rank"). */
export const SUPPORT_TEXT: Record<SupportArch, string> = {
  mime: "Copies a unit of the same rank",
  portal: "Swaps places with a unit of the same rank",
  mirror: "Turns into a neighbour of the same rank",
  lucky: "Neighbours' merges can keep their unit",
  hourglass: "Neighbours charge ultimates faster",
  echo: "Repeats a neighbour's ultimate",
  herald: "Rallies the army for every awakening",
  brewer: "Brews mana, pays a bonus every wave",
};

/** One-time tip the first time each active support unit lands on the board. */
export const SUPPORT_TIP: Partial<Record<SupportArch, string>> = {
  mime: "Drag the Mime onto a unit of the same rank to copy it.",
  portal: "Drag the Portal Imp onto a unit of the same rank to swap them, or onto an empty tile to hop there.",
  mirror: "The Mirror Slime turns into a neighbour of the same rank every so often.",
  lucky: "Merge units next to the Lucky Cat: they may keep their unit instead of rolling a new one.",
  brewer: "The Gnome Brewer makes mana. Tap the bubbles over its pot for a bonus.",
};
