# Long-Horizon Progression in Studio Magnate

This doc turns the “multi‑generation career ecosystem” retention model into a concrete, incremental plan for Studio Magnate.

The core requirement is *not* “more systems.” It’s **time-based narrative renewal** that is:

- **additive** (build on existing engine + data; avoid rewrites)
- **deterministic** in the tick engine (`src/game/**`)
- **legible** (players can understand what changed and why)
- **bounded** (rosters + save size stay under control over decades)

---

## 0) Terms / north star

### Multi-generation career ecosystem
A self-sustaining loop where the industry keeps producing new people and new storylines:

1) debuts → 2) growth → 3) peak → 4) decline → 5) exit → 6) replacement

Studio Magnate’s version should make players care about:

- the rookie they “discovered,”
- the rival they keep losing to,
- the veteran they helped stage a comeback,
- the era their studio defined.

### What “done” feels like
After the initial onboarding, the game keeps presenting new, self-authored goals:

- “Can this rookie become a star?”
- “Can I rebuild this director’s career?”
- “Can I finally beat that studio in awards season?”

…and the game remembers outcomes in a way that players treat as canon.

---

## 1) Constraints and design principles (how we avoid rewrites)

### 1.1 Use the existing deterministic tick pipeline
The engine already has the right structure:

- Weekly deterministic tick: `src/game/core/tick.ts` (`advanceWeek`)
- Ordered systems: `src/game/core/registry.ts` registered in `src/game/store.ts`
- Randomness source: `ctx.rng` (no `Math.random()` in `src/game/**`)

**Principle:** implement long-horizon progression as additional tick systems that:

- read existing fields on `GameState` / `TalentPerson`
- write minimal deltas back
- emit recap cards via `ctx.recap`

### 1.2 Prefer “derive first, persist second”
If something can be derived cheaply from existing state, do that first. Persist only when:

- it’s needed for UI speed/ergonomics,
- it’s needed to keep history stable across future schema changes,
- or it prevents expensive re-computation.

### 1.3 Bound the growth vectors
Two growth vectors can kill long-horizon play:

- **unbounded roster size** (too many talent to parse)
- **unbounded save size** (localStorage/serialization bloat)

So the generational engine must include:

- exit pressure (retirement)
- history compaction (yearbooks + “notable events only”)

### 1.4 Don’t fight Online League constraints
Online League currently disables procedural rookies to keep shared IDs consistent.

**Principle:** anything that introduces new IDs or stochastic outcomes should be **single-player only** unless/ until Online League adopts a shared policy.

---

## 2) Current foundations we should extend (not replace)

### 2.1 Annual debuts already exist
`TalentDebutSystem` (`src/game/systems/talentDebutSystem.ts`) runs on year rollover (`ctx.week === 1`) and adds:

- handcrafted debuts from `CORE_TALENT_BIBLE` (`buildCoreTalentDebutsForYear`)
- a small procedural rookie class (`generateProceduralDebuts`) in single-player

This is the correct entry point for generational turnover.

### 2.2 Talent already has “career story” fields
`TalentPerson` supports:

- `age`, `experience`, `careerStage`, `marketValue`, `reputation`, `fame`
- `awards`, `filmography`
- `careerEvolution?: CareerEvent[]`, `scandals?: Scandal[]`
- relationship fields (`relationships`, `relationshipNotes`, `chemistry`)
- `contractStatus` includes `'retired'`

We should use these rather than inventing parallel structures.

### 2.3 The engine can already surface narrative via recap + event queue
- `ctx.recap` cards become Week Recap UI (`TickReport`)
- `eventQueue` already supports “player must decide” moments
- `PlayerCircleDramaSystem` shows a pattern for deterministic drama hooks

Long-horizon systems should follow that pattern.

---

## 3) The missing pieces (in order of dependency)

To get a working multi-generation loop, we need three engine-owned layers:

1. **Lifecycle:** talent age/stage/value evolves over time.
2. **Exit pressure:** the world retires people, creating space.
3. **Historical memory + legacy:** the world remembers *select* events so decades feel real.

Career “events” (breakthroughs/scandals/comebacks) should be added *after* lifecycle and history exist.

---

## 4) Data model changes (minimal + storage-aware)

### 4.1 World history should be compact and intentionally sparse
A naive per-week event log will bloat saves. Instead, split history into:

- **Yearbooks**: 1 entry per year (always kept)
- **Notable events**: only high-importance events (bounded by policy)

Proposed additions:

```ts
// src/types/game.ts
export type WorldHistoryEntry = {
  id: string;
  kind:
    | 'yearbook'
    | 'talent_debut'
    | 'talent_retirement'
    | 'talent_breakthrough'
    | 'talent_comeback'
    | 'talent_scandal'
    | 'award_win'
    | 'box_office_record'
    | 'studio_milestone';
  week: number;
  year: number;
  title: string;
  body: string;
  entityIds?: {
    studioIds?: string[];
    talentIds?: string[];
    projectIds?: string[];
  };
  importance?: 1 | 2 | 3 | 4 | 5;
};

export interface GameState {
  // Always small: <= number of simulated years
  worldYearbooks?: WorldHistoryEntry[];

  // Bounded: e.g. keep last N, or keep only importance>=4
  worldHistory?: WorldHistoryEntry[];
}
```

**Why split?**

- yearbooks give “timeline weight” without save bloat
- notable events give “texture” without logging everything

### 4.2 Player legacy should be a small summary, not a second history log
Keep it minimal and avoid duplicating world history.

```ts
export type PlayerLegacy = {
  studioId: string;

  totalReleases: number;
  totalAwards: number;
  totalBoxOffice: number;

  biggestHit?: { projectId: string; title: string; boxOffice: number; year: number };
  bestYearByAwards?: { year: number; awards: number };
};

export interface GameState {
  playerLegacy?: PlayerLegacy;
}
```

### 4.3 Optional: explicit retirement stamp
This is useful for UI and to prevent “un-retiring” via legacy systems.

```ts
export interface TalentPerson {
  retired?: { year: number; week: number; reason: 'age' | 'burnout' | 'unknown' };
}
```

---

## 5) Engine systems (incremental, additive)

### 5.1 Step A — Talent lifecycle (annual, deterministic)

**System:** `TalentLifecycleSystem` (new)

**Runs:** year rollover only (`ctx.week === 1`)

**Why first:** everything else (retirements, arcs, history summaries) depends on talent “changing over time.”

**Inputs (existing):**

- `talent.age`, `talent.experience`, `talent.reputation`, `talent.marketValue`
- `talent.type` (actor/director)
- `talent.contractStatus` (skip retired)

**Outputs (existing fields):**

- `age += 1` (for non-retired)
- `experience += 1` (for non-retired; or only if `careerStartYear <= ctx.year` if you later store it)
- recompute `careerStage`
- apply conservative market value drift

**Important non-goals for Step A:**

- don’t invent new stats
- don’t change project/contract logic
- don’t introduce weekly noise

#### Career stage computation (unify existing logic)
The codebase currently has similar `determineCareerStage()` logic in:

- `src/data/WorldGenerator.ts`
- `src/data/TalentDebutGenerator.ts`

To avoid divergence, the lifecycle system should use a shared helper (new file), e.g.

- `src/utils/careerStage.ts` exported function `determineCareerStage({ age, experience, reputation })`

This is additive: it doesn’t break generation; it just prevents future drift.

#### Market value drift (conservative)
We should not rewrite market value formulas. Instead:

- keep current `marketValue` as baseline
- apply a small multiplicative drift per year toward an age-based curve

Example policy (tunable):

- define “prime age” per role (actors ~35, directors ~45)
- define an “age factor” in `[0.6, 1.15]`
- yearly drift: `marketValue *= lerp(1, ageFactor, 0.15)`

This makes careers feel like they have phases without destabilizing the economy.

#### Recap
On week 1, emit a recap card like:

- “Industry aging: talent updated for 2032” (optional; can be hidden once noisy)

---

### 5.2 Step B — Retirement pressure (annual, conservative)

**System:** `TalentRetirementSystem` (new)

**Runs:** year rollover (`ctx.week === 1`)

**Why now:** debuts alone don’t create generational turnover; retirements create space.

**Key principle:** retirements must not break active productions.

#### Eligibility rules (build on existing structures)
A talent is eligible to retire only if:

- not already retired
- not currently marked `contractStatus: 'busy'` with `busyUntilWeek` beyond the current week
- not attached to an active player project phase (pre-production/production/post/post-marketing) if you can detect it

If we can’t reliably detect attachment yet, start conservative:

- retire only `contractStatus === 'available'`

That’s additive and safe.

#### Probability model (deterministic)
Use order-independent stable seeds (preferred) so outcomes don’t change if roster ordering changes.

Example (tunable) per talent per year:

- base retirement chance derived from age:
  - actors: 0% <55, ramps to ~12% by 70
  - directors: 0% <60, ramps to ~12% by 75
- modify chance by:
  - burnout level (`burnoutLevel`): +0–6%
  - reputation/legend status: -0–6%

Determinism implementation guideline:

- `chance = f(age, burnout, reputation)`
- roll via `stableInt('retire:'+talent.id+':'+year, 0, 9999) / 10000`

#### State updates (existing fields)
When retiring:

- `contractStatus = 'retired'`
- set `retired = { year, week: 1, reason }` (optional)
- append `CareerEvent { type: 'retirement', ... }` to `careerEvolution` (already in types)

#### Recap + history hooks
Emit recap card:

- “3 retirements (including <Name>)”

Also emit a **notable event** for high-importance retirements (legends / marquee):

- `worldHistory += { kind: 'talent_retirement', importance: 4, ... }`

---

### 5.3 Step C — Replacement-aware debuts (extend existing system)

**System:** extend `TalentDebutSystem` (no rewrite)

Right now, rookies are fixed-count. This is fine early, but long runs need the roster to stay within a band.

#### Policy: debuts respond to exits
On year rollover:

- count retirements in the *previous* rollover (or detect new `retired.year === ctx.year`)
- generate rookies roughly equal to retirements, plus a small baseline for freshness

Example target:

- baseline: `+6 actors, +2 directors` per year (single-player)
- replacement: `+1 rookie per retirement by role`
- soft cap: if active (non-retired) roster exceeds a target (e.g. 260), reduce baseline to 0

#### Determinism + ID stability
Preserve the existing rookie ID format and seeding strategy:

- keep `seed: rookies:${universeSeed}:${year}`
- the generated ID already includes `year`, `type`, `index`, `attempt`

If counts change year-to-year, IDs remain stable *within that year*.

#### Online League
No change: still core-only debuts.

---

### 5.4 Step D — Filmography + “career facts” (engine-owned, not UI-owned)

Career arcs and history summaries need reliable career facts:

- “what did this person do last year?”
- “was that film a hit or bomb?”

Today, some filmography updating happens in legacy UI code (`TalentFilmographyManager`).

**Additive step:** introduce an engine system that *reuses* the existing logic rather than duplicating it.

**System:** `TalentFilmographySystem` (new)

**Runs:** weekly

**Responsibility:** detect newly released projects and update `talent.filmography` deterministically.

Why this matters:

- makes career arcs derivable from engine state
- reduces “UI-only truth” divergence

---

### 5.5 Step E — Career arcs (derived from outcomes, not random noise)

**System:** `TalentCareerArcSystem` (new)

**Runs:** weekly (triggered on new releases), plus an annual pass for “comebacks/declines.”

**Principle:** most career events should be *caused by what happened* (release performance, awards), not arbitrary RNG.

#### Event types and triggers (starting set)
Start with three events that are easy to justify and cheap to compute:

1) **Breakthrough**
- Trigger: a rookie/rising talent is credited on a project that exceeds performance thresholds
- Threshold example:
  - box office multiplier > 2.0 OR critics score ≥ 85
- Effect:
  - add `CareerEvent { type: 'breakthrough' }`
  - bump reputation / fame modestly
  - add notable history entry (importance 3–4)

2) **Flop**
- Trigger: credited talent on a project that bombs (e.g. multiplier < 0.6)
- Effect:
  - add `CareerEvent { type: 'flop' }`
  - reputation hit (smaller for ensemble)
  - optional: increase burnout

3) **Comeback**
- Trigger: veteran talent with recent flops has a hit
- Effect:
  - add `CareerEvent { type: 'comeback' }`
  - reputation + public image bump
  - history entry (importance 4 for marquee/legends)

Scandals should come later (they need stronger UI + persistence policy).

#### Don’t invent new data dependencies
At first, derive from fields that already exist on `Project.metrics` and talent filmography.

Awards integration can be added once awards results are reliably represented in engine state.

---

### 5.6 Step F — Historical memory: yearbooks + notable events

**System:** `WorldYearbookSystem` (new)

**Runs:** year rollover (`ctx.week === 1`)

**Output:** append exactly one yearbook entry to `worldYearbooks`.

Content should be derived, not guessed:

- top box office releases (from `boxOfficeHistory` / `allReleases`)
- awards summary (from `studio.awards` + talent awards)
- breakout of the year (from career events created in Step E)
- retirements roll call (from Step B)

**System:** `WorldHistoryPruneSystem` (optional)

If save size becomes a real constraint, prune `worldHistory` by policy:

- keep only `importance >= 4`, or
- keep last N entries, or
- keep last N years of events + all yearbooks

This keeps history *useful* without turning saves into logs.

---

### 5.7 Step G — Player legacy tracking (annual)

**System:** `PlayerLegacySystem` (new)

**Runs:** year rollover (`ctx.week === 1`)

Compute minimal “studio is history” stats from existing state:

- total releases
- total awards
- total box office
- biggest hit
- best year by awards

**Important:** this should be a summary, not a second timeline.

---

## 6) System ordering (how the pieces fit without breaking anything)

Register systems so annual logic composes cleanly:

### Year rollover order (week 1)
1. `TalentLifecycleSystem` (age/stage/value)
2. `TalentRetirementSystem` (exit pressure)
3. `TalentDebutSystem` (existing; now replacement-aware)
4. `WorldYearbookSystem` (writes summary)
5. `PlayerLegacySystem` (writes summary)

### Weekly order
- release/box office systems (existing)
- `TalentFilmographySystem` (updates filmography from releases)
- `TalentCareerArcSystem` (career events)
- existing drama systems (`PlayerCircleDramaSystem`)

The exact placement among weekly systems should follow data dependencies (filmography before career arcs).

---

## 7) Determinism strategy (practical rules)

Inside `src/game/**`:

- never use `Math.random()`
- never generate IDs with `Date.now()`

When choosing between `ctx.rng` and stable helpers:

- use **stable** (`stableInt` / `stablePick`) for outcomes that should not depend on iteration order (retirements, “which scandal this person gets in year X”)
- use **ctx.rng** for “simulation texture” that is allowed to be order-coupled within a tick (rare; avoid for anything user-visible that must be reproducible across refactors)

---

## 8) UI surfacing (how players perceive the timeline)

This work only matters if players can see it.

### 8.1 Week recap
Ensure each long-horizon system emits recap cards at appropriate cadence:

- retirements (week 1)
- debuts (already)
- yearbook summary (week 1)
- breakthroughs/comebacks (on release weeks)

### 8.2 LoreHub: add a Timeline view (yearbooks first)
Start with yearbooks (low volume, high signal):

- show list of years
- show “Year in Review” bodies

Then add “Notable Events” filtered views if `worldHistory` exists.

### 8.3 Talent Profile: Career timeline
Talent UI already shows awards/filmography/relationships.

Add a simple “Career Events” section rendering `careerEvolution` in chronological order.

---

## 9) Save migrations and compatibility

Any new `GameState` fields must be introduced via a migration:

- bump `CURRENT_SAVE_VERSION` (`src/utils/saveVersion.ts`)
- add a migration in `src/game/persistence/migrations.ts` that initializes:
  - `worldYearbooks: []`
  - `worldHistory: []`
  - `playerLegacy: { studioId, totalReleases: 0, ... }` or `null`

**Compatibility principle:** new systems should treat missing fields as empty arrays/undefined.

---

## 10) Tests and acceptance criteria

Studio Magnate already has strong simulation tests; we should add small, targeted ones.

### 10.1 Core tests (new)

- `talentLifecycleSystem.test.ts`
  - age increments once on rollover
  - retired talent don’t age
- `talentRetirementSystem.test.ts`
  - deterministic retirements for fixed seed
  - conservative eligibility (only available talent) doesn’t break projects
- `worldYearbookSystem.test.ts`
  - exactly one yearbook added per rollover
  - deterministic IDs and stable summaries

### 10.2 Long-run stability test

- `longHorizonStability.test.ts`
  - simulate 30–50 years
  - assert:
    - active roster size stays within a band (e.g. 200–320)
    - worldYearbooks length == years simulated
    - worldHistory stays below cap if pruning enabled

### 10.3 Acceptance criteria (player-facing)

After ~10 in-game years:

- you’ve seen multiple debut classes
- at least a handful of retirements
- at least a few “breakthrough/comeback” narratives
- LoreHub shows a believable year-by-year timeline

---

## 11) Implementation roadmap (explicitly additive)

1) **Shared helpers**
- unify `determineCareerStage()` into a shared utility

2) **Lifecycle (safe)**
- `TalentLifecycleSystem` (annual)

3) **Retirement (conservative)**
- `TalentRetirementSystem` (annual; only `available` eligible initially)

4) **Replacement-aware debuts (extend, don’t rewrite)**
- adjust counts in `TalentDebutSystem` based on retirements + caps

5) **Yearbooks (memory with bounded size)**
- `WorldYearbookSystem` + migrations

6) **Engine-owned filmography facts**
- `TalentFilmographySystem` (weekly)

7) **Career arcs derived from releases**
- `TalentCareerArcSystem` (weekly; breakthroughs/flops/comebacks)

8) **Legacy summary**
- `PlayerLegacySystem` (annual)

9) **UI timeline**
- LoreHub: Yearbooks tab → Notable Events

10) **Expand the ecosystem** (optional)
- scandals, rivalries, studio rise/fall, genre eras

---

## 12) Online League note

Online League should keep:

- core talent only
- deterministic, shared IDs

So:

- procedural rookies remain disabled
- retirements should likely remain disabled unless league agrees on shared lifecycle outcomes
- yearbooks may be safe if derived entirely from shared, deterministic outcomes
