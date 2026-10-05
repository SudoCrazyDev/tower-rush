/** Ranked PvP tier badges and the ranked ladder dialog (opened from the PvP menu). */
import Phaser from "phaser";
import { PVP, nextTier, tierFor, tiersByRating, type RankTier } from "../../../shared/pvp.ts";
import { profile } from "../save";
import { txt, modal, NAVY, fmt } from "../ui";

const colorOf = (t: RankTier) => Phaser.Display.Color.HexStringToColor(t.color).color;

/** Still in the placement matches (rating moves faster). */
export const placing = () => profile.ranked.played < PVP.rules.ratingPlacementGames;

/** A tier's badge, `size` px tall: a gem in the tier colour with its initial. */
export function tierBadge(scene: Phaser.Scene, x: number, y: number, size: number, t: RankTier) {
  const c = scene.add.container(x, y);
  c.setSize(size, size);
  const gem = (s: number) => [
    { x: 0, y: -s },
    { x: s * 0.8, y: -s * 0.35 },
    { x: s * 0.8, y: s * 0.35 },
    { x: 0, y: s },
    { x: -s * 0.8, y: s * 0.35 },
    { x: -s * 0.8, y: -s * 0.35 },
  ];
  const r = size / 2;
  const g = scene.add.graphics();
  g.fillStyle(NAVY, 1).fillPoints(gem(r), true);
  g.fillStyle(colorOf(t), 1).fillPoints(gem(r * 0.8), true);
  g.fillStyle(0xffffff, 0.25).fillPoints(gem(r * 0.45), true);
  c.add([g, txt(scene, 0, -size * 0.02, t.name.charAt(0).toUpperCase(), Math.round(size * 0.42))]);
  return c;
}

/** The player's tier, rating and record, with every tier listed. */
export function rankedModal(scene: Phaser.Scene) {
  const all = tiersByRating();
  const s = profile.ranked;
  const h = Math.min(1180, 520 + all.length * 100);
  const m = modal(scene, 680, h, "RANKED", () => {});
  const { cx, cy } = m;
  const top = cy - h / 2;
  const cur = tierFor(s.rating);
  const next = nextTier(s.rating);

  m.add(tierBadge(scene, cx - 210, top + 160, 120, cur));
  m.add(txt(scene, cx - 130, top + 125, cur.name, 40, cur.color, [0, 0.5]));
  m.add(txt(scene, cx - 130, top + 172, `Rating ${fmt(s.rating)}`, 30, "#fff4c2", [0, 0.5]));
  const bar = scene.add.graphics();
  const bw = 400;
  const p = next ? Math.min(1, Math.max(0, (s.rating - cur.rating) / (next.rating - cur.rating))) : 1;
  bar.fillStyle(0x0a0d24, 1).fillRoundedRect(cx - 130, top + 205, bw, 30, 15);
  bar.fillStyle(next ? 0x3d8bff : 0x59d64a, 1).fillRoundedRect(cx - 128, top + 207, Math.max(26, (bw - 4) * p), 26, 13);
  m.add(bar);
  m.add(txt(scene, cx - 130 + bw / 2, top + 220, next ? `${fmt(s.rating)} / ${fmt(next.rating)}` : "Top tier!", 20));
  const record = s.played
    ? `${s.wins}W ${s.losses}L  ·  Peak ${fmt(s.peak)}${placing() ? `  ·  Placement ${s.played}/${PVP.rules.ratingPlacementGames}` : ""}`
    : "Play a ranked match to get on the ladder";
  m.add(txt(scene, cx, top + 275, record, 24, "#c9d2ff"));
  m.add(txt(scene, cx, top + 315, "Win to gain rating, more against stronger players. Separate from trophies.", 20, "#8f9ad0").setWordWrapWidth(600));

  const listTop = top + 370;
  const step = Math.min(100, (h - 420) / Math.max(1, all.length));
  [...all].reverse().forEach((t, i) => {
    const y = listTop + step / 2 + i * step;
    const here = t.id === cur.id;
    const g = scene.add.graphics();
    g.fillStyle(here ? 0x3b3f8a : NAVY, t.rating <= s.rating ? 0.95 : 0.6).fillRoundedRect(cx - 300, y - step / 2 + 5, 600, step - 10, 18);
    if (here) g.lineStyle(4, 0xffd93b, 1).strokeRoundedRect(cx - 300, y - step / 2 + 5, 600, step - 10, 18);
    m.add(g);
    m.add(tierBadge(scene, cx - 250, y, Math.min(64, step - 24), t));
    m.add(txt(scene, cx - 200, y, t.name, 30, t.color, [0, 0.5]));
    m.add(txt(scene, cx + 270, y, `${fmt(t.rating)}+`, 26, "#fff4c2", [1, 0.5]));
  });
}
