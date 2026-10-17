/** League badges and the leagues list (opened from the badge in the top bar). */
import Phaser from "phaser";
import { leaguesByTrophies, nextLeague, playerLeague, societyInvite, MYSTERY_ICON, type LeagueDef } from "../../../shared/leagues.ts";
import { account, getLeagueTop, joinSociety, profile, type LeagueTop } from "../save";
import { RES } from "../display";
import { sfx } from "../audio";
import { avatarView } from "../avatars";
import { openProfile } from "./profileView";
import { txt, modal, button, fitImage, NAVY, H, fmt } from "../ui";
import { checkMark, rewardIcon } from "./daily";

/** Top players fetched this session, kept for a minute so reopening the list doesn't refetch. */
let leagueTopCache: { at: number; top: LeagueTop } | null = null;

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

  // v2.9: every league as a card, highest first, with its promotion reward and the player on top
  // of it right now. The cards scroll under the header; the footer sits above the frame's bottom rim.
  const footY = top + h - 84;
  const viewTop = cardTop + 240;
  const viewH = footY - 30 - viewTop;
  const CARD = 236;
  const STEP = CARD + 18;
  const left = cx - rowW / 2;
  const right = cx + rowW / 2;
  const list = [...all].reverse();
  // Not inside the dialog's container: a mask on a nested container is ignored. Same depth as the
  // dialog and added after it, so it draws over the dialog but under any dialog opened later.
  const rows = scene.add.container(0, viewTop).setDepth(m.depth).setScrollFactor(0).setAlpha(0);
  scene.tweens.add({ targets: rows, alpha: 1, duration: 140 });
  const inView = (p: Phaser.Input.Pointer) => p.worldY >= viewTop && p.worldY <= viewTop + viewH;
  /** Filled in per card once the top players arrive. */
  const slots: { l: LeagueDef; y: number; hidden: boolean; status: Phaser.GameObjects.Text }[] = [];

  list.forEach((l, i) => {
    const y0 = 8 + i * STEP;
    const here = l.id === cur.id;
    const hidden = hiddenFromMe(l);
    const reached = l.trophies <= profile.trophies && !hidden;
    const tint = hidden ? 0x4a3f6b : colorOf(l);
    const ty = y0 + 62; // the badge row's centre
    const art = here && badgeWings(scene, left, right, ty, 100, l);
    if (art) rows.add(art);
    else if (here) {
      const wings = scene.add.graphics();
      rowWings(wings, left, ty, 100, colorOf(l), -1);
      rowWings(wings, right, ty, 100, colorOf(l), 1);
      rows.add(wings);
    }
    const g = scene.add.graphics();
    // The whole card in the league's colour: full strength once reached, muted above.
    tintPanel(g, left, y0, rowW, CARD, 22, tint, here ? 0.62 : reached ? 0.5 : 0.24);
    // Your league: a bright rim in its own colour over a navy outline, like the badge art.
    if (here) {
      g.lineStyle(9, 0x0a0d24, 1).strokeRoundedRect(left, y0, rowW, CARD, 22);
      g.lineStyle(5, mix(tint, 0xffffff, 0.3), 1).strokeRoundedRect(left, y0, rowW, CARD, 22);
    } else g.lineStyle(2, mix(tint, 0xffffff, 0.2), reached ? 0.9 : 0.4).strokeRoundedRect(left, y0, rowW, CARD, 22);
    // The top-player strip along the bottom of the card.
    g.fillStyle(0x0a0d24, 0.45).fillRoundedRect(left + 14, y0 + 128, rowW - 28, CARD - 142, 16);
    rows.add(g);
    const badge = leagueBadge(scene, left + 66, ty, 104, l, hidden);
    if (!reached && !here) badge.setAlpha(0.6);
    rows.add(badge);
    rows.add(txt(scene, left + 130, ty - 30, hidden ? "???" : l.name.replace(" League", ""), 32, reached ? "#ffffff" : "#c3c9e6", [0, 0.5]));
    // Gate and trophy wave on two short lines, clear of the reward on the right.
    const gate = hidden ? ["By invitation only"] : [l.trophies ? `${fmt(l.trophies)}+ trophies` : "Starting league", `Trophies from wave ${l.minWave}`];
    gate.forEach((line, k) => rows.add(txt(scene, left + 130, ty + 6 + k * 26, line, 20, reached ? "#e6e9ff" : "#9aa3c9", [0, 0.5])));
    const sy = y0 + 128 + (CARD - 142) / 2;
    const status = txt(scene, cx, sy, hidden ? "Members only" : "Loading...", 20, "#8f9ad0");
    slots.push({ l, y: sy, hidden, status });
    rows.add(status);
    if (hidden) {
      // An invitation the player put off ("Not now") can be opened again here.
      if (societyInvite(profile)?.id === l.id)
        rows.add(button(scene, right - 105, ty, 180, 60, "INVITATION", "yellow", () => {
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
      if (!l.trophies) rows.add(txt(scene, right - 30, ty, "Start here", 18, "#8a93bd", [1, 0.5]));
      return;
    }
    const paid = profile.leagues.includes(l.id);
    const dim = paid ? 0.5 : 1;
    const ix = right - 205;
    if (r.chest) rows.add(fitImage(scene.add.image(ix, ty, rewardIcon(r)).setAlpha(dim), 74));
    const amounts = [r.coins && (["item:coins", fmt(r.coins)] as const), r.gems && (["item:gems", fmt(r.gems)] as const)].filter(Boolean) as (readonly [string, string])[];
    const ax = ix + 46;
    amounts.forEach(([key, n], k) => {
      const ay = ty + (amounts.length === 1 ? 0 : k === 0 ? -20 : 20);
      rows.add(scene.add.image(ax + 12, ay, key).setDisplaySize(26, 26).setAlpha(dim));
      rows.add(txt(scene, ax + 30, ay, `+${n}`, 22, paid ? "#9aa3c9" : "#ffd93b", [0, 0.5]));
    });
    if (paid) rows.add(checkMark(scene, right - 32, ty, 34));
    // Reached before leagues paid rewards (or by an admin edit): it comes with the next battle.
    else if (reached) rows.add(txt(scene, right - 18, ty, "next\nbattle", 15, "#7dff7a", [1, 0.5]).setAlign("right"));
  });

  // The top player in each league: avatar, name and trophies; tap for their profile.
  const fill = (t: LeagueTop) => {
    if (!rows.active) return;
    for (const s of slots) {
      if (s.hidden) continue;
      const p = t.top[s.l.id];
      if (!p) {
        s.status.setText("No one here yet");
        continue;
      }
      s.status.destroy();
      const mine = p.id === account.id;
      rows.add(txt(scene, left + 34, s.y, "TOP", 20, "#ffd27a", [0, 0.5]));
      rows.add(avatarView(scene, left + 108, s.y, 72, p.avatar, p.hero));
      const name = p.name.length > 16 ? `${p.name.slice(0, 15)}…` : p.name;
      rows.add(txt(scene, left + 156, s.y, mine ? `${name} (you)` : name, 24, mine ? "#fff4c2" : "#ffffff", [0, 0.5]));
      rows.add(scene.add.image(right - 150, s.y, "item:trophy").setDisplaySize(30, 30));
      rows.add(txt(scene, right - 130, s.y, fmt(p.trophies), 24, "#ffd93b", [0, 0.5]));
      const hit = scene.add.zone(cx, s.y, rowW - 28, CARD - 142).setInteractive({ useHandCursor: true });
      hit.on("pointerup", (ptr: Phaser.Input.Pointer) => {
        if (!inView(ptr) || ptr.getDistance() >= 12 * RES) return;
        sfx("click");
        void openProfile(scene, p.id);
      });
      rows.add(hit);
    }
  };
  const cached = leagueTopCache && Date.now() - leagueTopCache.at < 60_000 ? leagueTopCache.top : null;
  if (cached) fill(cached);
  else
    getLeagueTop().then(
      (t) => {
        leagueTopCache = { at: Date.now(), top: t };
        fill(t);
      },
      () => rows.active && slots.forEach((s) => !s.hidden && s.status.active && s.status.setText("Couldn't load")),
    );

  // Scroll by dragging or with the wheel, clipped to the list; it opens on your own league.
  const minY = Math.min(viewTop, viewTop - (list.length * STEP + 8 - viewH));
  const curIdx = list.findIndex((l) => l.id === cur.id);
  rows.y = Phaser.Math.Clamp(viewTop - (curIdx * STEP + CARD / 2 - viewH / 2), minY, viewTop);
  const mask = scene.make.graphics({}, false).fillRect(cx - w / 2 + 20, viewTop, w - 40, viewH);
  rows.setMask(mask.createGeometryMask());
  let startY = NaN;
  const down = (p: Phaser.Input.Pointer) => (startY = inView(p) ? rows.y : NaN);
  const move = (p: Phaser.Input.Pointer) => {
    if (p.isDown && !Number.isNaN(startY)) rows.y = Phaser.Math.Clamp(startY + (p.y - p.downY) / RES, minY, viewTop);
  };
  const wheel = (_p: unknown, _o: unknown, _dx: number, dy: number) => (rows.y = Phaser.Math.Clamp(rows.y - dy, minY, viewTop));
  scene.input.on("pointerdown", down).on("pointermove", move).on("wheel", wheel);
  m.once("destroy", () => {
    scene.input.off("pointerdown", down).off("pointermove", move).off("wheel", wheel);
    rows.destroy();
    mask.destroy();
  });
  m.add(txt(scene, cx, footY, "Promotion rewards are paid once. Tap a top player for their profile.", 18, "#8f9ad0"));
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
