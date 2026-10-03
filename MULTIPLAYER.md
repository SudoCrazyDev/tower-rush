# Multiplayer: infrastructure and tech-stack plan

Draft, 2026-10-04. Covers ROADMAP section 5 (PvP and co-op). Nothing here is built yet.
Decisions marked **(recommended)** are my pick; the open questions at the end are yours.

## Where the code is today

- **The battle is tied to Phaser.** All game rules live in `BattleScene.ts` (1,270 lines) and
  `battle/Unit.ts` / `battle/Monster.ts`, mixed in with sprites, tweens and the HUD. A unit
  object *is* its sprite.
- **It isn't repeatable.**
  - Each frame advances by however long the frame took (`delta`, capped at 50 ms), and 2x speed
    scales that.
  - Randomness (crits, dodges, chest-style rolls, start cooldowns) comes from `Math.random()` in
    about 16 places.
  - So the same inputs never produce the same battle twice.
- **The server only speaks HTTP.** It's a Cloudflare Worker (Hono + D1) with no realtime
  channel. Solo battles report a wave number, and the server caps it by elapsed time.
  That's the anti-cheat gap in the ROADMAP.

Any multiplayer design has to fix the first two points. That same work also closes the solo
anti-cheat gap, so it pays off even before PvP ships.

## The core decision: how two players stay in sync

A tower-defense match has **many moving things** (dozens of monsters, shots, effects) but
**very few player actions**: summon, merge, power-up, hero ability, roughly one a second.
That shapes the choice.

| Model | How it works | Verdict |
|---|---|---|
| Relay only | Each client simulates its own board and tells the server/opponent what happened | Cheap, but the cheater's client decides the result. No. |
| Server streams state | Server runs every match and sends positions ~10x a second; clients just draw | Safe, but heavy traffic, and every tap waits a round trip before anything shows |
| **Shared deterministic sim + input relay (recommended)** | One simulation module that gives identical results from the same seed and inputs. Clients run it for instant feedback and send only their actions. The server runs the same module headless and is the authority. | Tiny traffic (actions only), instant feel, cheat-proof. Needs the sim extracted and made repeatable. |

How the recommended model plays out:
- An action is tagged with the tick it takes effect (now + ~3 ticks, to absorb latency).
- Every second the server sends a checksum of the battle state. If a client disagrees, the
  server sends it a full snapshot and it carries on from there. So a rare mismatch between
  browsers self-corrects instead of breaking the match.
- The server's copy decides who won and the rewards.

## Step 0: extract the simulation (prerequisite, also fixes solo cheating)

Move the rules into **`shared/sim/`**: plain TypeScript with no Phaser, so the game, the
server and a bot can all run it.

- **Fixed tick:** 20 per second (50 ms). The game runs as many ticks as fit in each frame;
  2x speed means twice as many.
- **Seeded random:** every roll comes from a small generator (e.g. sfc32) seeded per match.
  No `Math.random` in rules code.
- **Events out, drawing separate:** the sim emits events ("monster spawned", "hit for 340",
  "unit merged", "boss power"). `BattleScene` becomes a renderer that turns events and state
  into sprites, tweens and sound.
- **Repeatable maths:**
  - Rules code avoids `Math.sin/cos/atan2/pow` where it can. Browsers may differ in the last
    bit for these.
  - `+ - * / sqrt` are exact everywhere.
  - Angles that only affect visuals stay in the renderer.

**Solo payoff:** a finished solo battle uploads its seed and action log (a few KB). The server
replays it in milliseconds and pays rewards for the wave it actually reached.

This is the biggest single task, a careful refactor of ~1,700 lines. It needs tests that
replay recorded battles and compare the results, which also starts ROADMAP section 1.

## Tech stack

| Piece | Choice | Why |
|---|---|---|
| Realtime transport | **WebSockets into a Durable Object**, one per match | The API is now a Cloudflare Worker (see DEPLOY.md). A Durable Object holds both players' sockets and the match state in one place. With WebSocket hibernation it costs nothing while idle. |
| Message format | JSON to start: `{t:"input", tick, action}` | A few messages a second per player. Switch to binary only if profiling says so. |
| Match runtime | The match's Durable Object runs the shared sim at 20 ticks/s | Each match is isolated and Cloudflare places it near the players. Running the sim server-side all match long likely needs the Workers Paid plan ($5/month); the Free plan's CPU limits are tight for it. |
| Frameworks considered | Colyseus, Nakama, plain `ws` on a VPS | They'd add a second stack to run next to the Worker. Durable Objects give rooms, sockets and per-match state natively. |
| Matchmaking | A matchmaker Durable Object with a queue by trophy band that widens every few seconds; **a bot after ~10 s** | With few players online, real opponents will be rare at first. The bot plays with the same sim and a simple policy (summon when affordable, merge pairs). It's what Rush Royale does too. |
| Rating | Trophies (already exist) for display and leagues; hidden rating (Elo/Glicko) added later if matches feel unfair | Keeps leagues working unchanged |
| Storage | D1 (already live). New `matches` table: mode, players, seed, config version, result, action log | The log allows replays, disputes and bot training. Live match state stays in the Durable Object; D1 only gets the result. |
| Config | A match pins the config version; both clients load that version before it starts | A balance publish mid-queue can't split a match |
| Reconnect | The match lives on the server for 60 s after a disconnect; the client rejoins and gets a snapshot plus the actions since | Phones drop connections all the time |

## Hosting

Decided 2026-10-04: **all on Cloudflare**, and live already (see [DEPLOY.md](DEPLOY.md)):
- A Worker serves the API, the game and the admin panel.
- D1 is the database.
- R2 holds the art.

Multiplayer adds Durable Objects to the same Worker: one per match, plus one matchmaker.

## Which mode first

**PvP first (recommended).** Trophies, leagues and the leaderboard already exist and become
much more meaningful against people. The bot fallback means it works on day one with few
players.

**Co-op second.** It reuses everything: the same sim with two players on one path, and the
same rooms and reconnect. It's mainly invite-a-friend by code, so it needs a friends list or
at least join codes. That's where the friends/clan icons come in.

Emotes ship with PvP: a fixed set of 12 with no free text, so there's nothing to moderate.
Chat is a moderation commitment; leave it out until there's a community asking for it.

## Milestones

1. **Sim extraction.** `shared/sim/` plus `BattleScene` as renderer; replay tests; solo battles
   verified by replay on the server. Players see no difference, and cheating stops working.
2. **Realtime server.** Match Durable Object with a WebSocket endpoint, auth with the existing session token, rooms, server-run
   matches, checksums and snapshots, reconnect. Test it with two browser tabs.
3. **PvP mode.**
   - Versus screen using `pvp_versus_background`.
   - Opponent's board shown small; monsters you kill are sent to the opponent.
   - Match results go through the existing trophies and leagues.
   - Bot fallback and emotes.
4. **Admin.** Live matches count, recent match list with replay, PvP win rates per card on
   Analytics, matchmaking and bot settings in the config.
5. ~~**Hosting**~~ done: Cloudflare Workers + D1 + R2.
6. **Co-op**, then friends and join codes.

## Open questions for you

1. **PvP or co-op first?** I'd go PvP with bots.
2. ~~Hosting~~ decided: Cloudflare.
3. **Workers Paid plan** ($5/month) when PvP starts? The server-side match simulation needs it.
4. **Friends, clans and chat:** in scope for this round, or later?
5. **OK to start with Step 0 alone?** It's invisible to players but unblocks everything else.
