/** Daily login calendar, daily quests and the reward popup, opened from the lobby. */
import Phaser from "phaser";
import { LOGIN_REWARDS, QUEST_GOALS, loginReady, msToNextDay, questById, questDone, questText, rewardText, type Reward } from "../../../shared/daily.ts";
import { chestById } from "../../../shared/profile.ts";
import { ECONOMY } from "../../../shared/economy.ts";
import { profile, claimLogin, claimQuest, claimQuestBonus, type ChestLoot, type Claimed } from "../save";
import { txt, button, modal, NAVY, attempt, lootCards, fmt } from "../ui";
import { sfx } from "../audio";

const chestName = (id: string) => chestById(id)?.name ?? id;

const inTime = (ms: number) => {
  const mins = Math.ceil(ms / 60000);
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

/** Icon for a reward: its chest, else gems or gold. */
export function rewardIcon(r: Reward) {
  if (r.chest && chestById(r.chest)) return `item:${chestById(r.chest)!.image}`;
  return r.gems && !r.coins ? "item:gems" : "item:coins";
}

/** Things to claim: today's login reward, finished quests and the all-quests bonus. */
export function dailyCounts() {
  const d = profile.daily;
  const quests = d.quests.filter((q) => !q.claimed && questDone(q)).length;
  const bonus = d.quests.length > 0 && d.quests.every((q) => q.claimed) && !d.bonusClaimed ? 1 : 0;
  return { login: loginReady(profile.login), quests: quests + bonus };
}

export function checkMark(scene: Phaser.Scene, x: number, y: number, size: number) {
  const g = scene.add.graphics();
  g.lineStyle(size * 0.22, NAVY, 1).beginPath().moveTo(x - size * 0.4, y).lineTo(x - size * 0.1, y + size * 0.3).lineTo(x + size * 0.45, y - size * 0.35).strokePath();
  g.lineStyle(size * 0.12, 0x59d64a, 1).beginPath().moveTo(x - size * 0.4, y).lineTo(x - size * 0.1, y + size * 0.3).lineTo(x + size * 0.45, y - size * 0.35).strokePath();
  return g;
}

/** What a claim gave: gold/gems, plus the chest's cards. */
export function rewardPopup(scene: Phaser.Scene, title: string, got: Claimed, onDone: () => void) {
  const { reward, loot } = got;
  const h = !loot ? 560 : loot.cards.length > 8 ? 1180 : 1000;
  const m = modal(scene, 680, h, title);
  const { cx, cy } = m;
  const top = cy - h / 2;
  sfx(loot ? "chest" : "coin");
  const lines: [string, string, string][] = [];
  const coins = reward.coins + (loot?.coins ?? 0);
  if (coins) lines.push(["item:coins", `+${fmt(coins)} gold`, "#ffd93b"]);
  if (reward.gems) lines.push(["item:gems", `+${reward.gems} gems`, "#7fffd4"]);
  // Without a chest, centre the gold/gems lines in the space above the button.
  let y = loot ? top + 150 : cy - 50 - ((lines.length - 1) * 80) / 2;
  if (loot && reward.chest) {
    m.add(scene.add.image(cx, y + 40, rewardIcon(reward)).setDisplaySize(170, 170));
    m.add(txt(scene, cx, y + 150, chestName(reward.chest), 32, "#fff4c2"));
    y += 230;
  }
  lines.forEach(([icon, label, color]) => {
    m.add(scene.add.image(cx - 120, y, icon).setDisplaySize(70, 70));
    m.add(txt(scene, cx - 70, y, label, 40, color, [0, 0.5]));
    y += 80;
  });
  if (loot) m.add(lootCards(scene, cx, y + 70, (loot as ChestLoot).cards, 100));
  m.add(button(scene, cx, cy + h / 2 - 100, 340, 100, "COLLECT", "green", () => {
    m.close();
    onDone();
  }));
}

/** The 7-day (or however long the admin made it) login calendar. */
export function loginModal(scene: Phaser.Scene, onDone: () => void) {
  const m = modal(scene, 680, 960, "DAILY REWARD", onDone);
  const { cx, cy } = m;
  const n = LOGIN_REWARDS.length;
  const ready = loginReady(profile.login);
  const claims = profile.login.claims;
  // Today's tile: the next one if it's still to claim, else the one claimed today.
  const today = ready ? claims % n : (claims - 1 + n) % n;
  m.add(txt(scene, cx, cy - 390, "A reward every day you play.\nMissed days don't reset your progress.", 24, "#c9d2ff"));

  const perRow = 4;
  const rows = Math.ceil(n / perRow);
  const tileH = Math.min(190, 560 / rows - 16);
  LOGIN_REWARDS.forEach((r, i) => {
    const row = Math.floor(i / perRow);
    const inRow = Math.min(perRow, n - row * perRow);
    const x = cx + ((i % perRow) - (inRow - 1) / 2) * 150;
    const y = cy - 300 + tileH / 2 + row * (tileH + 16);
    const claimed = i < today || (i === today && !ready);
    const g = scene.add.graphics();
    g.fillStyle(NAVY, claimed ? 0.5 : 0.9).fillRoundedRect(x - 68, y - tileH / 2, 136, tileH, 18);
    g.lineStyle(i === today && ready ? 6 : 3, i === today && ready ? 0xffd93b : 0x3d4a8a, 1).strokeRoundedRect(x - 68, y - tileH / 2, 136, tileH, 18);
    const icon = scene.add.image(x, y - 6, rewardIcon(r)).setDisplaySize(tileH * 0.42, tileH * 0.42);
    const label = r.chest
      ? [chestName(r.chest).replace(" Chest", ""), r.coins && `+${r.coins} gold`, r.gems && `+${r.gems} gems`].filter(Boolean).join("\n")
      : rewardText(r).replace(" + ", "\n");
    const parts: Phaser.GameObjects.GameObject[] = [
      g,
      txt(scene, x, y - tileH / 2 + 20, `DAY ${i + 1}`, 22, "#fff4c2"),
      icon,
      txt(scene, x, y + tileH / 2 - 30, label, 18, "#ffffff"),
    ];
    if (claimed) {
      icon.setAlpha(0.45);
      parts.push(checkMark(scene, x, y - 6, 56));
    }
    if (i === today && ready) scene.tweens.add({ targets: icon, scale: icon.scale * 1.12, yoyo: true, repeat: -1, duration: 500 });
    m.add(parts);
  });

  if (ready) {
    const b = button(scene, cx, cy + 330, 360, 110, "CLAIM", "green", () => {
      b.setEnabled(false);
      let got: Claimed | null = null;
      attempt(scene, async () => (got = await claimLogin())).then((ok) => {
        m.destroy(); // not close(): that would run onDone and restart the lobby under the popup
        if (ok && got) rewardPopup(scene, `DAY ${today + 1} REWARD`, got, onDone);
        else onDone();
      });
    }, 44);
    m.add(b);
  } else {
    m.add(txt(scene, cx, cy + 310, "Claimed for today", 34, "#7dff7a"));
    m.add(txt(scene, cx, cy + 360, `Next reward in ${inTime(msToNextDay())}`, 26, "#c9d2ff"));
  }
}

/** Today's quests with progress, claim buttons and the all-quests bonus. */
export function questsModal(scene: Phaser.Scene, onDone: () => void) {
  const m = modal(scene, 680, 1040, "DAILY QUESTS", onDone);
  const { cx, cy } = m;
  const d = profile.daily;
  const reopen = (got: Claimed | null, ok: boolean) => {
    m.destroy();
    if (ok && got) rewardPopup(scene, "QUEST REWARD", got, () => questsModal(scene, onDone));
    else questsModal(scene, onDone);
  };
  const claimButton = (x: number, y: number, enabled: boolean, action: () => Promise<Claimed>) => {
    const b = button(scene, x, y, 160, 70, "CLAIM", enabled ? "green" : "grey", () => {
      b.setEnabled(false);
      let got: Claimed | null = null;
      attempt(scene, async () => (got = await action())).then((ok) => reopen(got, ok));
    }, 28);
    m.add(b.setEnabled(enabled));
  };

  if (!d.quests.length) m.add(txt(scene, cx, cy - 200, "No quests today.", 30, "#c9d2ff"));
  const step = Math.min(200, 600 / Math.max(1, d.quests.length));
  d.quests.forEach((s, i) => {
    const q = questById(s.id);
    if (!q) return;
    const y = cy - 360 + step / 2 + i * step;
    const done = questDone(s);
    const g = scene.add.graphics();
    g.fillStyle(NAVY, 0.9).fillRoundedRect(cx - 300, y - step / 2 + 8, 600, step - 16, 20);
    if (done && !s.claimed) g.lineStyle(5, 0x59d64a, 1).strokeRoundedRect(cx - 300, y - step / 2 + 8, 600, step - 16, 20);
    m.add(g);
    m.add(txt(scene, cx - 270, y - 34, questText(q), 28, s.claimed ? "#9aa3c9" : "#ffffff", [0, 0.5]));
    m.add(txt(scene, cx - 270, y + 4, QUEST_GOALS[q.goal].best ? "In a single battle" : "Today", 18, "#8f9ad0", [0, 0.5]));
    // Progress bar.
    const p = Math.min(1, s.progress / q.target);
    const bar = scene.add.graphics();
    bar.fillStyle(0x0a0d24, 1).fillRoundedRect(cx - 270, y + 26, 330, 30, 15);
    bar.fillStyle(done ? 0x59d64a : 0x3d8bff, 1).fillRoundedRect(cx - 268, y + 28, Math.max(26, 326 * p), 26, 13);
    m.add(bar);
    m.add(txt(scene, cx - 105, y + 41, `${fmt(s.progress)} / ${fmt(q.target)}`, 20));
    // Reward and claim.
    m.add(scene.add.image(cx + 120, y - 30, rewardIcon(q.reward)).setDisplaySize(52, 52));
    m.add(txt(scene, cx + 152, y - 30, q.reward.chest ? chestName(q.reward.chest) : rewardText(q.reward), 20, "#ffd93b", [0, 0.5]).setWordWrapWidth(140).setAlign("left"));
    if (s.claimed) m.add(checkMark(scene, cx + 200, y + 34, 50));
    else claimButton(cx + 200, y + 36, done, () => claimQuest(s.id));
  });

  // Bonus for finishing all of today's quests.
  if (d.quests.length) {
    const y = cy + 330;
    const all = d.quests.every((q) => q.claimed);
    const bonus: Reward = { coins: ECONOMY.questBonusCoins, gems: ECONOMY.questBonusGems, chest: null };
    m.add(scene.add.image(cx - 250, y, "item:gift_box").setDisplaySize(90, 90));
    m.add(txt(scene, cx - 190, y - 18, "ALL QUESTS BONUS", 28, "#fff4c2", [0, 0.5]));
    m.add(txt(scene, cx - 190, y + 20, rewardText(bonus), 24, "#7fffd4", [0, 0.5]));
    if (d.bonusClaimed) m.add(checkMark(scene, cx + 200, y, 50));
    else claimButton(cx + 200, y, all, claimQuestBonus);
  }
  m.add(txt(scene, cx, cy + 445, `New quests in ${inTime(msToNextDay())}`, 24, "#c9d2ff"));
}

