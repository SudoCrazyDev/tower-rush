/** v2.9: another player's profile, a character page with their deck idling on a stage and their badges. */
import Phaser from "phaser";
import { get } from "../api";
import { profile } from "../save";
import { BASE, ensureAnim, hasAnim, loadSheet, sheetScale, unitArt } from "../assets";
import { ARENA_BY_ID, arenaForTrophies } from "../data/arenas";
import { avatarView } from "../avatars";
import { HERO_BY_ID } from "../data/heroes";
import { RARITY_STATS, UNIT_BY_ID } from "../data/units";
import { W, H, NAVY, txt, modal, fmt, toast, pressable, button } from "../ui";
import { leagueBadge } from "./leagues";
import { tierBadge } from "./ranked";
import { LEAGUES, leagueFor, leaguesByTrophies } from "../../../shared/leagues.ts";
import { PVP, tierFor } from "../../../shared/pvp.ts";
import { BADGES } from "../../../shared/stories.ts";
import type { PublicProfile } from "../../../shared/profile.ts";

export const getPlayer = (id: number) => get<PublicProfile>(`/players/${id}`);

const UNIT_PX = 180;
/** The dialog panel's inner navy (ui:panel_dialog), for fading the stage art into it. */
const PANEL = 0x0f2452;
const HERO_PX = 380;

/** Fetch player `id` and open their profile. */
export async function openProfile(scene: Phaser.Scene, id: number, onEditAvatar?: () => void) {
  let p: PublicProfile;
  try {
    p = await getPlayer(id);
  } catch (e) {
    toast(scene, e instanceof Error ? e.message : "Couldn't load that profile");
    return;
  }
  if (!scene.sys.isActive()) return;
  profileModal(scene, p, onEditAvatar);
}

/** `onEditAvatar` (your own profile) adds a button to change your avatar. */
export function profileModal(scene: Phaser.Scene, p: PublicProfile, onEditAvatar?: () => void) {
  const mw = Math.min(W - 8, 1040);
  const mh = Math.min(H - 24, 1620);
  const m = modal(scene, mw, mh, "PROFILE", () => {});
  const { cx, cy } = m;
  const left = cx - mw / 2 + 56;
  const right = cx + mw / 2 - 56;
  const top = cy - mh / 2 + 120;

  // Header: avatar, name, league.
  const league = leagueFor(p.trophies, LEAGUES, p.society);
  m.add(avatarView(scene, left + 70, top + 70, 140, p.avatar, p.hero));
  m.add(leagueBadge(scene, left + 122, top + 118, 56, league));
  const name = p.name.length > 20 ? `${p.name.slice(0, 19)}…` : p.name;
  m.add(txt(scene, left + 160, top + 34, name, 44, "#ffffff", [0, 0.5]));
  m.add(txt(scene, left + 160, top + 84, league.name, 28, league.color, [0, 0.5]));
  const joined = new Date(p.joined).toLocaleDateString(undefined, { year: "numeric", month: "short" });
  m.add(txt(scene, left + 160, top + 122, `Playing since ${joined}`, 22, "#8f9ad0", [0, 0.5]));

  if (onEditAvatar) {
    m.add(
      button(scene, right - 90, top + 34, 180, 64, "AVATAR", "blue", () => {
        m.close();
        onEditAvatar();
      }),
    );
  }

  // Stats row.
  const sy = top + 190;
  const rated = p.ranked.played > 0;
  const stats: [string, string, string][] = [
    [fmt(p.trophies), "trophies", "#ffd93b"],
    [fmt(p.bestWave), "best wave", "#7fffd4"],
    [rated ? fmt(p.ranked.rating) : "-", rated ? tierFor(p.ranked.rating).name : "ranked", rated ? tierFor(p.ranked.rating).color : "#c9d2ff"],
    [rated ? `${p.ranked.wins}-${p.ranked.losses}` : "-", "ranked W-L", "#ffffff"],
  ];
  const colW = (right - left) / stats.length;
  stats.forEach(([v, label, color], i) => {
    const x = left + colW * (i + 0.5);
    m.add(txt(scene, x, sy - 12, v, 30, color));
    m.add(txt(scene, x, sy + 22, label, 18, "#8f9ad0"));
  });

  // Stage: the hero behind, the deck in front, all idling.
  const stTop = sy + 64;
  const stH = Math.min(820, mh - (stTop - (cy - mh / 2)) - 360);
  stage(scene, m, p, left + 12, stTop, right - left - 24, stH);

  // Badges.
  const by = stTop + stH + 30;
  badges(scene, m, p, left, by, right - left, cy + mh / 2 - 40 - by);
  return m;
}

function stage(scene: Phaser.Scene, m: Phaser.GameObjects.Container, p: PublicProfile, x: number, y: number, w: number, h: number) {
  const g = scene.add.graphics();
  const bg = scene.add.graphics();
  bg.fillGradientStyle(0x2b2f6e, 0x2b2f6e, 0x14183a, 0x14183a, 1).fillRect(x, y, w, h);
  m.add(bg);
  // Backdrop: the arena they last played, cropped to cover the stage and dimmed under the cast.
  const arena = p.arena && ARENA_BY_ID[p.arena] ? p.arena : arenaForTrophies(p.trophies).id;
  const artKey = `loc:arena_${arena}`;
  const backdrop = scene.add.container(0, 0);
  m.add(backdrop);
  const showArt = () => {
    if (!backdrop.active || !scene.textures.exists(artKey)) return;
    const img = scene.add.image(0, 0, artKey);
    const s = Math.max(w / img.width, h / img.height);
    const cw = w / s;
    const ch = h / s;
    const cx0 = (img.width - cw) / 2;
    const cy0 = (img.height - ch) * 0.55;
    img.setScale(s).setCrop(cx0, cy0, cw, ch);
    img.setPosition(x + w / 2 + (img.width / 2 - (cx0 + cw / 2)) * s, y + h / 2 + (img.height / 2 - (cy0 + ch / 2)) * s);
    backdrop.add([img, scene.add.rectangle(x + w / 2, y + h / 2, w, h, 0x0d1030, 0.35)]);
    // Feather every edge into the dialog's navy so the art blends in instead of ending in a hard line.
    const f = scene.add.graphics();
    const T = Math.min(80, h * 0.16);
    const S = Math.min(40, w * 0.06);
    f.fillGradientStyle(PANEL, PANEL, PANEL, PANEL, 1, 1, 0, 0).fillRect(x, y, w, T);
    f.fillGradientStyle(PANEL, PANEL, PANEL, PANEL, 0, 0, 1, 1).fillRect(x, y + h - T, w, T);
    f.fillGradientStyle(PANEL, PANEL, PANEL, PANEL, 1, 0, 1, 0).fillRect(x, y, S, h);
    f.fillGradientStyle(PANEL, PANEL, PANEL, PANEL, 0, 1, 0, 1).fillRect(x + w - S, y, S, h);
    backdrop.add(f);
  };
  if (scene.textures.exists(artKey)) showArt();
  else {
    scene.load.once(`filecomplete-image-${artKey}`, showArt);
    scene.load.image(artKey, `${BASE}locations/arena_${arena}.webp`);
  }
  // No frame: the arena art runs edge to edge inside the dialog's margin.
  // Floor.
  const floorY = y + h * 0.78;
  g.fillStyle(0x0d1030, 0.7).fillEllipse(x + w / 2, floorY + 10, w * 0.92, h * 0.34);
  g.fillStyle(0xffd93b, 0.08).fillEllipse(x + w / 2, floorY - h * 0.2, w * 0.5, h * 0.5);
  m.add(g);
  m.add(txt(scene, x + 26, y + 34, "CURRENT DECK", 24, "#fff4c2", [0, 0.5]));

  const loading = txt(scene, x + w / 2, y + h / 2, "…", 40, "#c9d2ff");
  m.add(loading);

  const units = p.deck.filter((d) => UNIT_BY_ID[d.id]);
  const hero = p.hero && HERO_BY_ID[p.hero] ? p.hero : null;
  for (const d of units) loadSheet(scene, "units", `${unitArt(d.id)}_idle`);
  if (hero) loadSheet(scene, "heroes", `${hero}_idle`);

  const build = () => {
    if (!m.active) return;
    loading.destroy();
    if (hero) {
      const key = ensureAnim(scene, "heroes", `${hero}_idle`, 14, -1);
      const hy = y + h * 0.5;
      if (key) {
        const s = scene.add.sprite(x + w / 2, hy, key).setScale(sheetScale("heroes", Math.min(HERO_PX, h * 0.62))).setAlpha(0.95);
        s.play({ key, startFrame: 0 });
        m.add(s);
      }
      m.add(txt(scene, x + w - 26, y + 34, HERO_BY_ID[hero].name, 22, "#c9d2ff", [1, 0.5]));
    }
    // Front row in a shallow arc: outer units a little higher (further back).
    const n = units.length;
    const px = Math.min(UNIT_PX, h * 0.3, (w / Math.max(1, n)) * 0.95);
    units.forEach((d, i) => {
      const t = n > 1 ? i / (n - 1) - 0.5 : 0;
      const ux = x + w / 2 + t * (w - px * 1.1);
      const uy = floorY - Math.abs(t) * h * 0.14;
      unitOnStage(scene, m, d.id, d.level, ux, uy, px, i);
    });
  };
  if (scene.load.list.size === 0 && !scene.load.isLoading()) build();
  else {
    scene.load.once(Phaser.Loader.Events.COMPLETE, build);
    if (!scene.load.isLoading()) scene.load.start();
  }
}

function unitOnStage(scene: Phaser.Scene, m: Phaser.GameObjects.Container, id: string, level: number, x: number, y: number, px: number, i: number) {
  const def = UNIT_BY_ID[id];
  const color = RARITY_STATS[def.rarity].color;
  const shadow = scene.add.graphics();
  shadow.fillStyle(0x000000, 0.4).fillEllipse(x, y, px * 0.7, px * 0.18);
  shadow.fillStyle(color, 0.35).fillEllipse(x, y, px * 0.55, px * 0.12);
  m.add(shadow);

  const art = unitArt(id);
  let body: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
  const key = hasAnim("units", `${art}_idle`) ? ensureAnim(scene, "units", `${art}_idle`, 14, -1) : null;
  if (key) {
    const s = scene.add.sprite(x, y, key).setOrigin(0.5, 0.82).setScale(sheetScale("units", px));
    // Staggered start so the row doesn't breathe in lockstep.
    s.play({ key, startFrame: (i * 5) % 16 });
    body = s;
  } else {
    const k = scene.textures.exists(`units:${id}`) ? `units:${id}` : `portrait:${id}`;
    body = scene.add.image(x, y, k).setOrigin(0.5, 0.9);
    body.setScale(px / Math.max(1, body.height));
    scene.tweens.add({ targets: body, y: y - 6, yoyo: true, repeat: -1, duration: 900 + i * 120, ease: "Sine.InOut" });
  }
  m.add(body);
  pressable(body, () => toast(scene, `${def.name} · Level ${level}`, "#fff4c2"));

  // Level pill in the rarity colour.
  const pill = scene.add.graphics();
  pill.fillStyle(NAVY, 0.95).fillRoundedRect(x - 46, y + 14, 92, 34, 17);
  pill.lineStyle(3, color, 1).strokeRoundedRect(x - 46, y + 14, 92, 34, 17);
  m.add(pill);
  m.add(txt(scene, x, y + 31, `Lv ${level}`, 22, "#ffffff"));
}

function badges(scene: Phaser.Scene, m: Phaser.GameObjects.Container, p: PublicProfile, x: number, y: number, w: number, h: number) {
  const items: Phaser.GameObjects.Container[] = [];
  const SIZE = 84;
  // League badges reached, lowest first.
  for (const l of leaguesByTrophies(LEAGUES)) {
    if (!p.leagues.includes(l.id)) continue;
    // A society league they've left stays "???" unless you're a member (members show it, as on the leaderboard).
    const hidden = !!l.society && p.society !== l.id && profile.society?.league !== l.id;
    items.push(scene.add.container(0, 0, [leagueBadge(scene, 0, 0, SIZE, l, hidden), label(scene, hidden ? "???" : l.name.replace(" League", ""), hidden ? "#c9d2ff" : l.color)]));
  }
  // Best ranked tier.
  if (p.ranked.played >= PVP.rules.ratingPlacementGames) {
    const t = tierFor(p.ranked.peak);
    items.push(scene.add.container(0, 0, [tierBadge(scene, 0, 0, SIZE, t), label(scene, `Peak ${t.name}`, t.color)]));
  }
  // Story badges.
  for (const b of p.badges) {
    const def = BADGES[b];
    if (!def) continue;
    items.push(scene.add.container(0, 0, [medal(scene, SIZE), label(scene, def.label, "#ffd93b")]));
  }

  m.add(txt(scene, x, y + 4, `BADGES (${items.length})`, 26, "#fff4c2", [0, 0.5]));
  if (!items.length) {
    m.add(txt(scene, x + w / 2, y + 90, "No badges earned yet", 24, "#8f9ad0"));
    return;
  }
  // Shrink the grid until every badge fits.
  let k = 1;
  let cols = 1;
  for (k of [1, 0.85, 0.72, 0.6]) {
    cols = Math.max(1, Math.floor(w / (120 * k)));
    if (cols * Math.max(1, Math.floor((h - 30) / (136 * k))) >= items.length) break;
  }
  const cellW = 120 * k;
  const cellH = 136 * k;
  const rows = Math.max(1, Math.floor((h - 30) / cellH));
  const shown = items.slice(0, cols * rows);
  items.slice(shown.length).forEach((c) => c.destroy());
  const n = Math.min(cols, shown.length);
  const gx = x + (w - n * cellW) / 2 + cellW / 2;
  shown.forEach((c, i) => {
    c.setPosition(gx + (i % cols) * cellW, y + 30 + (SIZE / 2 + 6) * k + Math.floor(i / cols) * cellH).setScale(k);
    m.add(c);
  });
}

const label = (scene: Phaser.Scene, text: string, color: string) => txt(scene, 0, 56, text.length > 12 ? `${text.slice(0, 11)}…` : text, 18, color);

/** A story badge (no art yet): a gold medal with a star. */
function medal(scene: Phaser.Scene, size: number) {
  const r = size / 2;
  const g = scene.add.graphics();
  g.fillStyle(0xb8323a, 1).fillTriangle(-r * 0.5, -r * 0.2, -r * 0.05, -r * 0.2, -r * 0.45, r * 1.0);
  g.fillStyle(0x3248b8, 1).fillTriangle(r * 0.5, -r * 0.2, r * 0.05, -r * 0.2, r * 0.45, r * 1.0);
  g.fillStyle(NAVY, 1).fillCircle(0, -r * 0.1, r * 0.78);
  g.fillStyle(0xffd93b, 1).fillCircle(0, -r * 0.1, r * 0.68);
  g.fillStyle(0xfff4c2, 1);
  const pts: Phaser.Types.Math.Vector2Like[] = [];
  for (let k = 0; k < 10; k++) {
    const a = -Math.PI / 2 + (k * Math.PI) / 5;
    const rr = k % 2 ? r * 0.2 : r * 0.46;
    pts.push({ x: Math.cos(a) * rr, y: -r * 0.1 + Math.sin(a) * rr });
  }
  g.fillPoints(pts, true);
  return g;
}
