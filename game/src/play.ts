/**
 * One battle at a time per player (see server/src/play.ts). Claim the play slot before a
 * solo battle or PvP; if another device has it, ask whether to play here instead. While
 * playing, a heartbeat keeps the slot; if another device takes over, `onPlayLost` fires.
 */
import { ApiError, deviceId, getToken, post } from "./api";
import { ensureCss } from "./authOverlay";

export type PlayKind = "battle" | "pvp";

const BEAT_MS = 10_000;

let beat: ReturnType<typeof setInterval> | null = null;
let lost: (() => void) | null = null;

/**
 * Claim the slot for `kind`, asking first if another device is playing. Resolves false if
 * the player chose not to play here. Without a connection it lets them play (the server
 * won't record the battle either).
 */
export async function claimPlay(kind: PlayKind): Promise<boolean> {
  try {
    await post("/play/claim", { kind });
  } catch (e) {
    if (e instanceof ApiError && e.status === 409 && e.data.error === "busy") {
      if (!(await askTakeover(e.data.kind === "pvp" ? "pvp" : "battle"))) return false;
      try {
        await post("/play/claim", { kind, takeover: true });
      } catch {
        return false;
      }
    }
  }
  startBeat();
  return true;
}

/** Called (once) if another device takes over while this one plays. */
export function onPlayLost(fn: (() => void) | null) {
  lost = fn;
}

/** Done playing: stop the heartbeat and free the slot. */
export function releasePlay() {
  if (!beat) return;
  stopBeat();
  post("/play/release").catch(() => {});
}

function startBeat() {
  stopBeat();
  beat = setInterval(async () => {
    const r = await post<{ held: boolean }>("/play/beat").catch(() => null);
    if (!r || r.held || !beat) return;
    stopBeat();
    const fn = lost;
    lost = null;
    fn?.();
  }, BEAT_MS);
}

function stopBeat() {
  if (beat) clearInterval(beat);
  beat = null;
}

// Closing the tab frees the slot straight away (otherwise it lapses after 30 s).
addEventListener("pagehide", () => {
  if (!beat) return;
  const token = getToken();
  fetch("/api/play/release", { method: "POST", keepalive: true, headers: { "X-Device": deviceId, ...(token ? { Authorization: `Bearer ${token}` } : {}) } }).catch(() => {});
});

const TAKEOVER_TEXT: Record<PlayKind, string> = {
  battle: "You have a battle running on another device. Play here instead? That battle will end there, and its progress so far is saved.",
  pvp: "You're in PvP on another device. Play here instead? It will leave there; a match in progress counts as a surrender.",
};

/** "Playing on another device" box (same look as the sign-in panel). Resolves true to play here. */
function askTakeover(kind: PlayKind): Promise<boolean> {
  ensureCss();
  return new Promise((resolve) => {
    const root = document.createElement("div");
    root.className = "tr-auth";
    root.innerHTML = `
      <form>
        <h2>Playing elsewhere</h2>
        <p></p>
        <button type="button" class="primary">PLAY HERE</button>
        <button type="button" class="link">Cancel</button>
      </form>`;
    root.querySelector("p")!.textContent = TAKEOVER_TEXT[kind];
    document.body.appendChild(root);
    const done = (yes: boolean) => {
      root.remove();
      resolve(yes);
    };
    (root.querySelector(".primary") as HTMLButtonElement).onclick = () => done(true);
    (root.querySelector(".link") as HTMLButtonElement).onclick = () => done(false);
    root.onclick = (e) => e.target === root && done(false);
  });
}
