/** The player's inbox (lobby MAIL button): admin announcements and gifts to claim. */
import Phaser from "phaser";
import { rewardText } from "../../../shared/daily.ts";
import { chestById } from "../../../shared/profile.ts";
import { needsAttention } from "../../../shared/mail.ts";
import { mail, readMail, claimMail, deleteMail, type MailMessage, type Claimed } from "../save";
import { txt, button, modal, NAVY, attempt } from "../ui";
import { RES } from "../display";
import { checkMark, rewardIcon, rewardPopup } from "./daily";

export const MAIL_ICON = "gen:mail";

/** A round envelope button, drawn once into a texture (there's no mail icon in the art pack). */
export function mailIcon(scene: Phaser.Scene) {
  if (scene.textures.exists(MAIL_ICON)) return MAIL_ICON;
  const s = 256;
  const g = scene.make.graphics({}, false);
  g.fillStyle(NAVY, 1).fillCircle(s / 2, s / 2 + 6, s / 2 - 6);
  g.fillStyle(0xf2b630, 1).fillCircle(s / 2, s / 2, s / 2 - 8);
  g.fillStyle(0x3d6bd8, 1).fillCircle(s / 2, s / 2, s / 2 - 26);
  // Envelope: body, then the flap's outline.
  const [l, r, t, b] = [56, 200, 78, 178];
  g.fillStyle(NAVY, 1).fillRoundedRect(l - 6, t - 2, r - l + 12, b - t + 14, 16);
  g.fillStyle(0xffffff, 1).fillRoundedRect(l, t, r - l, b - t, 12);
  g.lineStyle(9, 0xb9c4ec, 1).beginPath().moveTo(l + 6, t + 8).lineTo(s / 2, t + 62).lineTo(r - 6, t + 8).strokePath();
  g.generateTexture(MAIL_ICON, s, s);
  g.destroy();
  return MAIL_ICON;
}

const chestName = (id: string) => chestById(id)?.name ?? id;

function ago(ms: number) {
  const s = (Date.now() - ms) / 1000;
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function expiresIn(at: number) {
  const h = Math.max(0, (at - Date.now()) / 3600_000);
  return h < 1 ? "Expires soon" : h < 48 ? `Expires in ${Math.floor(h)}h` : `Expires in ${Math.floor(h / 24)}d`;
}

const giftText = (m: MailMessage) =>
  m.reward ? [m.reward.chest && chestName(m.reward.chest), (m.reward.coins || m.reward.gems) && rewardText({ ...m.reward, chest: null })].filter(Boolean).join(" + ") : "";

/** The message list. `onDone` runs when it closes (the lobby restarts to refresh its badge). */
export function inboxModal(scene: Phaser.Scene, onDone: () => void) {
  const h = 1180;
  const m = modal(scene, 680, h, "MAIL", onDone);
  const { cx, cy } = m;
  const top = cy - h / 2;
  const list = mail.messages;
  if (!list.length) {
    m.add(scene.add.image(cx, cy - 80, mailIcon(scene)).setDisplaySize(180, 180).setAlpha(0.6));
    m.add(txt(scene, cx, cy + 60, "No messages.", 34, "#c9d2ff"));
    m.add(txt(scene, cx, cy + 110, "News and gifts from the team show up here.", 22, "#8f9ad0"));
    return m;
  }

  const ROW = 130;
  const viewTop = top + 90;
  const viewH = h - 150;
  // Not inside the dialog's container: a mask on a nested container is ignored.
  const rows = scene.add.container(0, viewTop).setDepth(m.depth + 1).setScrollFactor(0).setAlpha(0);
  scene.tweens.add({ targets: rows, alpha: 1, duration: 140 });
  // Next tick: this runs from a row's own pointer handler, and closing destroys the row.
  const open = (msg: MailMessage) =>
    scene.time.delayedCall(0, () => {
      m.destroy();
      messageModal(scene, msg, onDone);
    });

  list.forEach((msg, i) => {
    const y = i * ROW + ROW / 2;
    const fresh = needsAttention(msg);
    const g = scene.add.graphics();
    g.fillStyle(fresh ? 0x2a3378 : NAVY, fresh ? 0.95 : 0.7).fillRoundedRect(cx - 300, y - ROW / 2 + 6, 600, ROW - 12, 18);
    if (msg.reward && !msg.claimed) g.lineStyle(4, 0x59d64a, 1).strokeRoundedRect(cx - 300, y - ROW / 2 + 6, 600, ROW - 12, 18);
    const icon = scene.add.image(cx - 240, y, msg.reward ? rewardIcon(msg.reward) : mailIcon(scene)).setDisplaySize(80, 80);
    if (!fresh) icon.setAlpha(0.6);
    const title = msg.title.length > 26 ? `${msg.title.slice(0, 25)}…` : msg.title;
    const sub = msg.reward ? (msg.claimed ? "Gift claimed" : `Gift: ${giftText(msg)}`) : msg.body.replace(/\s+/g, " ");
    const parts: Phaser.GameObjects.GameObject[] = [
      g,
      icon,
      txt(scene, cx - 180, y - 22, title, 28, fresh ? "#ffffff" : "#9aa3c9", [0, 0.5]),
      txt(scene, cx - 180, y + 18, sub.length > 38 ? `${sub.slice(0, 37)}…` : sub, 20, msg.reward && !msg.claimed ? "#7dff7a" : "#8f9ad0", [0, 0.5]),
      txt(scene, cx + 285, y - 30, ago(msg.createdAt), 18, "#8f9ad0", [1, 0.5]),
    ];
    if (msg.expiresAt) parts.push(txt(scene, cx + 285, y + 34, expiresIn(msg.expiresAt), 16, "#ffb0b0", [1, 0.5]));
    // Unread dot.
    if (!msg.read) parts.push(scene.add.circle(cx - 282, y - 40, 10, 0xe8333a).setStrokeStyle(3, 0xffffff));
    if (msg.claimed) parts.push(checkMark(scene, cx - 210, y + 28, 36));
    // The whole row opens the message, unless the press turned into a scroll.
    const hit = scene.add.zone(cx, y, 600, ROW - 12).setInteractive({ useHandCursor: true });
    hit.on("pointerup", (p: Phaser.Input.Pointer) => {
      const inView = p.worldY >= viewTop && p.worldY <= viewTop + viewH;
      if (inView && p.getDistance() < 12 * RES) open(msg);
    });
    parts.push(hit);
    rows.add(parts);
  });

  // Scroll by dragging or with the wheel, clipped to the panel.
  const minY = Math.min(viewTop, viewTop - (list.length * ROW - viewH));
  const mask = scene.make.graphics({}, false).fillRect(cx - 320, viewTop, 640, viewH);
  rows.setMask(mask.createGeometryMask());
  let startY = NaN;
  const down = (p: Phaser.Input.Pointer) => (startY = p.worldY > viewTop && p.worldY < viewTop + viewH ? rows.y : NaN);
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
  if (list.length * ROW > viewH) m.add(txt(scene, cx, top + h - 34, "Drag to scroll", 18, "#8f9ad0"));
  return m;
}

/** One message: its text, its gift (with CLAIM), and DELETE once nothing's left to claim. */
function messageModal(scene: Phaser.Scene, msg: MailMessage, onDone: () => void) {
  const h = 1100;
  const m = modal(scene, 680, h, "MAIL", onDone);
  const { cx, cy } = m;
  const top = cy - h / 2;
  if (!msg.read) readMail(msg.id).catch(() => {});
  const back = () => {
    m.destroy();
    inboxModal(scene, onDone);
  };

  m.add(txt(scene, cx, top + 110, msg.title, 36, "#fff4c2").setWordWrapWidth(580));
  m.add(txt(scene, cx, top + 160, msg.expiresAt ? `${ago(msg.createdAt)} · ${expiresIn(msg.expiresAt)}` : ago(msg.createdAt), 20, "#8f9ad0"));

  // Body, shrunk to fit the space left above the gift.
  const bodyTop = top + 200;
  const bodyMax = (msg.reward ? cy + 140 : cy + 360) - bodyTop;
  const body = txt(scene, cx - 280, bodyTop, msg.body, 26, "#ffffff", [0, 0])
    .setWordWrapWidth(560, true)
    .setAlign("left")
    .setStroke("#14183a", 3)
    .setShadow(0, 0);
  for (const size of [22, 19, 16]) if (body.height > bodyMax) body.setFontSize(size);
  if (body.height > bodyMax) body.setCrop(0, 0, body.width, bodyMax);
  m.add(body);

  if (msg.reward) {
    const y = cy + 250;
    const g = scene.add.graphics();
    g.fillStyle(NAVY, 0.9).fillRoundedRect(cx - 300, y - 85, 600, 170, 20);
    if (!msg.claimed) g.lineStyle(5, 0x59d64a, 1).strokeRoundedRect(cx - 300, y - 85, 600, 170, 20);
    m.add(g);
    const icon = scene.add.image(cx - 220, y, rewardIcon(msg.reward)).setDisplaySize(110, 110);
    m.add(icon);
    m.add(txt(scene, cx - 150, y - 26, "GIFT", 26, "#fff4c2", [0, 0.5]));
    m.add(txt(scene, cx - 150, y + 16, giftText(msg), 22, "#ffd93b", [0, 0.5]).setWordWrapWidth(250).setAlign("left"));
    if (msg.claimed) {
      icon.setAlpha(0.45);
      m.add(checkMark(scene, cx - 220, y, 70));
      m.add(txt(scene, cx + 200, y, "Claimed", 30, "#7dff7a"));
    } else {
      scene.tweens.add({ targets: icon, scale: icon.scale * 1.1, yoyo: true, repeat: -1, duration: 500 });
      const b = button(scene, cx + 190, y, 190, 90, "CLAIM", "green", () => {
        b.setEnabled(false);
        let got: Claimed | null = null;
        attempt(scene, async () => (got = await claimMail(msg.id))).then((ok) => {
          m.destroy();
          if (ok && got) rewardPopup(scene, "GIFT", got, () => inboxModal(scene, onDone));
          else inboxModal(scene, onDone);
        });
      }, 34);
      m.add(b);
    }
  }

  const canDelete = !msg.reward || msg.claimed;
  m.add(button(scene, canDelete ? cx - 150 : cx, top + h - 100, 260, 96, "BACK", "blue", back, 34));
  if (canDelete) {
    const d = button(scene, cx + 150, top + h - 100, 260, 96, "DELETE", "red", () => {
      d.setEnabled(false);
      attempt(scene, () => deleteMail(msg.id)).then(back);
    }, 34);
    m.add(d);
  }
  return m;
}
