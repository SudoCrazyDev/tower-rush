/** League badges and the leagues list (opened from the badge in the top bar). */
import Phaser from "phaser";
import { leaguesByTrophies, nextLeague, playerLeague, societyInvite, MYSTERY_ICON, type LeagueDef } from "../../../shared/leagues.ts";
import { joinSociety, profile } from "../save";
import { txt, modal, button, fitImage, NAVY, H, fmt } from "../ui";
import { checkMark, rewardIcon } from "./daily";

const colorOf = (l: LeagueDef) => Phaser.Display.Color.HexStringToColor(l.color).color;
/** `a` blended toward `b` by t (0..1), for league-tinted panels. */
const mix = (a: number, b: number, t: number) => {
  const c = Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.ValueToColor(a), Phaser.Display.Color.ValueToColor(b), 100, t * 100);
  return Phaser.Display.Color.GetColor(c.r, c.g, c.b);
};
/**
 * The league badge's own left wing (the outer 30% of its art), cut once into a `wing` frame.
 * Returns the pair for a row's two ends, or null when the badge art isn't loaded.
 */
function badgeWings(scene: Phaser.Scene, left: number, right: number, y: number, h: number, l: LeagueDef) {
  const key = `league:${l.icon}`;
  if (!scene.textures.exists(key)) return null;
  const tex = scene.textures.get(key);
  const src = tex.getSourceImage() as HTMLImageElement;
  if (!tex.has("wing")) {
    tex.add("wing", 0, 0, src.height * 0.12, src.width * 0.3, src.height * 0.7);
    // The first added frame would otherwise become the texture's default, cropping every badge.
    tex.firstFrame = "__BASE";
  }
  const tuck = 4; // how far the wing's root hides behind the row
  const make = (x: number, flip: boolean) => {
    const img = scene.add.image(x, y, key, "wing").setOrigin(flip ? 0 : 1, 0.5).setFlipX(flip);
    return img.setScale((h * 1.45) / img.height);
  };
  const lw = make(left + tuck, false);
  const rw = make(right - tuck, true);
  // Keep the shield's edge, if any made it into the cut, under the row.
  lw.x += lw.displayWidth * 0.06;
  rw.x -= rw.displayWidth * 0.06;
  return [lw, rw];
}

/**
 * Three feathers fanning out of a row's end (side -1 = left, 1 = right), in the league's colour
 * with the badge art's navy outline. Drawn under the row so their roots tuck behind it.
 */
function rowWings(g: Phaser.GameObjects.Graphics, x: number, y: number, h: number, color: number, side: number) {
  const feathers = [
    { a: 34, len: h * 0.95, off: -h * 0.22, c: mix(color, 0xffffff, 0.4) },
    { a: 8, len: h * 0.85, off: 0, c: mix(color, 0xffffff, 0.15) },
    { a: -20, len: h * 0.66, off: h * 0.22, c: mix(color, 0x0a0d24, 0.2) },
  ];
  const w = h * 0.3;
  for (const pass of [0, 1])
    for (const f of feathers) {
      const r = Phaser.Math.DegToRad(f.a);
      const dx = side * Math.cos(r);
      const dy = -Math.sin(r);
      const bx = x - side * 20;
      const by = y + f.off;
      const pt = (along: number, across: number) => ({ x: bx + dx * along - dy * across, y: by + dy * along + dx * across });
      const pts = [pt(0, -w / 2), pt(f.len * 0.55, -w * 0.55), pt(f.len, 0), pt(f.len * 0.55, w * 0.55), pt(0, w / 2)];
      // Outlines first, so a feather's outline never covers its neighbour's fill.
      if (pass === 0) g.lineStyle(6, 0x0a0d24, 1).strokePoints(pts, true);
      else g.fillStyle(f.c, 1).fillPoints(pts, true);
    }
  return g;
}

/** A rounded panel filled in a league's colour: deep tint below, lighter band on top, bright rim. */
function tintPanel(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, r: number, color: number, strength: number) {
  g.fillStyle(mix(0x0a0d24, color, strength * 0.75), 1).fillRoundedRect(x, y, w, h, r);
  g.fillStyle(mix(0x0a0d24, color, strength), 1).fillRoundedRect(x, y, w, h * 0.55, { tl: r, tr: r, bl: 0, br: 0 });
  g.fillStyle(0xffffff, 0.08).fillRoundedRect(x + 6, y + 4, w - 12, h * 0.22, r * 0.6);
  return g;
}

/** A society league the player isn't in: shown as "???" (v2.9). */
const hiddenFromMe = (l: LeagueDef) => !!l.society && profile.society?.league !== l.id;

/**
 * A league's badge, `size` px tall: its icon from the league_ranks atlas, or a shield in the
 * league colour when the art isn't there (e.g. an icon number past the end of the atlas).
 * `hidden` shows the "???" badge of an invite-only league instead.
 */
export function leagueBadge(scene: Phaser.Scene, x: number, y: number, size: number, l: LeagueDef, hidden = false) {
  const c = scene.add.container(x, y);
  c.setSize(size, size);
  const key = `league:${hidden ? MYSTERY_ICON : l.icon}`;
  if (scene.textures.exists(key)) {
    const img = scene.add.image(0, 0, key);
    img.setScale(size / Math.max(img.width, img.height));
    c.add(img);
    return c;
  }
  const shield = (s: number) => [
    { x: 0, y: -s },
    { x: s * 0.85, y: -s * 0.62 },
    { x: s * 0.78, y: s * 0.2 },
    { x: 0, y: s },
    { x: -s * 0.78, y: s * 0.2 },
    { x: -s * 0.85, y: -s * 0.62 },
  ];
  const r = size / 2;
  const g = scene.add.graphics();
  g.fillStyle(NAVY, 1).fillPoints(shield(r), true);
  g.fillStyle(hidden ? 0x2a2440 : colorOf(l), 1).fillPoints(shield(r * 0.8), true);
  g.fillStyle(0xffffff, 0.25).fillPoints(shield(r * 0.5), true);
  c.add([g, txt(scene, 0, -size * 0.02, hidden ? "?" : l.name.charAt(0).toUpperCase(), Math.round(size * 0.42))]);
  return c;
}

/** The player's current league with progress to the next, and every league's promotion reward. */
export function leagueModal(scene: Phaser.Scene) {
  const all = leaguesByTrophies();
  const w = 720;
  const h = Math.min(H - 110, 1270);
  const m = modal(scene, w, h, "LEAGUES", () => {});
  const { cx, cy } = m;
  const top = cy - h / 2;
  const cur = playerLeague(profile);
  const next = nextLeague(profile.trophies);
  // Rows stay clear of the frame's side gems (they poke ~40 px into the panel).
  const rowW = w - 160;

  // Current league and progress toward the next one, on its own card under the title ribbon.
  const card = scene.add.graphics();
  const cardTop = top + 108;
  tintPanel(card, cx - rowW / 2, cardTop, rowW, 186, 24, colorOf(cur), 0.5);
  card.lineStyle(4, mix(colorOf(cur), 0xffffff, 0.35), 1).strokeRoundedRect(cx - rowW / 2, cardTop, rowW, 186, 24);
  m.add(card);
  m.add(leagueBadge(scene, cx - rowW / 2 + 92, cardTop + 93, 140, cur));
  const tx = cx - rowW / 2 + 180;
  const bw = rowW - 200;
  m.add(txt(scene, tx, cardTop + 40, cur.name, 36, "#ffffff", [0, 0.5]));
  m.add(scene.add.image(tx + 18, cardTop + 86, "item:trophy").setDisplaySize(36, 36));
  m.add(txt(scene, tx + 44, cardTop + 86, profile.trophies.toLocaleString(), 30, "#ffd93b", [0, 0.5]));
  if (next) m.add(txt(scene, tx + bw, cardTop + 88, `next: ${next.name.replace(" League", "")}`, 20, "#e6e9ff", [1, 0.5]));
  const bar = scene.add.graphics();
  const p = next ? Math.min(1, Math.max(0, (profile.trophies - cur.trophies) / (next.trophies - cur.trophies))) : 1;
  bar.fillStyle(0x0a0d24, 1).fillRoundedRect(tx, cardTop + 116, bw, 30, 15);
  bar.lineStyle(2, 0x2a3270, 1).strokeRoundedRect(tx, cardTop + 116, bw, 30, 15);
  bar.fillStyle(next ? 0x3d8bff : 0x59d64a, 1).fillRoundedRect(tx + 2, cardTop + 118, Math.max(26, (bw - 4) * p), 26, 13);
  bar.fillStyle(0xffffff, 0.22).fillRoundedRect(tx + 6, cardTop + 120, Math.max(16, (bw - 12) * p), 8, 4);
  m.add(bar);
  m.add(txt(scene, tx + bw / 2, cardTop + 131, next ? `${fmt(profile.trophies)} / ${fmt(next.trophies)}` : "Top league!", 20));
  m.add(
    txt(scene, tx, cardTop + 166, next ? `${(next.trophies - profile.trophies).toLocaleString()} more trophies to promote` : "You've reached the highest league.", 20, "#e6e9ff", [0, 0.5]),
  );
  // v2.9: this league's trophy rules for solo runs (and the Society's dues for its members).
  const s = profile.society && cur.society && profile.society.league === cur.id ? cur.society : null;
  const rules = s
    ? `Dues: ${fmt(s.duesCoins)} gold + ${fmt(s.duesGems)} gems, next on ${new Date(profile.society!.paidUntil).toLocaleDateString()}`
    : `Reach wave ${cur.minWave} to win trophies; fall short and you lose them`;
  m.add(txt(scene, cx, cardTop + 214, rules, 20, "#ffd27a"));

  // Every league, highest first, with its promotion reward. The footer sits above the frame's bottom rim.
  const footY = top + h - 84;
  const listTop = cardTop + 240;
  const step = Math.min(96, (footY - 24 - listTop) / Math.max(1, all.length));
  const rowH = step - 8;
  const left = cx - rowW / 2;
  const right = cx + rowW / 2;
  [...all].reverse().forEach((l, i) => {
    const y = listTop + step / 2 + i * step;
    const here = l.id === cur.id;
    const hidden = hiddenFromMe(l);
    const reached = l.trophies <= profile.trophies && !hidden;
    const art = here && badgeWings(scene, cx - rowW / 2, cx + rowW / 2, y, rowH, l);
    if (art) m.add(art);
    else if (here) {
      const wings = scene.add.graphics();
      rowWings(wings, cx - rowW / 2, y, rowH, colorOf(l), -1);
      rowWings(wings, cx + rowW / 2, y, rowH, colorOf(l), 1);
      m.add(wings);
    }
    const g = scene.add.graphics();
    // The whole row in the league's colour: full strength once reached, muted above.
    const tint = hidden ? 0x4a3f6b : colorOf(l);
    tintPanel(g, left, y - rowH / 2, rowW, rowH, 16, tint, here ? 0.62 : reached ? 0.5 : 0.24);
    // Your league: a bright rim in its own colour over a navy outline, like the badge art.
    if (here) {
      g.lineStyle(9, 0x0a0d24, 1).strokeRoundedRect(left, y - rowH / 2, rowW, rowH, 16);
      g.lineStyle(5, mix(tint, 0xffffff, 0.3), 1).strokeRoundedRect(left, y - rowH / 2, rowW, rowH, 16);
    } else g.lineStyle(2, mix(tint, 0xffffff, 0.2), reached ? 0.9 : 0.4).strokeRoundedRect(left, y - rowH / 2, rowW, rowH, 16);
    m.add(g);
    const badge = leagueBadge(scene, left + 50, y, rowH * 0.9, l, hidden);
    if (!reached && !here) badge.setAlpha(0.6);
    m.add(badge);
    const nameY = y - rowH * 0.2;
    m.add(txt(scene, left + 96, nameY, hidden ? "???" : l.name, Math.min(28, rowH * 0.36), reached ? "#ffffff" : "#c3c9e6", [0, 0.5]));
    const gate = hidden ? "By invitation only" : l.trophies ? `${fmt(l.trophies)}+ trophies · wave ${l.minWave}` : `Starting league · wave ${l.minWave}`;
    m.add(txt(scene, left + 96, y + rowH * 0.22, gate, Math.min(19, rowH * 0.26), reached ? "#e6e9ff" : "#9aa3c9", [0, 0.5]));
    if (hidden) {
      // An invitation the player put off ("Not now") can be opened again here.
      if (societyInvite(profile)?.id === l.id)
        m.add(button(scene, right - 105, y, 180, Math.min(64, rowH - 10), "INVITATION", "yellow", () => {
          societyInvitation(scene, (joined) => {
            if (!joined) return;
            m.destroy();
            leagueModal(scene);
          }, true);
        }, 22));
      return;
    }
    // Promotion reward (paid once, the first time the league is reached): chest, then gold and gems.
    const r = l.reward;
    if (!l.trophies || (!r.coins && !r.gems && !r.chest)) {
      if (!l.trophies) m.add(txt(scene, right - 30, y, "Start here", 18, "#8a93bd", [1, 0.5]));
      return;
    }
    const paid = profile.leagues.includes(l.id);
    const dim = paid ? 0.5 : 1;
    const ix = right - 205;
    if (r.chest) {
      const chest = scene.add.image(ix, y, rewardIcon(r)).setAlpha(dim);
      m.add(fitImage(chest, rowH * 0.78));
    }
    const amounts = [r.coins && (["item:coins", fmt(r.coins)] as const), r.gems && (["item:gems", fmt(r.gems)] as const)].filter(Boolean) as (readonly [string, string])[];
    const ax = ix + 46;
    amounts.forEach(([key, n], k) => {
      const ay = y + (amounts.length === 1 ? 0 : k === 0 ? -rowH * 0.2 : rowH * 0.2);
      m.add(scene.add.image(ax + 12, ay, key).setDisplaySize(24, 24).setAlpha(dim));
      m.add(txt(scene, ax + 30, ay, `+${n}`, Math.min(21, rowH * 0.28), paid ? "#9aa3c9" : "#ffd93b", [0, 0.5]));
    });
    if (paid) m.add(checkMark(scene, right - 32, y, 34));
    // Reached before leagues paid rewards (or by an admin edit): it comes with the next battle.
    else if (reached) m.add(txt(scene, right - 18, y, "next\nbattle", 15, "#7dff7a", [1, 0.5]).setAlign("right"));
  });
  m.add(txt(scene, cx, footY, "Promotion rewards are paid once, the first time you reach a league.", 18, "#8f9ad0"));
  return m;
}

/** Shown by itself once per session; after "Not now" it stays open from the leagues list. */
let invitationSeen = false;

/**
 * v2.9: the Secret Society's invitation, shown when the player meets every requirement.
 * Accepting pays the entry fee; `done` runs after (true when they joined).
 */
export function societyInvitation(scene: Phaser.Scene, done: (joined: boolean) => void = () => {}, force = false) {
  const l = societyInvite(profile);
  if (!l?.society || (invitationSeen && !force)) return false;
  invitationSeen = true;
  const s = l.society;
  const m = modal(scene, 640, 860, "", () => done(false));
  const { cx, cy } = m;
  m.add(leagueBadge(scene, cx, cy - 270, 170, l, true));
  m.add(txt(scene, cx, cy - 145, "YOU HAVE BEEN RECRUITED", 36, "#d4af37"));
  m.add(
    txt(scene, cx, cy - 50, `A sealed letter arrives at your keep. The ${l.name} has watched your rise and offers you a seat among its members.`, 24, "#e6e9ff").setWordWrapWidth(540).setAlign("center"),
  );
  m.add(txt(scene, cx, cy + 50, `Entry: ${fmt(s.entryCoins)} gold + ${fmt(s.entryGems)} gems`, 26, "#ffd93b"));
  m.add(txt(scene, cx, cy + 92, `Dues: ${fmt(s.duesCoins)} gold + ${fmt(s.duesGems)} gems every ${s.duesDays} days`, 22, "#c9d2ff"));
  m.add(txt(scene, cx, cy + 128, `Miss the dues or drop below ${fmt(l.trophies)} trophies and you're out.`, 20, "#8f9ad0"));
  const status = txt(scene, cx, cy + 172, "", 22, "#ff8080");
  m.add(status);
  m.add(
    button(scene, cx, cy + 250, 380, 100, "JOIN THE SOCIETY", "yellow", () => {
      status.setText("Sealing the pact...").setColor("#c9d2ff");
      joinSociety().then(
        () => {
          m.destroy();
          done(true);
        },
        (e: Error) => status.setText(e.message || "Couldn't join (no connection)").setColor("#ff8080"),
      );
    }),
  );
  m.add(
    button(scene, cx, cy + 360, 300, 80, "NOT NOW", "blue", () => {
      m.destroy();
      done(false);
    }),
  );
  return true;
}
