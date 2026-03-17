# Long-Horizon Progression in Studio Magnate

This document describes the retention mechanic behind “500–1000 hour” simulation games—**multi-generation career ecosystems**—and maps it onto Studio Magnate’s current architecture (Vite + React + TypeScript + deterministic tick engine).

The goal is to turn the world into a *living timeline* that keeps producing new goals, new characters, and new storylines across decades of in-game time.

---

## 1) The retention loop (why players keep going)

Long-horizon sims don’t retain players because the systems are deep *once*—they retain because the **world keeps changing**, creating unfinished narratives that players want to resolve.

The practical “forever loop” is:

1. **New talent appears**
2. They **rise** into relevance
3. They **peak** (dominant, expensive, high leverage)
4. They **decline** (stale, volatile, burned out, replaced)
5. They **retire / exit**
6. A **new generation replaces them**

This is the renewal engine. Without it, worlds become static and narrative energy collapses.

To reach extreme playtime, games typically add two more layers:

- **Persistent world history**: remembered awards, records, rivalries, scandals, “eras”
- **Player legacy tracking**: the player’s studio becomes part of the timeline (dynasties, signature eras, protégés)

---

## 2) What Studio Magnate already has (relevant foundations)

### 2.1 Deterministic simulation spine

Studio Magnate already has the most important prerequisite for long-horizon progression: a deterministic tick engine.

- Weekly tick pipeline: `src/game/core/tick.ts` (`advanceWeek`)
- Tick context: `src/game/core/types.ts` (`TickContext` includes `ctx.rng`, `week`, `year`, `recap`)
- System registry + ordered execution: `src/game/core/registry.ts`, registered via `src/game/store.ts`

Hard rule in the engine: systems should be pure `(state, ctx) => nextState`, and avoid `Math.random()`.

### 2.2 “Generational” foothold: annual debuts

You already have the first half of generational turnover: new people entering the world.

- `TalentDebutSystem` (`src/game/systems/talentDebutSystem.ts`)
  - Runs on year rollover (`ctx.week === 1`)
  - Adds:
    - Handcrafted debuts from the Cornellverse bible (`CORE_TALENT_BIBLE`) via `buildCoreTalentDebutsForYear()` (`src/data/WorldGenerator.ts`)
    - Procedural rookies via `generateProceduralDebuts()` (`src/data/TalentDebutGenerator.ts`)
  - Online League disables procedural rookies to keep shared IDs consistent.

This is a strong base: IDs are stable, and procedural seeds are derived from `universeSeed` + `year`.

### 2.3 Memory primitives exist (but aren’t unified)

You already track slices of history:

- `GameState.boxOfficeHistory`, `topFilmsHistory`, `allReleases`
- Studio/talent awards arrays
- `TalentPerson.filmography` (plus utilities in `src/utils/talentFilmographyManager.ts`)
- Relationships + relationship notes (core lore in `WorldBible.ts` + wiring in `WorldGenerator.ts`)

But there is no single “timeline ledger” that turns this output into *remembered* history.

---

## 3) What’s missing (gap analysis)

### 3.1 No exit pressure (retirements / attrition)

Debuts without exits create roster bloat. Roster bloat destroys legibility and attachment.

A sustainable ecosystem needs deterministic exit pressure:

- retirement (age, burnout)
- soft exits (unavailable, blacklisted, “busy”) that free the player’s attention
- occasional comebacks (keeps veterans relevant without immortality)

### 3.2 No engine-owned career arc evolution

The type system supports career storytelling (`CareerEvent`, `Scandal`, `careerEvolution`), but there’s no tick system that advances careers over time:

- stage progression: rising → established → veteran → legend → retired
- reputation/value curves
- narrative events: breakthroughs, flops, scandals, awards buzz

### 3.3 History exists but isn’t “remembered” as story

Players treat the world as a living timeline when the game remembers:

- who dominated award seasons
- decade-long rivalries
- infamous scandals
- “eras” of a studio

Right now the game *can* derive some of this from state, but it doesn’t persist a canonical, player-facing timeline.

---

## 4) Target design: a multi-generation career ecosystem loop

At a high level, each in-game year should deterministically produce:

1. **Talent lifecycle update** (age/experience/stage/value)
2. **Retirements** (exit pressure)
3. **Debuts** (replacement-aware)
4. **Career arc events** (breakthroughs, flops, scandals, comebacks)
5. **World history entries** (timeline ledger + yearbook summaries)
6. **Player legacy deltas** (studio milestones & records)

This should be implemented as **tick systems** under `src/game/systems/**` so it participates in the deterministic pipeline and recap output.

---

## 5) Proposed state additions (minimal, high leverage)

### 5.1 Global history ledger (WorldHistory)

Add a compact, serializable event log on `GameState`:

```ts
// src/types/game.ts
export type WorldHistoryEntry = {
  id: string;
  kind:
    | 'talent_debut'
    | 'talent_breakthrough'
    | 'talent_retirement'
    | 'talent_scandal'
    | 'award_win'
    | 'box_office_record'
    | 'studio_milestone';
  week: number;
  year: number;
  title: string;
  body: string;
  entityIds: {
    studioIds?: string[];
    talentIds?: string[];
    projectIds?: string[];
  };
  importance?: 1 | 2 | 3 | 4 | 5;
};

export interface GameState {
  // ...
  worldHistory?: WorldHistoryEntry[];
}
```

Design constraints:

- entries must be small and JSON-serializable
- IDs must be deterministic (no `Date.now()`), e.g. `hist:${kind}:${year}:${week}:${talentId}`

### 5.2 Player legacy snapshot

A compact summary that makes “your studio is history” explicit:

```ts
export type PlayerLegacy = {
  studioId: string;
  totalAwards: number;
  totalBoxOffice: number;
  totalReleases: number;

  bestYearByProfit?: { year: number; profit: number };
  bestYearByAwards?: { year: number; awards: number };
  biggestHit?: { projectId: string; title: string; boxOffice: number; year: number };

  // Optional narrative hooks
  discoveredTalentIds?: string[];
};

export interface GameState {
  // ...
  playerLegacy?: PlayerLegacy;
}
```

Note: much of this can be derived, but persisting it makes UI cheap and resilient to future schema changes.

### 5.3 Talent retirement metadata (optional)

```ts
export interface TalentPerson {
  // ...
  retired?: {
    year: number;
    week: number;
    reason: 'age' | 'burnout' | 'blacklist' | 'unknown';
  };
}
```

---

## 6) Proposed tick systems (deterministic)

### 6.1 `TalentLifecycleSystem` (annual)

**Runs:** year rollover (`ctx.week === 1`)

Responsibilities:

- increment `age` for all non-retired talent
- increment `experience`
- recompute `careerStage` deterministically (you already do this in two places:
  - `src/data/WorldGenerator.ts`
  - `src/data/TalentDebutGenerator.ts`
  )
- apply age curves:
  - market value drifts toward peak windows (actor vs director)
  - optional reputation drift for very old ages unless “legend”

Implementation note: prefer consolidating `determineCareerStage()` into a shared utility to avoid drift.

### 6.2 `TalentRetirementSystem` (annual)

**Runs:** year rollover (`ctx.week === 1`)

Responsibilities:

- deterministically select retirements using stable, order-independent rules
- update:
  - `contractStatus = 'retired'`
  - add `careerEvolution` retirement event
  - optionally set `talent.retired`
- emit:
  - recap card (how many retired)
  - world history entries for notable retirements

Tuning goals:

- exits should roughly balance debuts to prevent unbounded roster growth
- legends retire later but do retire

### 6.3 Upgrade `TalentDebutSystem` to be replacement-aware

Today the rookie class is fixed (`actorCount: 8`, `directorCount: 2`). For a sustainable ecosystem:

- calculate retirements this year by role
- generate rookies = retirements + baseline (freshness) + optional growth term

Determinism:

- keep IDs stable
- seed generation with `universeSeed + year + index`

Online League:

- keep procedural rookies disabled unless/until league rules adopt a shared newgen policy

### 6.4 `TalentCareerArcSystem` (weekly or annual)

Responsibilities:

- produce narrative career events:
  - breakthroughs (often tied to successful releases)
  - flops (bombs)
  - comebacks (late-career hit)
  - scandals (rare, sticky)
- write to:
  - `talent.careerEvolution[]` and/or `talent.scandals[]`
  - `worldHistory[]` for notable events
  - optionally `eventQueue[]` if you want player decisions

### 6.5 `WorldYearbookSystem` (annual)

**Runs:** year rollover (`ctx.week === 1`)

Responsibilities:

- generate a “Year in Review” entry (or a separate `yearbook[]`):
  - top box office releases
  - biggest critical darling
  - breakout talent of the year
  - retirements roll call
  - awards summary

This is the “historical memory” layer that makes decades *feel* like decades.

---

## 7) System ordering (registry)

Suggested deterministic order at year rollover:

1. `TalentLifecycleSystem`
2. `TalentRetirementSystem`
3. `TalentDebutSystem` (replacement-aware)
4. `TalentCareerArcSystem`
5. `WorldYearbookSystem`
6. Market/media systems (as desired)

This plugs cleanly into `SystemRegistry` registration in `src/game/store.ts`.

---

## 8) Determinism rules (project-consistent)

Inside `src/game/**`:

- no `Math.random()`
- no `Date.now()` for IDs
- prefer:
  - `ctx.rng` when order-sensitive within-tick randomness is fine
  - `stableInt` / `stablePick` when results must be stable regardless of iteration order

Rule of thumb:

- if you iterate arrays/maps and pick “one of many,” prefer `stable*` with explicit seed strings
- if you want the simulation to feel like a roll-forward pipeline where earlier draws influence later draws, use `ctx.rng`

---

## 9) UI surfacing (how players experience the ecosystem)

Long-horizon systems matter only if players can *see* them.

### 9.1 Week Recap
Use `ctx.recap` to surface:

- retirements
- breakouts
- scandals
- yearbook summaries (Week 1 of each year)

### 9.2 LoreHub: Timeline tab
Add a Timeline/Almanac tab to `src/components/game/LoreHub.tsx` that renders `gameState.worldHistory`:

- filters: year, kind, studio/talent
- click-through: talent profile / project detail

### 9.3 Talent Profile: Career timeline
In Talent Profile UI, show:

- `careerEvolution` events
- awards + filmography (already supported)
- relationships (already supported)

---

## 10) Save migrations

Adding `worldHistory` / `playerLegacy` requires:

- bump `CURRENT_SAVE_VERSION` (`src/utils/saveVersion.ts`)
- add a migration in `src/game/persistence/migrations.ts` to initialize new fields on old saves

---

## 11) Testing plan (Vitest)

Add focused simulation tests under `tests/`:

- `talentLifecycleSystem.test.ts`
  - age increments exactly once per year rollover
  - career stage recomputation deterministic
- `talentRetirementSystem.test.ts`
  - deterministic retirement set for fixed seed + roster
  - retired talent set `contractStatus` correctly
- `worldYearbookSystem.test.ts`
  - yearbook entries stable IDs and stable content
- `longHorizonDeterminism.test.ts`
  - simulate 10–20 years and assert:
    - roster size stays within a target band
    - worldHistory grows deterministically
    - no NaNs / runaway values

---

## 12) Implementation roadmap (phased)

1. **Schema & migrations**: add `worldHistory`, `playerLegacy`, optional `talent.retired`
2. **Lifecycle + retirement**: implement `TalentLifecycleSystem` + `TalentRetirementSystem`
3. **Replacement-aware debuts**: adjust `TalentDebutSystem` counts
4. **World history + yearbook**: implement ledger + annual summaries
5. **UI timeline**: add LoreHub Timeline tab
6. **Career arcs**: breakthroughs/scandals/comebacks (plus optional player-facing decisions)

---

## 13) Online League note

Online League currently requires shared determinism across players and disables procedural rookies. Most of the “newgen” and “random career event” logic should default to **single-player only** (`state.mode !== 'online'`) unless the league adopts a shared newgen policy and corresponding snapshot/validation rules.
