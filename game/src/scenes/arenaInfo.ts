import Phaser from "phaser";
import { assetIndex, loadImages } from "../assets";
import { ARENAS, type ArenaDef } from "../data/arenas";
import { BOSS_BY_ID, MONSTER_BY_ID, type BossPower } from "../data/monsters";
import { ECONOMY, battleRewards } from "../../../shared/economy.ts";
import { getArenaTop, type ArenaTop } from "../save";
import { W, H, txt, button, modal, fmt, NAVY } from "../ui";

type Tab = "details" | "top";

const MW = Math.min(700, W - 40);
const MH = Math.min(1180, H - 60);
const MEDAL = ["#ffd93b", "#d7dde8", "#e0954a"];

const POWER: Record<BossPower, string> = {
  summon: "Summons minions",
  heal: "Heals itself",
  haste: "Rages (speeds up)",
  shield: "Shields itself",
  freeze_units: "Freezes your units",
  teleport: "Teleports ahead",
  charm: "Charms your units (they miss)",
  roar: "Roars to stun your units",
  split: "Splits when hit hard",
  layers: "Sheds layers as it breaks",
  portal: "Opens portals and blinks ahead",
  none: "Uses its own skills",
};

/** Top-player lists fetched this session, kept for a minute so flipping tabs doesn't refetch. */
const topCache = new Map<string, { at: number; top: ArenaTop }>();

/** The arena's monsters, bosses and rewards, and its longest-wave leaderboard, in two tabs. */
export function arenaInfo(scene: Phaser.Scene, arena: ArenaDef, tab: Tab = "details") {
  const m = modal(scene, MW, MH, arena.name.toUpperCase(), () => {});
  const top = m.cy - MH / 2;
  let parts: Phaser.GameObjects.GameObject[] = [];
  const put = <T extends Phaser.GameObjects.GameObject>(o: T) => {
    m.add(o);
    parts.push(o);
    return o;
  };
  const alive = () => m.active && scene.sys.isActive();

  /** A monster or boss picture, fetched the first time the dialog needs it. */
  const art = (folder: "monsters" | "bosses", id: string, x: number, y: number, size: number) => {
    if (!assetIndex()[folder].includes(id)) return;
    const key = `${folder}:${id}`;
    const owner = parts;
    const add = () => {
      if (!alive() || owner !== parts || !scene.textures.exists(key)) return;
      const img = put(scene.add.image(x, y, key));
      img.setScale(size / Math.max(img.width, img.height));
    };
    if (scene.textures.exists(key)) return add();
    loadImages(scene, folder, folder, [id]);
    scene.load.once(`filecomplete-image-${key}`, add);
    scene.load.start();
  };

  const show = (t: Tab) => {
    parts.forEach((o) => o.destroy());
    parts = [];
    const tabs: [Tab, string][] = [
      ["details", "DETAILS"],
      ["top", "TOP PLAYERS"],
    ];
    tabs.forEach(([id, label], i) =>
      put(button(scene, m.cx + (i - 0.5) * 290, top + 124, 270, 76, label, id === t ? "yellow" : "grey", () => id !== t && show(id), 30)),
    );
    if (t === "details") details();
    else players();
  };

  const header = (y: number, label: string) => put(txt(scene, m.cx, y, label, 28, "#ffd27a"));

  const details = () => {
    const y0 = top + 200;
    header(y0, "MONSTERS");
    const cols = 4;
    const cell = (MW - 80) / cols;
    arena.monsters.forEach((id, i) => {
      const x = m.cx + ((i % cols) - (cols - 1) / 2) * cell;
      const y = y0 + 80 + Math.floor(i / cols) * 140;
      art("monsters", id, x, y, 96);
      put(txt(scene, x, y + 58, MONSTER_BY_ID[id]?.name ?? id, 17, "#ffffff")).setWordWrapWidth(cell - 8).setAlign("center");
    });

    const yb = y0 + 330;
    header(yb, "BOSSES");
    const bcell = (MW - 60) / arena.bosses.length;
    arena.bosses.forEach((id, i) => {
      const b = BOSS_BY_ID[id];
      const x = m.cx + (i - (arena.bosses.length - 1) / 2) * bcell;
      art("bosses", id, x, yb + 90, 136);
      put(txt(scene, x, yb + 172, b?.name ?? id, 19, "#ffffff")).setWordWrapWidth(bcell - 10).setAlign("center");
      if (b) put(txt(scene, x, yb + 204, POWER[b.power], 16, "#c9d2ff"));
    });

    const yr = yb + 260;
    header(yr, "REWARDS");
    const idx = Math.max(0, ARENAS.indexOf(arena));
    const e = ECONOMY;
    const perWave = e.coinsPerWave * (1 + idx * e.arenaCoinBonus);
    const evenAt = Math.floor(e.trophyOffset / e.trophiesPerWave) + 1;
    const lines: [string, string][] = [
      ["item:coins", `${perWave % 1 ? perWave.toFixed(1) : perWave} coins per wave` + (idx ? ` (+${Math.round(idx * e.arenaCoinBonus * 100)}% arena bonus)` : "")],
      ["item:gems", `Boss every ${e.bossEvery} waves: +${e.coinsPerBoss} coins, +${e.gemsPerBoss} gems`],
      ["item:trophy", `+${e.trophiesPerWave} per wave; you gain trophies from wave ${evenAt}`],
    ];
    const lx = m.cx - MW / 2 + 70;
    lines.forEach(([icon, text], i) => {
      const y = yr + 54 + i * 52;
      const img = put(scene.add.image(lx, y, icon));
      img.setScale(42 / Math.max(img.width, img.height));
      put(txt(scene, lx + 36, y, text, 20, "#ffffff", [0, 0.5])).setWordWrapWidth(MW - 150);
    });
    // A worked example: what a good run here pays.
    const goal = 20;
    const r = battleRewards(goal, Math.floor(goal / e.bossEvery), idx);
    const ye = yr + 54 + lines.length * 52 + 20;
    const g = put(scene.add.graphics());
    g.fillStyle(NAVY, 0.7).fillRoundedRect(m.cx - MW / 2 + 40, ye - 30, MW - 80, 60, 18);
    put(txt(scene, m.cx, ye, `Reach wave ${goal}: ${fmt(r.coins)} coins · ${r.gems} gems · +${r.trophies} trophies`, 20, "#ffd93b"));
  };

  const players = () => {
    const owner = parts;
    const status = put(txt(scene, m.cx, m.cy, "Loading...", 30, "#c9d2ff"));
    const cached = topCache.get(arena.id);
    const load = cached && Date.now() - cached.at < 60_000 ? Promise.resolve(cached.top) : getArenaTop(arena.id);
    load.then(
      (t) => {
        topCache.set(arena.id, { at: Date.now(), top: t });
        if (!alive() || owner !== parts) return;
        status.destroy();
        board(t);
      },
      () => {
        if (!alive() || owner !== parts) return;
        status.setText("Couldn't load the top players").setColor("#ff8080");
        put(button(scene, m.cx, m.cy + 90, 260, 84, "RETRY", "blue", () => show("top"), 30));
      },
    );
  };

  const board = (t: ArenaTop) => {
    const left = m.cx - MW / 2 + 40;
    const w = MW - 80;
    const rowH = Math.min(56, (MH - 330) / Math.max(1, t.rows.length));
    const y0 = top + 200;
    if (!t.rows.length) put(txt(scene, m.cx, m.cy - 60, "Nobody has played here yet.\nBe the first!", 30, "#c9d2ff"));
    t.rows.forEach((r, i) => {
      const y = y0 + i * rowH + rowH / 2;
      const mine = r.id === t.me.id;
      const g = put(scene.add.graphics());
      g.fillStyle(mine ? 0x3b3f8a : 0x1d2250, 0.9).fillRoundedRect(left, y - rowH / 2 + 3, w, rowH - 6, 12);
      put(txt(scene, left + 36, y, `#${r.rank}`, 22, MEDAL[r.rank - 1] ?? "#c9d2ff"));
      const name = r.name.length > 18 ? `${r.name.slice(0, 17)}…` : r.name;
      put(txt(scene, left + 76, y, mine ? `${name} (you)` : name, 22, mine ? "#fff4c2" : "#ffffff", [0, 0.5]));
      put(txt(scene, left + w - 20, y, `Wave ${fmt(r.wave)}`, 22, "#ffd93b", [1, 0.5]));
    });
    // The player's own record here, even outside the list.
    const fy = top + MH - 70;
    const g = put(scene.add.graphics());
    g.fillStyle(0x2a2f6a, 0.95).fillRoundedRect(left, fy - 34, w, 68, 18);
    g.lineStyle(3, 0xffd93b, 1).strokeRoundedRect(left, fy - 34, w, 68, 18);
    put(txt(scene, m.cx, fy, t.me.rank ? `You: #${fmt(t.me.rank)} · best wave ${fmt(t.me.wave)}` : "You haven't battled here yet", 24, "#fff4c2"));
  };

  show(tab);
  return m;
}
