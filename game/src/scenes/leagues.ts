/** League badges and the leagues list (opened from the badge in the top bar). */
import Phaser from "phaser";
import { leaguesByTrophies, nextLeague, playerLeague, societyInvite, MYSTERY_ICON, type LeagueDef } from "../../../shared/leagues.ts";
import { rewardText } from "../../../shared/daily.ts";
import { chestById } from "../../../shared/profile.ts";
import { joinSociety, profile } from "../save";
import { txt, modal, button, NAVY, fmt } from "../ui";
import { checkMark, rewardIcon } from "./daily";

const chestName = (id: string) => chestById(id)?.name ?? id;
const colorOf = (l: LeagueDef) => Phaser.Display.Color.HexStringToColor(l.color).color;

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
  const h = Math.min(1180, 500 + all.length * 100);
  const m = modal(scene, 680, h, "LEAGUES", () => {});
  const { cx, cy } = m;
  const top = cy - h / 2;
  const cur = playerLeague(profile);
  const next = nextLeague(profile.trophies);

  // Current league and progress toward the next one.
  m.add(leagueBadge(scene, cx - 210, top + 160, 120, cur));
  m.add(txt(scene, cx - 130, top + 125, cur.name, 38, cur.color, [0, 0.5]));
  m.add(scene.add.image(cx - 112, top + 172, "item:trophy").setDisplaySize(40, 40));
  m.add(txt(scene, cx - 84, top + 172, fmt(profile.trophies), 30, "#ffd93b", [0, 0.5]));
  const bar = scene.add.graphics();
  const bw = 400;
  const p = next ? Math.min(1, Math.max(0, (profile.trophies - cur.trophies) / (next.trophies - cur.trophies))) : 1;
  bar.fillStyle(0x0a0d24, 1).fillRoundedRect(cx - 130, top + 205, bw, 30, 15);
  bar.fillStyle(next ? 0x3d8bff : 0x59d64a, 1).fillRoundedRect(cx - 128, top + 207, Math.max(26, (bw - 4) * p), 26, 13);
  m.add(bar);
  m.add(txt(scene, cx - 130 + bw / 2, top + 220, next ? `${fmt(profile.trophies)} / ${fmt(next.trophies)}` : "Top league!", 20));
  m.add(
    txt(scene, cx, top + 268, next ? `${fmt(next.trophies - profile.trophies)} more trophies to reach ${next.name}` : "You've reached the highest league.", 24, "#c9d2ff"),
  );
  // v2.9: this league's trophy rules for solo runs (and the Society's dues for its members).
  const s = profile.society && cur.society && profile.society.league === cur.id ? cur.society : null;
  const rules = s
    ? `Dues: ${fmt(s.duesCoins)} gold + ${fmt(s.duesGems)} gems, next on ${new Date(profile.society!.paidUntil).toLocaleDateString()}`
    : `Reach wave ${cur.minWave} to win trophies; fall short and you lose them`;
  m.add(txt(scene, cx, top + 304, rules, 21, "#ffd27a"));

  // Every league, highest first, with its promotion reward.
  const listTop = top + 345;
  const step = Math.min(100, (h - 405) / Math.max(1, all.length));
  [...all].reverse().forEach((l, i) => {
    const y = listTop + step / 2 + i * step;
    const here = l.id === cur.id;
    const hidden = hiddenFromMe(l);
    const reached = l.trophies <= profile.trophies && !hidden;
    const g = scene.add.graphics();
    g.fillStyle(here ? 0x3b3f8a : NAVY, reached ? 0.95 : 0.6).fillRoundedRect(cx - 300, y - step / 2 + 5, 600, step - 10, 18);
    if (here) g.lineStyle(4, 0xffd93b, 1).strokeRoundedRect(cx - 300, y - step / 2 + 5, 600, step - 10, 18);
    m.add(g);
    const badge = leagueBadge(scene, cx - 250, y, step * 0.72, l, hidden);
    if (!reached) badge.setAlpha(0.5);
    m.add(badge);
    m.add(txt(scene, cx - 195, y - 16, hidden ? "???" : l.name, 28, reached ? l.color : "#9aa3c9", [0, 0.5]));
    const gate = hidden ? "By invitation only" : l.trophies ? `${fmt(l.trophies)}+ trophies · wave ${l.minWave}` : `Starting league · wave ${l.minWave}`;
    m.add(txt(scene, cx - 195, y + 18, gate, 20, "#8f9ad0", [0, 0.5]));
    if (hidden) {
      // An invitation the player put off ("Not now") can be opened again here.
      if (societyInvite(profile)?.id === l.id)
        m.add(button(scene, cx + 190, y, 190, Math.min(70, step - 20), "INVITATION", "yellow", () => {
          societyInvitation(scene, (joined) => {
            if (!joined) return;
            m.destroy();
            leagueModal(scene);
          }, true);
        }, 22));
      return;
    }
    // Promotion reward (paid once, the first time the league is reached).
    const r = l.reward;
    if (!l.trophies || (!r.coins && !r.gems && !r.chest)) return;
    const paid = profile.leagues.includes(l.id);
    const icon = scene.add.image(cx + 120, y, rewardIcon(r)).setDisplaySize(step * 0.5, step * 0.5);
    if (paid) icon.setAlpha(0.45);
    m.add(icon);
    const label = r.chest ? [chestName(r.chest), r.coins && `+${fmt(r.coins)} gold`, r.gems && `+${r.gems} gems`].filter(Boolean).join("\n") : rewardText(r).replace(" + ", "\n");
    m.add(txt(scene, cx + 160, y, label, 18, paid ? "#9aa3c9" : "#ffd93b", [0, 0.5]).setAlign("left"));
    if (paid) m.add(checkMark(scene, cx + 120, y, step * 0.4));
    // Reached before leagues paid rewards (or by an admin edit): it comes with the next battle.
    else if (reached) m.add(txt(scene, cx + 120, y + step * 0.36, "next battle", 16, "#7dff7a"));
  });
  m.add(txt(scene, cx, top + h - 36, "Promotion rewards are paid once, the first time you reach a league.", 18, "#8f9ad0"));
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
