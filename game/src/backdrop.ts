import Phaser from "phaser";
import { BASE, assetIndex } from "./assets";
import { VIDEO } from "./display";

type Fit = (v: Phaser.GameObjects.Video, width: number, height: number) => void;

/**
 * An ambient video (location loop or trailer, muted) laid over a static picture of the same
 * scene. It stays invisible until its first frame is ready and then fades in, so the picture
 * underneath is the fallback when video is off, blocked or still downloading. `fit` sizes it
 * once its dimensions are known. Returns null when there's no such video or video is off.
 */
export function ambientVideo(scene: Phaser.Scene, name: string, fit: Fit, loop = true) {
  if (!VIDEO || !assetIndex().videos?.includes(name)) return null;
  const v = scene.add.video(0, 0).setAlpha(0);
  // Loaded "with audio" and muted by hand: Phaser's no-audio mode sets `autoplay`, and if the
  // browser starts it first, `play()` thinks it's already running and never grabs frames.
  // "anonymous": the video may come from the art bucket on another origin, and WebGL can only
  // draw cross-origin video that was fetched with CORS.
  v.loadURL(`${BASE}video/${name}.mp4`, false, "anonymous");
  if (v.video) v.video.muted = v.video.defaultMuted = true;
  v.once(Phaser.GameObjects.Events.VIDEO_CREATED, (_v: unknown, width: number, height: number) => {
    fit(v, width, height);
    scene.tweens.add({ targets: v, alpha: 1, duration: 500 });
  });
  // Chrome can interrupt the first play() (e.g. "paused to save power"); try again a few times.
  let retries = 3;
  v.on(Phaser.GameObjects.Events.VIDEO_ERROR, () => {
    if (retries-- > 0) scene.time.delayedCall(600, () => v.active && v.play(loop));
  });
  v.play(loop);
  // Chrome may also pause it silently later (background power saving); nudge loops back on.
  if (loop) {
    const watchdog = scene.time.addEvent({
      delay: 2000,
      loop: true,
      callback: () => {
        if (!v.active || !v.video) return watchdog.remove();
        if (v.video.paused) v.video.play().catch(() => {});
      },
    });
  }
  return v;
}

let clips = 0;

/**
 * v2.10: a one-shot clip (video story panel, front-shift transition) drawn into a canvas texture every frame.
 * It doesn't wait on Phaser's video frame callbacks, which can stall for a video started mid-scene. The image
 * stays invisible until the first frame is in, then fades in; `ready` sizes it. `ended` fires when the clip
 * ends (the last frame stays up). Returns null when there's no such video or video is off.
 */
export function clipImage(scene: Phaser.Scene, name: string, ready: (img: Phaser.GameObjects.Image, width: number, height: number) => void, ended?: () => void) {
  if (!VIDEO || !assetIndex().videos?.includes(name)) return null;
  const el = document.createElement("video");
  el.muted = el.defaultMuted = true;
  el.playsInline = true;
  el.crossOrigin = "anonymous";
  el.preload = "auto";
  el.src = `${BASE}video/${name}.mp4`;
  const key = `clip:${name}:${++clips}`;
  let tex: Phaser.Textures.CanvasTexture | null = null;
  const img = scene.add.image(0, 0, "__WHITE").setAlpha(0);
  const draw = () => {
    if (!tex || el.readyState < 2) return;
    tex.context.drawImage(el, 0, 0, tex.width, tex.height);
    tex.refresh();
  };
  el.addEventListener("loadeddata", () => {
    if (!img.active || tex) return;
    tex = scene.textures.createCanvas(key, el.videoWidth, el.videoHeight);
    if (!tex) return;
    draw();
    img.setTexture(key);
    ready(img, el.videoWidth, el.videoHeight);
    scene.tweens.add({ targets: img, alpha: 1, duration: 300 });
  });
  el.addEventListener("ended", () => img.active && ended?.());
  scene.events.on(Phaser.Scenes.Events.UPDATE, draw);
  img.once(Phaser.GameObjects.Events.DESTROY, () => {
    scene.events.off(Phaser.Scenes.Events.UPDATE, draw);
    el.pause();
    el.removeAttribute("src");
    el.load();
    if (scene.textures.exists(key)) scene.textures.remove(key);
  });
  el.play().catch(() => {});
  return img;
}

/** Fit that scales the video to cover a `w` x `h` area centred on it. */
export const coverFit =
  (w: number, h: number): Fit =>
  (v, vw, vh) =>
    v.setPosition(w / 2, h / 2).setScale(Math.max(w / vw, h / vh));
