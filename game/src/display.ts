/**
 * Two layouts, picked once at startup:
 * - portrait (phones): 752x1640, arena on top, HUD below.
 * - wide (desktop/landscape): arena-height canvas (1344) as wide as the window allows,
 *   arena in the middle and the HUD in side panels.
 * `?layout=wide|portrait` forces one (handy for testing).
 */
const params = new URLSearchParams(location.search);

function pickLayout() {
  const forced = params.get("layout");
  const aspect = innerWidth / Math.max(1, innerHeight);
  const wide = forced ? forced === "wide" : aspect > 1.2;
  if (!wide) return { wide, w: 752, h: 1640 };
  return { wide, w: Math.round(Math.min(2900, Math.max(1700, 1344 * aspect))), h: 1344 };
}
export const LAYOUT = pickLayout();

/**
 * Render scale. Game coordinates stay W x H, but in the wide layout the canvas is drawn at
 * the screen's real pixel density (in steps of 0.25, up to 2x), so big and high-DPI screens
 * get sharp art instead of an upscaled 1344px-tall canvas. `?res=1.5` forces one.
 */
function pickRes() {
  const forced = Number(params.get("res"));
  if (forced) return Math.min(2, Math.max(1, forced));
  if (!LAYOUT.wide) return 1;
  const fit = Math.min(innerWidth / LAYOUT.w, innerHeight / LAYOUT.h) * (devicePixelRatio || 1);
  return Math.min(2, Math.max(1, Math.floor(fit * 4) / 4));
}
export const RES = pickRes();

/** Ambient background videos; off with `?novideo` or when the system asks for reduced motion. */
export const VIDEO = !params.has("novideo") && !matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Load the HD sprite sheets when rendering above 1x. `?hd=1|0` forces it on or off. */
export const HD = params.has("hd") ? params.get("hd") !== "0" : RES > 1;
