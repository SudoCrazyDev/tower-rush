import Phaser from "phaser";
import { W, WIDE, NAVY, button, iconButton, modal, pressable, txt } from "../ui";
import { canInstall, install, isInstalled, isIos, onInstallable } from "../pwa";

/** When the player last closed the lobby's install pill; it stays away for a week. */
const HIDE_KEY = "tower-rush-install-hidden";
const HIDE_MS = 7 * 86_400_000;

function hidden() {
  try {
    return Date.now() - (Number(localStorage.getItem(HIDE_KEY)) || 0) < HIDE_MS;
  } catch {
    return false;
  }
}

function hide() {
  try {
    localStorage.setItem(HIDE_KEY, String(Date.now()));
  } catch {
    // Shown again next visit.
  }
}

/**
 * Lobby pill offering the app, in the event strip's spot (above the buttons on phones, the top
 * bar on wide screens). Only where it can be installed: the browser offered it, or iPhone/iPad
 * Safari (by hand). If the browser offers it after the lobby is up, the pill appears then.
 */
export function installStrip(scene: Phaser.Scene) {
  if (isInstalled() || hidden()) return;
  if (!canInstall() && !isIos()) {
    const off = onInstallable(() => {
      off();
      if (scene.sys.isActive()) installStrip(scene);
    });
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, off);
    return;
  }
  const w = WIDE ? 420 : 470;
  const h = 58;
  const g = scene.add.graphics();
  g.fillStyle(NAVY, 0.92).fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
  g.lineStyle(3, 0xd9a441, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
  // A download arrow into a tray.
  g.lineStyle(5, 0x7dff8a, 1);
  g.lineBetween(-w / 2 + 34, -15, -w / 2 + 34, 7).lineBetween(-w / 2 + 24, -2, -w / 2 + 34, 9).lineBetween(-w / 2 + 44, -2, -w / 2 + 34, 9);
  g.lineBetween(-w / 2 + 20, 16, -w / 2 + 48, 16);
  const label = txt(scene, -w / 2 + 64, 0, isIos() ? "ADD TO HOME SCREEN" : "INSTALL THE APP", 26, "#fff4c2", [0, 0.5]);
  const c = scene.add.container(WIDE ? 24 + w / 2 : W / 2, WIDE ? 38 : 1442, [g, label]).setSize(w - 60, h);
  pressable(c, () => installModal(scene, () => c.destroy()));
  const x = iconButton(scene, c.x + w / 2 - 30, c.y, "close", 44, () => {
    hide();
    c.destroy();
    x.destroy();
  });
  c.once(Phaser.GameObjects.Events.DESTROY, () => x.active && x.destroy());
}

/** Explains the app and installs it, or says how where the browser has no install prompt. `onDone` runs once installed. */
export function installModal(scene: Phaser.Scene, onDone?: () => void) {
  if (isInstalled()) return;
  let off = () => {};
  const m = modal(scene, 620, 660, "INSTALL APP", () => off());
  const { cx, cy } = m;
  const logo = scene.add.image(cx, cy - 115, "ui:logo");
  logo.setScale(300 / logo.width);
  m.add(logo);
  m.add(txt(scene, cx, cy + 55, "Its own home-screen icon,\nfull screen and faster loading.", 26, "#c9d2ff"));
  if (canInstall()) {
    m.add(
      button(scene, cx, cy + 200, 380, 96, "INSTALL", "green", async () => {
        m.close();
        if (await install()) onDone?.();
      }, 36),
    );
  } else if (isIos()) {
    m.add(txt(scene, cx, cy + 190, "In Safari, tap Share,\nthen Add to Home Screen.", 28, "#ffffff"));
  } else {
    m.add(txt(scene, cx, cy + 195, "Open your browser's menu and pick\nInstall app or Add to Home screen.\nAlready installed? Open it from\nyour home screen.", 24, "#ffffff"));
    // The browser may still offer the install (it waits for some interaction first): switch then.
    off = onInstallable(() => {
      off();
      if (!scene.sys.isActive()) return;
      m.close();
      installModal(scene, onDone);
    });
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, off);
  }
}
