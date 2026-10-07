# v2.0.0 "The Grand Revamp"

**Status:** Building (branch `v2-grand-revamp`; code feature-complete 2026-10-07, playtest pending) · **Target version:** `2.0.0` (tag `v2.0.0`) ·
**Promo kit:** [PROMO.md](PROMO.md) (to write)

The first major version. It has three parts:

1. **One combat engine.** The solo battle stops keeping its own copy of the combat rules and runs
   on the shared `Sim`, the same engine PvP and the Playground use. Every rule then lives in
   one place.
2. **Composable units.** A unit gets a *kit*: one primary archetype plus any number of extra
   archetypes, each with its own numbers, and any number of perks, each with its own value. For
   example, Lance Knight could pierce 3 monsters, Monkey King 5, and Void Titan could be a Sniper
   that also Executes. **v2 doesn't redesign any unit.** Every unit migrates to exactly what it
   is today, and the designer builds new kits in the admin kit editor.
3. **The art drop.** These art requests are processed, built, uploaded and used in the game:
   perk icons, element emblems, race crests, archetype icons, every VFX group, and generic and
   signature weapons, with a melee strike effect.

**Out of scope:** marketing requests (26), player avatars, the remaining awakened art,
website images, monster trait icons, UI glyphs and the extra emotes. These are deferred to a
later release.

---

## 1. Where we start (audit, 2026-10-07)

### 1.1 Code

| Fact | Consequence |
|---|---|
| **Combat rules exist twice.** `shared/sim.ts` runs PvP (through `pvpsim.ts`) and the admin Playground. The solo battle (`BattleScene.ts` + `battle/Unit.ts` + `battle/Monster.ts`) is a separate copy that uses `Math.random`. | **Phase P1 merges the engines.** The kit refactor then only touches `Sim`. |
| `UnitDef.arch` is one value. `sim.ts:1354` uses one `switch (def.arch)` in `onHit` for both how the attack lands and what the hit does. | That switch is where attacks and riders split. |
| Archetype numbers are one global block per arch in `config.effects` (`effects.ts DEFAULT_EFFECTS`). | Per-unit numbers need an override layer. |
| `UnitDef.perk` is one value. Perk numbers are code constants (`perks.ts PERK`), not part of the config and not editable in admin. | Perks get values and a config block. |
| In combat, a unit already holds a **list** of perks (`u.perks`; Buff units hand theirs out). | Supporting several perks is cheap. |
| `UnitDef.effect` (rally, irritate, fatigue, shellshock, wages, oath, bane, lantern) is a one-off special added on top of the archetype. | It folds into the kit as "signature" archetypes. |
| PvP is lockstep on the clients: both run `PvpBoard` from the same seed and config, and the server only relays. | Riders must draw `rand()` in a fixed order (kit order), and every number must be in the config. |
| **There are no tests.** Today's checks are `npm run typecheck`, `node scripts/pvp-sim.ts` (replay check) and the Playground. | P0 adds a golden-master test before anything else changes. |
| Saved units keep all their own fields. Migrations are `withStyles` and `withAdded`, plus `HOTFIXES`. | A new `withKits` migration runs on the server (`config-store.ts upgrade`) and in the client's `applyConfig`. |

### 1.2 Art in scope (from D1 `art_requests` plus local files)

| Group | Total | Link pasted ("ready") | Still to generate | In game code today? |
|---|---|---|---|---|
| Perk icons | 7 | 7 | 0 | ❌ none |
| Archetype icons | 26 | 26 | 0 | ❌ none |
| Element emblems | 6 | 6 | 0 | ⚠️ hook exists (`BootScene.ts:99` loads `ui/element_<e>.webp`); the build must output that name |
| Race crests | 18 | 18 | 0 | ❌ `raceBadge` (`ui.ts:285`) is a text plate |
| VFX: projectiles | 26 | 17 across all VFX groups | ~71 across all VFX groups | ✅ `vfx:proj_<proj>` (`BattleScene.ts:1408`); `Proj` needs the new ids |
| VFX: impacts, status, ground, particles, rewards | 62 | (in the 17) | (in the ~71) | ❌ only animated `vfx()`; needs a static-sprite layer |
| Weapons, generic | 46 | 4 | 42 | ❌ no build entry, no renderer |
| Weapons, signature | 6 | 0 | 6 | ❌ same |
| **Total** | **197** | **82** (processed by A0, 2026-10-07) | **~115** | |

The `build_assets.py` STATIC list only covers `vfx` and `ui/emotes`. Folders that need entries:
`ui/races`, `ui/elements`, `ui/archs`, `ui/perks`, `vfx/weapons`, and any new VFX subfolders.
There is no magenta-key tool (`keyimg.py` handles green only). The user generates the
~115 missing items in Higgsfield as usual and pastes the links in admin `#/art`.

---

## 2. The kit model

### 2.1 Data

```ts
/** One archetype in a unit's kit; `tune` overrides that archetype's default numbers. */
interface ArchSlot { arch: Arch; tune?: Record<string, number> }
/** One perk; `value` (and `value2` where a perk has two numbers) overrides its defaults. */
interface PerkSlot { perk: Perk; value?: number; value2?: number }

interface UnitDef {
  // ...
  kit: ArchSlot[];    // replaces arch + effect; kit[0] is the primary
  perks: PerkSlot[];  // replaces perk ([] = no perk)
  role?: string;      // unchanged: Knight/Mercenary logic reads it
}
```

Every archetype has a **kind**, which decides where it can go in a kit:

| Kind | Archetypes | Rule |
|---|---|---|
| **Attack** (how it hits) | shot, sniper, pierce, splash, chain | Must be `kit[0]`. Sets targeting, projectile and who gets hit. |
| **Rider** (what a hit does) | slow, freeze, stun, poison, burn, curse, crit, execute, growth | Any number after `kit[0]`, applied in kit order to every monster the attack hits. |
| **Signature** (unit specials) | rally, irritate, fatigue, shellshock, wages, oath, bane, lantern | Any number after `kit[0]` (the old `effect`). |
| **Solo** (whole job) | mana, buff, aura, aegis, mime, portal, mirror, lucky, hourglass, echo, herald, brewer | Must be `kit[0]`. Mana may also take riders and signatures; the others take nothing. |

- **The migration is 1:1.** `arch: X` becomes `kit: [{arch: X}]`, and an `effect` is added as a
  second slot. A rider arch alone (e.g. old `freeze`) becomes `[{arch: "shot"}, {arch: "freeze"}]`,
  because riders need an attack in front of them. Old `burn` becomes splash + burn, with `tune`
  values that reproduce today's numbers (splash 0.5). P0's golden test proves no unit changes.
- Old `sniper` keeps its "strongest monster" targeting, so Void Titan as sniper + execute
  behaves as you'd expect.
- **No limits:** a kit can be as long as the designer wants. Validation only rejects broken
  kits: a kit that doesn't start with an attack or solo arch, a solo arch after `kit[0]`, or
  a duplicate arch.
- The archetype and perk id strings stay the same. Art keys (`ARCH_ART`, `PERK_ART`, awakened
  art, card prompts) depend on them.

### 2.2 Numbers

- `fx(def, arch)` returns `{ ...EFFECTS[arch], ...slot.tune }`. Per-rank and per-rarity scaling
  stays, and **any** field can be overridden, including `perRank`. Every helper
  (`pierceTargets`, `freezeChance`...) takes the resolved block instead of reading the global
  `EFFECTS`.
- Perk defaults move into the config (`config.perks`, editable on a new admin Perks page). Every
  perk gets a value:

| Perk | `value` means | Default | `value2` |
|---|---|---|---|
| armor_breaker | share of armor ignored | 1.0 | — |
| true_strike | share of dodges ignored | 1.0 | — |
| giant_slayer | bonus vs tanks and bosses | .4 | — |
| hunter | bonus vs fast monsters | .4 | — |
| finisher | bonus vs low HP | .5 | HP threshold .3 |
| frostbite | bonus vs frost-proof | .3 | — |
| plunder | mana per kill | 3 | — |

- Buff units hand on all their perks with their values. If two copies of a perk stack, the
  higher value wins (no double counting).
- `kitSummary(def, rank)` is the one function that describes a whole kit with the unit's own
  numbers. The deck, story screen, Playground, website export and card-prompt script all use it.

---

## 3. Engine merge

The solo battle becomes a **view over `Sim`**:

- `BattleScene` owns a `Sim` and steps it at `SIM_DT`. It draws units, monsters, shots and
  effects from the Sim's state and its `mark` events, and sends player input (summon, merge,
  drag, power-ups, hero abilities) to Sim methods.
- `battle/Unit.ts` and `battle/Monster.ts` become **sprite wrappers** that read their Sim
  counterpart. They hold no combat logic.
- Solo uses a random seed per battle, so it stays unpredictable. The Sim's `rand()` replaces
  `Math.random` in combat.

**Parity first.** Before anything is cut, a parity audit lists every behaviour in
`BattleScene`, `Unit` and `Monster` and checks it against `Sim`: stories and statuses, boss
powers, heroes, tutorial hooks, awakened ultimates, wave flow, rewards and mana. Any gap is
added to `Sim` first, with golden coverage. Then the scene is switched over. The old code
is deleted only after a manual playtest of an arena run, a story chapter and the tutorial.

**Payoffs:** solo, PvP and the Playground can't drift apart any more. The Playground predicts
solo exactly. A solo battle can be replayed from seed plus inputs, which opens the door to
server-checked solo scores later.

---

## 4. Card and UI changes

- **Card face and detail:** a row of **archetype icons** (primary first) and **perk icons**.
  Tapping an icon shows its line from `kitSummary`.
- **Element emblems** replace the old badge slices. **Race crests** replace the text plate
  in `raceBadge` (deck, hero screen).
- **VFX layer:** a static-sprite effects layer in the battle view that `Sim` mark events
  trigger by key: impacts per attack/element, status overlays (frozen, stunned, poisoned,
  cursed, burning, slowed...), ground decals (splash, burn), particles, and reward bursts.
  New projectile ids are added to `Proj`.
- **Weapons:** melee units play a strike sprite on attack (a generic sprite by weapon type,
  a signature sprite for 6 units). Each unit needs a `weapon` field (data entry by Haiku from
  the art-request list).
- **Admin:**
  - **Kit editor** on the Units page: add, remove and reorder archetypes. Each `tune` field
    shows the default beside it, and a "reset" control removes the override. The kit is
    checked against the rules in 2.1 as you edit.
  - **Perks editor** on the Units page (perks list with values) and a **Perks page** for the
    defaults.
  - Effects page: "used by" and "overridden by" per archetype.
  - Playground and Users pages updated for kits.

---

## 5. Build plan

The coordinator (Opus) designs, writes the core types, briefs each agent and reviews every
merge. **Sonnet** subagents do the code. **Haiku** subagents do the purely mechanical text
edits (build entries, data entry, docs copy). Agents that run at the same time work in their
own git worktrees and the coordinator merges them. Every hand-off must pass
`npm run typecheck` and `npm test` (golden + pvp-sim replay).

### Code track

| # | Phase | Who | Depends on | Done when |
|---|---|---|---|---|
| P0 | **Safety net:** `scripts/golden.ts` runs `Sim` with fixed seeds for every unit at ranks 1/4/7, plus a few mixed decks, and records damage, kills, mana and wave reached to `scripts/golden.json`. `npm test` runs it plus `pvp-sim` with replay. | Sonnet | — | Baseline committed |
| P1a | **Parity audit:** a list of every combat or flow behaviour in BattleScene/Unit/Monster, marked "in Sim / missing / differs" | Sonnet (read-only) | — | Audit table in this doc (section 8) |
| P1b | **Close the gaps in Sim** found by P1a, plus golden coverage for them | Sonnet | P0, P1a | Sim matches the audit; golden updated on purpose and reviewed |
| P1c | **Switch solo onto Sim:** BattleScene as a view, Unit/Monster as sprite wrappers, input → Sim | Sonnet (Opus reviews) | P1b | Manual playtest: arena, a story chapter, tutorial, heroes, awakened ultimates |
| P2 | **Kit model:** types, kinds, `fx()`, perk values + `config.perks`, `withKits` (server + client), validation, `kitSummary` | Opus | P1c | Typecheck; golden **identical** to baseline |
| P3 | **Kit combat in Sim:** attack step, then a rider loop and signature hooks from the kit; perk values | Sonnet | P2 | Golden identical (migrated kits); new tests for multi-rider kits and pierce targets 3/5 |
| P4a | **Admin:** kit editor, perks editor, Perks page, Effects "used by"/"overridden by", Playground, Users | Sonnet | P2 | Lance Knight → `pierce {targets: 3}` in admin → Playground and a live battle show 3 |
| P4b | **Text surfaces:** DeckScene card and detail, StoryScene, `export-data.mjs`, `card-prompts.ts` → `kitSummary` | Sonnet | P2 | No direct reads of `def.arch`/`def.perk`/`def.effect` left (grep) |
| P5 | **Kit icons on cards** + tap to explain | Sonnet | P4b, A2 | — |

### Art track (alongside the code)

| # | Phase | Who | Depends on |
|---|---|---|---|
| A0 | **Pipeline:** `scripts/process-art.mjs` reads "ready" rows in scope from D1, downloads them, keys green **and** magenta, and writes `assets/<file>`. Add `build_assets.py` entries for the new folders. Element files are written as `ui/element_<e>.webp`. | Sonnet (script), Haiku (build entries) | — |
| A1 | **Upload the 82 processed items** → build → R2 → mark done. This writes to the live D1 and R2, so confirm with the user first. | Sonnet | A0 |
| A2 | **Icons in the UI:** element emblems, race crests; arch and perk icons loaded for P5 | Sonnet | A0 |
| A3 | **VFX layer** + new projectile ids + weapon strikes, driven by Sim events | Sonnet | A0, P1c |
| A4 | **The user generates the ~115 remaining items** (VFX, weapons) and pastes the links → rerun A1 | User → Sonnet | A0 |
| A5 | **`weapon` field for every melee unit** (data entry from the art-request list) | Haiku | P2 |

### Release

| # | Step | Who |
|---|---|---|
| R1 | "What's new 2.0" copy, `PROMO.md`, `ROADMAP.md` and README table updates | Haiku |
| R2 | Remotion promo (`roadmap-video/src/promo/GrandRevamp.tsx`, `npm run promo:gr`) | Sonnet |
| R3 | `game/package.json` → 2.0.0, Worker deploy, R2 upload, tag `v2.0.0` (confirm with the user first) | Opus |

### Order and parallelism

```
P0 ─┐
P1a ┴► P1b ─► P1c ─► P2 ─┬─► P3 ──────────────────┐
                         ├─► P4a                  │
                         ├─► P4b ─► P5 ◄─ A2      ├─► R1/R2 ─► R3
                         └─► A5                   │
A0 ─┬─► A1 ─► (A4 user) ─► A1 again               │
    ├─► A2                                        │
    └─► A3 (after P1c) ───────────────────────────┘
```

- Up to 4 agents run at once.
- `BattleScene.ts` is the file most likely to conflict, so P1c, A3 and P5 touch it in that
  order, never at the same time.
- `DeckScene.ts` is touched by P4b, then A2, then P5.

---

## 6. Risks

- **Engine merge regressions** (the biggest risk). Feel, timing and visuals of solo battles
  could shift. Mitigated by the parity audit first, golden tests, and a playtest gate before
  the old code is deleted. Branch `v2-engine` merges only after the gate passes.
- **PvP desync:** riders draw `rand()` in kit order on both clients. Covered by the replay
  check in `npm test`.
- **Saved config wins over defaults:** `withKits` must run on the server (`upgrade`) **and**
  the client (`applyConfig`), so neither ever sees a unit with no kit. No HOTFIX is needed,
  because v2 doesn't change any unit.
- **Old clients:** a v1.3 client that loads a v2 config would break. Add a `minClient`
  check to `/config` that forces a reload.
- **Power creep with no limits:** this is a design responsibility. The Playground (now exact
  for solo too) and pvp-sim are the tools for checking kits as they're built.
- **Art cache:** replaced files need `?v=2.0.0` (R2 and browsers cache art for 24 h).

---

## 7. Decisions (2026-10-07)

| # | Decision |
|---|---|
| D1 | **Full engine merge**: solo runs on `Sim`. |
| D2 | **No slot limits** on archetypes or perks. Validation checks only the structural rules in 2.1. |
| D3 | **Art in scope:** perk icons, element emblems, race crests, archetype icons, all VFX, generic and signature weapons with a strike effect. Avatars, remaining awakened art, website images, trait icons, glyphs and emotes are deferred. |
| D4 | **No unit is redesigned** in v2. Migration is 1:1, and the designer builds new kits in admin. |

---

## 8. Parity audit

Done 2026-10-07: see [PARITY.md](PARITY.md). In short, the base `Sim` has no player actions
(they live in `PvpBoard`) and is missing story mode, the tutorial, dragging, brewer taps, the Chaos Taffy tether
and a structured event stream for the renderer. P1b adds all of these.

---

## 9. Progress (2026-10-07)

| Phase | State | Notes |
|---|---|---|
| P0 golden test | ✅ | `npm test` = golden (275 runs) + pvp-sim replays |
| P1a parity audit | ✅ | [PARITY.md](PARITY.md) |
| P1b Sim parity | ✅ | Player actions in Sim, story, tutorial, drag, tether, brew bubbles, event stream |
| P1c solo on Sim | ✅ | BattleScene 2177 → ~1500 lines; agent playtest with a hidden tab only |
| P2 kit model | ✅ | `shared/kit.ts` |
| P3 kit combat | ✅ | Riders in kit order, per-unit numbers, perk values; legacy fields removed; 254 original golden runs identical |
| P4a admin | ✅ | Kit and perks editors, Perks page, weapon picker |
| P4b text surfaces | ✅ | Card detail, story, PvP, website export, card prompts |
| P5 card icons | 🔨 | |
| A0 art pipeline | ✅ | `scripts/process-art.mjs`; 82 items keyed and built locally |
| A1 upload + mark done | ⏸ | Needs the user's OK (live R2 and D1) |
| A2 emblems, crests, icons | ✅ | |
| A3 VFX layer, weapons | ✅ | Paths stay dormant until the art exists |
| A4 remaining art (~115) | ⏸ | User generates it in Higgsfield |
| A5 weapon keys | ✅ | 16 melee units |
| R1 docs, What's new | 🔨 | |
| Playtest gate | ⏸ | User |
| R2 promo video, R3 release | ⏸ | |

**Rule decisions taken while building:**
- Echo is skipped when its caster is gone.
- Portal-boss minions arrive after 0.6 s.
- Heroes need `enabled`.
- Manual haste or rage can be cast with no monsters on the field.
- A Portal swap with a unit of the same id is refused.
- Crit is one roll per attack.
- Execute applies to the main target only.
- Slow, freeze, stun, poison, burn and curse apply to every monster hit, in hit order.
- Damage over time uses the attack's own damage.
- `armor_breaker` v: the armor multiplier is 0.7 + 0.3·v.
- `true_strike` v: the dodge chance is 0.15·(1−v).
