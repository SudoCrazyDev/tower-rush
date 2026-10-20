/**
 * Offline Arena (2.10): when boot can't reach the server, a player who has played on this
 * device before can still run Arena battles as practice. The last config, profile, account
 * and asset index are kept in localStorage while online; offline they stand in for the
 * server's. Offline runs save nothing and pay nothing (rewards stay server-authoritative).
 */
import type { AssetIndex } from "./assets";
import type { GameConfig } from "../../shared/config.ts";
import type { Profile } from "../../shared/profile.ts";

/** One key per part, so saving the small profile doesn't rewrite the big config and index. */
const PARTS = ["config", "profile", "account", "index"] as const;
const key = (part: string) => `tower-rush-offline-${part}`;

export interface Snapshot {
  config?: GameConfig;
  profile?: Profile;
  account?: Record<string, unknown>;
  index?: AssetIndex;
}

/** True once the player chose PLAY OFFLINE at boot (until the page reloads). */
export let offline = false;
export const goOffline = () => void (offline = true);

export function readSnapshot(): Snapshot {
  const s: Record<string, unknown> = {};
  for (const part of PARTS) {
    try {
      const v = localStorage.getItem(key(part));
      if (v) s[part] = JSON.parse(v);
    } catch {
      // Blocked or corrupt: that part is missing.
    }
  }
  return s as Snapshot;
}

/** Store these parts. Skipped offline, so practice never overwrites real progress. */
export function saveSnapshot(part: Snapshot) {
  if (offline) return;
  for (const [k, v] of Object.entries(part)) {
    try {
      localStorage.setItem(key(k), JSON.stringify(v));
    } catch {
      // Storage full or blocked: offline play just won't be offered.
    }
  }
}

export function clearSnapshot() {
  for (const part of PARTS) {
    try {
      localStorage.removeItem(key(part));
    } catch {
      // Nothing stored.
    }
  }
}

/** Offline play needs everything the lobby and a battle read. */
export function canPlayOffline() {
  const s = readSnapshot();
  return !!(s.config && s.profile && s.account && s.index);
}
