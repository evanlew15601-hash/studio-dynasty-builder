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

### 1.5 Time semantics at year rollover (critical)
The tick pipeline advances time *before* systems run (`advanceWeek` updates `ctx.week`/`ctx.year`). When Week 52 advances to Week 1, `ctx.year` is already the new year.

For long-horizon systems we need consistent semantics:

- Let `currentYear = ctx.year` (the year we just entered).
- Let `previousYear = ctx.year - 1` (the year that just finished).

Policy:

- **Yearbook entries** summarize `previousYear`.
- **Retirements** happen in the “offseason” between years, and should be stamped as `previousYear` so they appear in the correct historical frame.
- **Debuts** belong to `currentYear` (rookie class for the new year).

This avoids off-by-one confusion and keeps “Year X” summaries coherent.

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
2. **Wear & tear:** burnout drifts based on recent work vs rest.
3. **Exit pressure:** the world retires people, creating space.
4. **Historical memory + legacy:** the world remembers *select* events so decades feel real.

Career “events” (breakthroughs/scandals/comebacks) should be added *after* lifecycle + memory exist.

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
    | 'talent_debut'
    | 'talent_retirement'
    | 'talent_breakthrough'
    | 'talent_comeback'
    | 'talent_scandal'
    | 'talent_rivalry'
    | 'industry_era'
    | 'genre_shift'
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

export type WorldYearbookEntry = {
  id: string;
  year: number;
  title: string;
  body: string;
};

export interface GameState {
  // Always small: 1 per simulated year
  worldYearbooks?: WorldYearbookEntry[];

  // Bounded via pushWorldHistory() policy
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
This is useful for UI, for replacement-aware debuts, and to prevent “un-retiring” via legacy systems.

Recommendation: treat retirement as an **offseason event** and stamp it against the year that just finished:

- `retired.year = previousYear` (the year being closed out)
- `retired.week = 52` (end-of-year marker; even though the system runs at week 1)

```ts
export interface TalentPerson {
  retired?: { year: number; week: number; reason: 'age' | 'burnout' | 'inactivity' | 'scandal' | 'unknown' };
}
```

---

## 5) Engine systems (incremental, additive)

### 5.0 Balance targets (so systems converge instead of drift)
These systems need explicit targets so the simulation stays stable over decades without feeling “scheduled.”

Chosen targets (single-player):

- **Active roster band**: keep non-retired talent roughly in the **240–320** range.
  - below band: reduce retirement odds and keep baseline debuts
  - above band: increase retirement odds and/or reduce baseline debuts
- **Annual churn**: aim for ~**4–7%** of the active roster to exit per year.
  - this creates generational turnover without erasing the world too fast
- **Role mix**: compute retirements and rookie generation **per role** (at minimum actor vs director)
  - prevents long-run drift into “too many directors” or “no directors”

These are tuning targets, not strict quotas. The key is: the model should naturally return toward a stable range.

### 5.1 Step A — Talent lifecycle (annual, deterministic)

**System:** `TalentLifecycleSystem` (new)

**Runs:** year rollover only (`ctx.week === 1`)

**Why first:** everything else (retirements, arcs, history summaries) depends on talent “changing over time.”

**Inputs (existing):**

- `talent.age`, `talent.experience`, `talent.reputation`, `talent.marketValue`
- `talent.type` (actor/director)
- `talent.contractStatus` (especially `'retired'`)

**Outputs (existing fields):**

- `age += 1` for all talent (including retired). This keeps biographies consistent and avoids “frozen ages.”
- `experience += 1` for non-retired talent only.
- recompute `careerStage` for non-retired talent only.
- apply conservative market value drift for non-retired talent only.

**Invariants:**

- This system must run **before** any debut system, otherwise new rookies would incorrectly gain 1 year of experience immediately.
- This system must not change `contractStatus` or any project/contract structures.
- Rerunning the tick for the same save+seed should produce identical results (no `Math.random()`).

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
- not attached to an active player project phase (if/when we can reliably detect it)

If we can’t reliably detect attachments yet, start conservative:

- retire only `contractStatus === 'available'`

This builds on existing contract semantics and avoids breaking the player’s in-flight plans.

That’s additive and safe.

**Invariants:**

- The system must be **safe by default**: it should never retire someone the player is actively relying on.
- Retirement must be idempotent: once `contractStatus === 'retired'`, this system must never change them again.
- The system must not delete talent records; retirement is a state transition, not removal.

**Planned expansion (still additive):**

Once we have reliable “talent is currently attached to an active project” detection, widen eligibility from `available` to include:

- contracted talent with no active project attachments (represents “retired between gigs”)
- exclusive talent only if your contract model supports graceful exit (likely later)

#### Probability model (deterministic)
Use order-independent stable seeds (preferred) so outcomes don’t change if roster ordering changes.

Example (tunable) per talent per year:

- base retirement chance derived from age:
  - actors: 0% <55, ramps to ~12% by 70
  - directors: 0% <60, ramps to ~12% by 75
- modify chance by:
  - burnout level (`burnoutLevel`): +0–6%
  - reputation/legend status: -0–6%

#### Roster-size coupling (chosen)
Pure per-talent probabilities can drift roster size over long runs, and can produce streaky years.

We keep retirements probabilistic (natural-feeling), but couple the probability to roster pressure:

- compute `activeCount` (non-retired actors/directors)
- define a target band: **240–320**
- compute a pressure multiplier `m` (clamped), e.g.
  - below band: `m` in `[0.7, 1.0]`
  - within band: `m = 1.0`
  - above band: `m` in `[1.0, 1.4]`

Then:

- `finalChance = baseChance(age, role) * modifiers(burnout, reputation, inactivity) * m`

This keeps retirements organic while still self-correcting.

Determinism implementation guideline:

- define `previousYear = ctx.year - 1`
- `chance = f(age, burnout, reputation)`
- roll via `stableInt('retire:'+talent.id+':'+previousYear, 0, 9999) / 10000`

#### State updates (existing fields)
When retiring:

- `contractStatus = 'retired'`
- set `retired = { year: previousYear, week: 52, reason }` (recommended; see §4.3)
- append a `CareerEvent` to `careerEvolution` (already in types) with:
  - `type: 'retirement'`
  - `year: previousYear`, `week: 52`
  - a human-readable `description`
  - conservative negative impacts (often 0, since retirement is not a “failure”)

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

- count retirements from the offseason just processed (recommended: detect `retired.year === previousYear`)
- generate rookies roughly equal to retirements, plus a small baseline for freshness

Chosen target policy (single-player):

- replacements are **per role**, based on retirements from `previousYear`
- baseline rookies vary by roster pressure:
  - if active roster <240: baseline `+8 actors, +2 directors`
  - if active roster 240–320: baseline `+4 actors, +1 director`
  - if active roster >320: baseline `+0`
- replacement multiplier when overcrowded (pressure valve):
  - <=320: replace 100% of retirees
  - 321–380: replace 75% of retirees
  - >380: replace 50% of retirees

This keeps a “steady rookie class” when the world is healthy, but lets the roster converge back down when it balloons.

#### Determinism + ID stability
Preserve the existing rookie ID format and seeding strategy:

- keep `seed: rookies:${universeSeed}:${currentYear}`
- the generated ID already includes `year`, `type`, `index`, `attempt`

If counts change year-to-year, IDs remain stable *within that year*.

#### Online League
No change: still core-only debuts.

---

### 5.4 Step D — Filmography + “career facts” (engine-owned, not UI-owned)

Career arcs and yearbooks need reliable career facts:

- “what did this person do last year?”
- “was that film a hit or bomb?”

Today, some filmography updating happens in legacy UI code (`src/utils/talentFilmographyManager.ts` is called from `StudioMagnateGame.tsx`). That creates an architectural risk: career truth lives in UI flow rather than engine flow.

**Additive step:** introduce an engine tick system that **reuses** `TalentFilmographyManager.updateFilmographyOnRelease()` (no rewrite), so filmography becomes deterministic engine-owned state.

**System:** `TalentFilmographySystem` (new)

**Runs:** weekly

#### v1 scope (chosen)
Filmography is updated for both:

- `state.projects` (player projects)
- `state.allReleases` entries that are full `Project` objects (AI/competitor releases with credited talent)

We filter by `status === 'released'` and `(releaseWeek, releaseYear)` so each release is processed once.

#### Algorithm (idempotent)
Because the update function is already “don’t duplicate if filmography entry exists,” the simplest engine-safe implementation is:

```ts
let next = state;

const candidates = [...state.projects, ...state.allReleases.filter((x): x is Project => 'script' in (x as any))];

for (const p of candidates) {
  if (p.status !== 'released') continue;
  if (p.releaseWeek !== ctx.week || p.releaseYear !== ctx.year) continue;
  next = TalentFilmographyManager.updateFilmographyOnRelease(next, p);
}

return next;
```

This is intentionally idempotent: once entries exist, the system becomes a no-op for that project.

#### Invariants

- Must not mutate projects; it only enriches `talent.filmography` (and associated fame adjustments already in the utility).
- Must remain deterministic: all calculations are derived from project metrics and budget, not RNG.
- Must be safe to call even if legacy UI paths still call the same utility (duplicates are prevented). After it’s verified, we should remove/gate the UI path to avoid wasted work.

---

### 5.5 Step E — Career arcs (derived from outcomes, not random noise)

**System:** `TalentCareerArcSystem` (new)

**Runs:** weekly (triggered on new releases), plus an annual pass for “comebacks/declines.”

**Principle:** most career events should be *caused by what happened* (release performance, awards), not arbitrary RNG.

#### Prerequisites / data sources
This system should be implemented once “release outcomes” are reliably represented in the deterministic engine state. Minimum required per released project:

- credited talent IDs (director + cast)
- basic performance signals (box office, critics, or whatever the project already stores)
- a way to know “this project released this week”

If release finalization still happens outside the tick registry, the correct intermediate step is:

- run the career-arc logic in the same code path that finalizes a release, and later migrate it into a tick system once releases are tick-owned.

#### Processing window (weekly)
Prefer processing only projects released this tick (not all released projects every tick). A robust, order-independent trigger is:

- `project.status === 'released' && project.releaseYear === ctx.year && project.releaseWeek === ctx.week`

If those fields don’t exist yet, the fallback is an idempotent “process all released projects but only once per project,” which likely requires a small marker (project-level processed flag) later.

#### Idempotence (no duplicate events)
In practice, release-week gating (`releaseYear/releaseWeek`) makes career events “naturally once.” Still, we should defensively avoid duplicates.

v1 (no schema changes): before appending an event, check whether `talent.careerEvolution` already contains an entry with the same:

- `type`
- `year` / `week`
- and a matching description pattern

v2 (small, additive schema improvement): extend `CareerEvent` with an optional source pointer for exact dedupe:

- `sourceProjectId?: string`

That enables perfect “already processed this project” checks without adding a separate ledger.

#### Event types and triggers (starting set)
Start with three events that are straightforward to justify and cheap to compute.

1) **Breakthrough**
- Trigger:
  - talent `careerStage` in `{ 'unknown', 'rising' }` (or low `experience`)
  - credited on a project that strongly outperforms
- Suggested thresholds (tunable; use whichever metrics exist):
  - box office multiplier > 2.0 **or** critics score ≥ 85
- Targeted recipients:
  - director
  - 1–2 top-billed actors (avoid spamming every supporting credit)
- Effects (conservative):
  - append a `CareerEvent` with:
    - `type: 'breakthrough'`, `year: ctx.year`, `week: ctx.week`
    - `description` referencing the project (“Breakthrough after <Project Title>”) 
    - small positive impacts on reputation/market value (clamped)
  - optionally bump `fame` modestly if that’s part of the existing fame model
  - add notable history entry if talent is marquee or the project is exceptional (`importance` 3–4)

2) **Flop**
- Trigger:
  - credited on a project that underperforms (e.g. multiplier < 0.6)
- Effects:
  - append a `CareerEvent` with:
    - `type: 'flop'`, `year: ctx.year`, `week: ctx.week`
    - `description` referencing the project (“Career stumble after <Project Title>”)
    - small negative impacts on reputation/market value (scaled by credit weight)
  - apply a smaller reputation hit for non-leads (so ensembles don’t collapse)
  - optional: increase burnout a small amount

3) **Comeback**
- Trigger:
  - talent `careerStage` in `{ 'veteran', 'legend' }`
  - has recent flops in the last N years (derived from `careerEvolution` timestamps)
  - then lands a hit (threshold like breakthrough)
- Effects:
  - append a `CareerEvent` with:
    - `type: 'comeback'`, `year: ctx.year`, `week: ctx.week`
    - `description` referencing the project (“Comeback after <Project Title>”) 
    - positive impacts on reputation/market value (clamped)
  - reputation + optional fame bump
  - history entry (`importance` 4 for marquee/legends)

Scandals should come later (they require stronger UI affordances and a clear persistence/pruning policy).

#### Don’t invent new data dependencies
At first, derive from fields that already exist on project metrics + credited talent.

Awards integration can be layered later once awards results are deterministic engine state (rather than UI-derived).

---

### 5.6 Step F — Historical memory: yearbooks + notable events

**System:** `WorldYearbookSystem` (new)

**Runs:** year rollover (`ctx.week === 1`)

**Output:** append exactly one yearbook entry to `worldYearbooks` summarizing the year that just ended.

Time semantics:

- define `previousYear = ctx.year - 1`
- generate yearbook for `previousYear`
- recommended ID: `yearbook:${previousYear}`

#### Content (derived, not guessed)
Yearbook content should be opinionated but mechanically grounded. Start with sections you can compute from existing state:

- **Top box office releases** for `previousYear` (from `boxOfficeHistory` / `allReleases`)
- **Awards summary** for `previousYear` (from `studio.awards` + talent awards)
- **Breakout / comeback of the year** (from `careerEvolution` events stamped in `previousYear`)
- **Retirements roll call** (from `talent.retired.year === previousYear`)

If a section’s data isn’t available yet in the engine pipeline, omit it rather than fabricating.

#### Format (UI-friendly)
Even if stored as `{ title, body }`, write the body in a consistent, easy-to-render structure (plain text with line breaks is fine):

- a short 2–4 sentence “industry vibe” paragraph (deterministic; derived from computed highlights)
- then bullet sections, e.g.
  - “Top Releases:”
  - “Awards:”
  - “New Stars:”
  - “Retirements:”

This keeps the Timeline readable without requiring rich markup.

**System:** `WorldHistoryPruneSystem` (optional)

Notable events are for texture, not logging. Define a hard policy up front:

- `worldYearbooks`: never pruned (1 per year; bounded by playtime)
- `worldHistory`: pruned by one of:
  - keep only `importance >= 4`, or
  - keep last N entries (e.g. 250), or
  - keep last N years worth of entries

This keeps history useful without turning saves into logs.

---

### 5.7 Step G — Player legacy tracking (annual)

**System:** `PlayerLegacySystem` (new)

**Runs:** year rollover (`ctx.week === 1`)

Compute minimal “studio is history” stats from existing state.

Time semantics:

- define `previousYear = ctx.year - 1`
- update records using data attributable to `previousYear` (so you don’t double-count when reloading mid-year)

Suggested fields (keep this intentionally small):

- lifetime totals:
  - `totalReleases`
  - `totalAwards`
  - `totalBoxOffice`
- best-of records:
  - `biggestHit` (project + box office + year)
  - `bestYearByAwards`

**Important constraints:**

- This is a *summary*, not a timeline: no per-year arrays.
- All values should be derived from existing canonical data (releases/awards/box office), not separately simulated.
- If a piece of canonical data is not yet tick-owned, defer that legacy stat until it is.

---

## 6) System ordering (how the pieces fit without breaking anything)

Register systems so annual logic composes cleanly:

### Year rollover order (week 1)
1. `TalentLifecycleSystem` (age/experience/stage/value updates for existing talent)
2. `TalentRetirementSystem` (offseason exits; stamped to `previousYear`)
3. `WorldYearbookSystem` (summarize `previousYear` + include offseason retirements)
4. `TalentDebutSystem` (rookie class for `currentYear`)
5. `PlayerLegacySystem` (update studio summary; should ignore rookies unless explicitly tracked)

### Weekly order
- release/box office systems (existing)
- `TalentFilmographySystem` (updates filmography from releases)
- `TalentCareerArcSystem` (career events)
- existing drama systems (`PlayerCircleDramaSystem`)

The exact placement among weekly systems should follow data dependencies (filmography before career arcs).

Implementation note: prefer using `dependsOn` in system definitions (supported by `SystemRegistry` topological sort) so ordering survives refactors. Example intent:

- `TalentDebutSystem` depends on `TalentLifecycleSystem` and `TalentRetirementSystem`
- `WorldMilestonesSystem` (awards/records) depends on `TalentRetirementSystem`
- `WorldYearbookSystem` depends on `WorldMilestonesSystem` + `TalentRetirementSystem`
- `TalentCareerArcSystem` depends on “release finalization” (whatever system owns that)
- `TalentFilmographySystem` depends on “release finalization” as well

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
  - age increments once on rollover (including retired)
  - experience increments for non-retired only
  - rookies added after rollover do not get “free” experience (ordering invariant)
- `talentRetirementSystem.test.ts`
  - deterministic retirements for fixed seed
  - retirement stamp uses `year = previousYear` and `week = 52`
  - conservative eligibility (only `available`) doesn’t break active projects
- `talentDebutSystem.replacementAware.test.ts`
  - rookie counts respond to retirements by role
  - IDs remain stable for a given `universeSeed` + `currentYear`
- `worldYearbookSystem.test.ts`
  - exactly one yearbook added per rollover
  - yearbook summarizes `previousYear` (ID `yearbook:${previousYear}`)
  - deterministic summaries for fixed seed + same sim history

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

## 12) Open decisions (confirm before implementation)
These choices change tuning and data shape. The plan above works either way, but we should pick defaults before coding.

### 12.1 Retirement selection style (chosen)
**Chosen:** v1 probabilistic (per-talent annual rolls).

Design intent:

- retirement feels “natural” and non-mechanical
- legends can stick around longer
- the world doesn’t clear out in a single season

To keep long-run stability without quotas, we’ll couple probability to roster pressure:

- if the active roster is above the target band, apply a small global multiplier to retirement chances
- if it’s below band, reduce chances

That keeps the system flowing without turning it into a strict “retire K people per year” scheduler.

### 12.2 Roster band / churn targets (chosen)
These targets exist for two reasons:

- **legibility**: how many talent can the UI present without becoming noise
- **save/perf stability**: how big the state gets after 50–100 years

Chosen targets (single-player):

- active roster band: **240–320** non-retired (primarily actors/directors for now)
- annual churn: **~4–7%** exits per year

Why these values fit this genre:

- below ~200 active talent, the world starts to feel like a small troupe and eras don’t form
- above ~350, the hiring/casting UI becomes noise and attachment collapses
- 4–7% churn gives “new faces every year” without making stars disappear unrealistically fast

Implementation note: with probabilistic retirements, churn is an outcome, not a guarantee. We hit these targets by adjusting the roster-pressure multiplier `m`.

### 12.3 CareerEvent schema extension (chosen)
We should add one optional field to `CareerEvent`:

- `sourceProjectId?: string`

Why this is the best tradeoff for this game:

- career arcs must feel canonical; duplicate “breakthrough after X” events break trust
- it enables perfect idempotence without maintaining a separate processing ledger
- it improves UI (“events tied to this film”) essentially for free

This is additive and low-risk (optional field + migration default).

### 12.4 Which talent types participate (chosen)
Chosen v1 policy:

- **Lifecycle**: ages everyone (`TalentPerson.age += 1`), because biographies shouldn’t freeze.
- **Retirement + replacement-aware debuts**: only for **actors and directors** initially.

Why:

- those roles currently anchor the player-facing career narrative and the debut pipeline
- other talent types (writer/producer/etc) should only get retirement once we confirm how they enter the world and what replacement looks like

### 12.5 History pruning policy (chosen)
Chosen policy:

- `worldYearbooks`: never pruned (1/year)
- `worldHistory`: keep the **last 250 entries**, and always keep `importance === 5` even if it exceeds the window

Why:

- a “recent memory” window feels natural (people remember the last decade)
- bounded save growth
- importance 5 protects truly defining events from disappearing

## 13) Online League note

Online League should keep:

- core talent only
- deterministic, shared IDs

So:

- procedural rookies remain disabled
- retirements should likely remain disabled unless league agrees on shared lifecycle outcomes
- yearbooks may be safe if derived entirely from shared, deterministic outcomes
