/**
 * PvP connections (see PVP.md): the matchmaking queue and the live match room, both
 * WebSockets to the server's Durable Objects. The session token goes in the subprotocol
 * list, since browsers can't set headers on a WebSocket.
 */
import { getToken, post } from "./api";
import type { ClientMsg, MatchSetup, PvpMode, ServerMsg } from "../../shared/pvp.ts";
import type { Profile, Promotion } from "../../shared/profile.ts";

const PROTOCOL = "tower-rush";

function socket(path: string) {
  const url = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/api${path}`;
  return new WebSocket(url, [PROTOCOL, getToken() ?? ""]);
}

export type QueueEvent =
  | { t: "queued"; players: number }
  /** A friend challenge is open: share this code. */
  | { t: "code"; code: string; expiresAt: number }
  | { t: "matched"; matchId: string; you: 0 | 1 }
  | { t: "bot"; setup: MatchSetup; now: number }
  | { t: "closed"; reason: string };

/** How to find an opponent: a mode's queue, a new friend challenge, or a friend's code. */
export type Search = { mode: PvpMode } | { challenge: PvpMode } | { join: string };

/** Start searching. Returns a function that gives up. */
export function joinQueue(search: Search, on: (e: QueueEvent) => void) {
  const query = "join" in search ? `join=${encodeURIComponent(search.join)}` : "challenge" in search ? `mode=${search.challenge}&challenge=host` : `mode=${search.mode}`;
  const ws = socket(`/pvp/queue?${query}`);
  let done = false;
  ws.onmessage = (e) => {
    const msg = JSON.parse(String(e.data)) as QueueEvent;
    if (msg.t === "matched" || msg.t === "bot") done = true;
    on(msg);
  };
  ws.onclose = (e) => {
    if (!done) on({ t: "closed", reason: e.reason || "Lost the connection to the server" });
  };
  return () => {
    done = true;
    if (ws.readyState === WebSocket.OPEN) ws.send("leave");
    ws.close();
  };
}

/**
 * The live match: messages from the room come to `on`; `send` queues while reconnecting.
 * A dropped connection retries for as long as the room keeps the match (60 s).
 */
export class MatchConn {
  readonly matchId: string;
  private ws: WebSocket | null = null;
  private outbox: string[] = [];
  private closed = false;
  private retries = 0;
  on: (msg: ServerMsg) => void = () => {};
  onStatus: (connected: boolean) => void = () => {};

  constructor(matchId: string) {
    this.matchId = matchId;
    this.open();
  }

  private open() {
    const ws = (this.ws = socket(`/pvp/match/${this.matchId}`));
    ws.onopen = () => {
      this.retries = 0;
      this.onStatus(true);
      for (const m of this.outbox.splice(0)) ws.send(m);
    };
    ws.onmessage = (e) => this.on(JSON.parse(String(e.data)) as ServerMsg);
    ws.onclose = () => {
      if (this.closed) return;
      this.onStatus(false);
      if (this.retries++ < 20) setTimeout(() => !this.closed && this.open(), Math.min(3000, 500 * this.retries));
    };
  }

  send(msg: ClientMsg) {
    const s = JSON.stringify(msg);
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(s);
    // Snapshots go stale; everything else waits for the reconnect.
    else if (msg.t !== "snap") this.outbox.push(s);
  }

  close() {
    this.closed = true;
    this.ws?.close();
  }
}

export interface BotFinish {
  result: { winner: 0 | 1 | null; trophies: [number, number]; coins: [number, number] };
  promotions: Promotion[];
  profile: Profile | null;
}

/** Report a bot match (played entirely here); the server pays the rewards. */
export const finishBotMatch = (id: string, body: { result: "win" | "loss" | "draw" | "left"; seconds: number; stats: unknown; log: unknown }) =>
  post<BotFinish>(`/pvp/matches/${id}/finish`, body);
