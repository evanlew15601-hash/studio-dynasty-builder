# Studio Magnate — Playability Fixes (Repo-Driven Plan)

## Premises

- Keep the game’s **difficulty model as budget-only** (start poorer for a harder run). No systemic scaling required.
- Focus fixes on improving **player understanding, trust, and flow**, while reducing “rules drift” between parallel implementations.

## Key architecture decision (recommended)

You asked which approach to choose for finances/"what is authoritative". Here’s a repo-specific recommendation.

### Recommendation: **Engine/GameState is authoritative; ledger is derived for UI**

**Choose this if:** you want determinism, simpler debugging, and one clear source of truth.

- **Authoritative simulation + money:** `useGameStore` + engine tick pipeline (`src/game/core/tick.ts` + `src/game/store.ts`).
- **UI finance display:** computed from **GameState** + **TickReport** (and optionally a UI-only ledger for nicer presentation).

Why this fits this repo:

- The engine explicitly declares: “This is the ONLY place GameState changes due to time passing.” (`src/game/core/tick.ts`).
- The repo already has extensive determinism guardrails/tests around the engine pipeline.
- `FinancialEngine` is a static class with localStorage side effects; wiring it into the engine would add non-deterministic I/O and complicate worker/offline determinism.

### Alternative (not recommended): make `FinancialEngine` the canonical ledger

This can work, but it tends to make the sim harder to reason about in this repo because:

- The engine systems are written as pure-ish functions; calling a global ledger with storage writes is an implicit side effect.
- You risk double-accounting (engine updates budget *and* ledger writes) unless you strictly refactor all callers.

**Decision action:** proceed with the recommendation above unless you have a hard requirement for a persisted transaction ledger that must survive across saves independently of the game state.

---

## Triage: what is actually a problem vs polish

| Item | Why it matters | Category |
|---|---|---|
| Remove hardcoded/placeholder UI metrics (e.g., “Quarterly Revenue +$2.0M”) | Incorrect feedback breaks player trust and can teach the wrong strategy. | **Must-fix (player misinformation)** |
| Reduce dual simulation paths (engine tick vs UI-side loops/ledger writes) | Risk of double-counting or divergent outcomes; hardest class of bugs to debug. | **Must-fix (state drift / correctness)** |
| Onboarding / first 10-week guidance | Not “wrong”, but helps most players reach the fun loop without bouncing. | **High value (UX)** |
| Determinism hygiene (replace `Date.now()` IDs in saved state) | Mostly a dev-quality issue: reproducible bugs, mod patching, and long-run stability. | **Should-fix (tech debt)** |
| Expand drama/event variety | Content breadth; matters after the core loop is stable and readable. | **Nice-to-have (content)** |

## Highest-impact fix themes

### 1) Make financial feedback authoritative (remove placeholders)

**Problem**
- The UI presents some values that are not clearly derived from the simulation (e.g., fixed “Quarterly Revenue +$2.0M”), weakening trust in outcomes.
  - Evidence: `src/components/game/StudioDashboard.tsx`.

**Fix**
- Replace any hardcoded finance values with **computed** or **engine-reported** values.

**Implementation approach (recommended)**
1. **Add per-system deltas to the tick report** so the UI can explain *where budget changes came from*.
   - Extend `TickSystemReport` (`src/types/tickReport.ts`) with optional fields, e.g.:
     - `budgetDelta?: number`
     - `debtDelta?: number`
     - `reputationDelta?: number`
   - In `src/game/core/tick.ts`, capture pre/post snapshots around each system and compute these deltas.
2. Update `src/utils/tickReport.ts` to surface a “Finance breakdown” recap card using those per-system deltas (instead of placeholders).
3. Update `StudioDashboard.tsx` to compute “Quarterly Revenue” from the last 13 weeks of tick history by summing *only* the relevant deltas (e.g., `studioRevenue` as “revenue”, `studioEconomy`/`loanPayments` as “costs”).
   - Evidence for revenue/cost responsibility:
     - Revenue: `src/game/systems/studioRevenueSystem.ts`
     - Costs + interest: `src/game/systems/studioEconomySystem.ts`

**Acceptance checks**
- Dashboard contains **no fixed finance numbers**.
- Week recap shows a readable breakdown like:
  - “Revenue (box office/post): +$X”
  - “Operating + production costs: −$Y”
  - “Debt interest: −$Z”
- Add/update unit tests:
  - `tests/tickReport.test.ts` to validate new fields are present and correct.

---

### 2) Add “because X, Y, Z” breakdowns for major outcomes

**Problem**
- Players can see outcomes (box office totals, awards odds, negotiation results), but the repo evidence suggests explanations are not consistently first-class.

**Fix**
- For each major outcome, store a compact “explain” payload and show it in the UI (tooltip or recap).

**Concrete targets**
- **Box office weekly revenue**: expose a breakdown of multipliers (critics, audience, marketing, star power, release type).
  - Engine logic: `src/game/systems/boxOfficeSystem.ts`.
- **Negotiation acceptance**: expose interest score contributors (reputation delta, budget constraints, relationship, etc.).
  - UI logic currently: `src/utils/talentNegotiation.ts`, `src/components/game/TalentNegotiationDialog.tsx`.
- **Governance pressure**: show which factors pushed board confidence/pressure.
  - Engine logic: `src/game/systems/studioGovernanceSystem.ts`.

**Implementation approach**
- Prefer storing explainers on the *state* near the produced metric (e.g., `project.metrics.lastWeeklyRevenueExplain`) or into `TickReport` recap cards.

**Acceptance checks**
- For at least: box office + one other system, players can open a short explanation that answers “why this number?”.

---

### 3) First 10-week onboarding + guided decision funnel

**Problem**
- The game has many systems and screens, but onboarding/help is minimal.
  - Evidence: `src/content/help.md`.

**Fix**
- Implement a “first-run guidance layer” for the first ~10 in-game weeks.

**Implementation approach**
- Use `NextActionsBar` as the canonical “what to do now” surface.
  - `src/components/game/NextActionsBar.tsx`.
- Add a light “tutorial goals” state machine:
  - Targets: `scripts → greenlight → cast director/lead → start marketing → schedule release`.
- Each goal should include:
  - **One-click jump** to the relevant panel/phase.
  - **Success condition** that can be checked from game state.

**Acceptance checks**
- A new player can reach a first release with minimal external knowledge.
- The guidance layer can be dismissed and never returns for that save.

---

### 4) Reduce rules drift: pick one authoritative simulation path

**Problem**
- There are engine systems under `src/game/systems/**` and also UI-side “systems”/helpers under `src/components/game/**` that may duplicate mechanics (box office, finances, loop progression).
  - Examples:
    - Engine: `src/game/systems/boxOfficeSystem.ts`
    - UI: `src/components/game/BoxOfficeSystem.tsx`
    - Engine economy: `src/game/systems/studioEconomySystem.ts`
    - UI ledger: `src/components/game/FinancialEngine.tsx`

**Fix (recommended direction)**
- Treat the **engine tick pipeline** as the only source of truth for simulation:
  - `src/game/core/tick.ts` + `src/game/store.ts` registry.

**Implementation approach**
- Audit call sites in `src/components/game/StudioMagnateGame.tsx` that:
  - directly call `engineAdvanceWeek(...)`, or
  - apply parallel simulation steps / ledger writes.
- Make the UI consume:
  - game state from `useGameStore`, and
  - `lastTickReport` / `tickHistory` for presentation.
- Re-scope UI-side simulation classes to one of:
  1) **pure UI panels** (no state mutation), or
  2) **dev tooling only** (behind DEV flags), or
  3) removed after migration.

**Acceptance checks**
- There is only one place where “a week advances” in single-player.
- Box office, post-theatrical revenue, and economy are applied exactly once per week.

---

### 5) Determinism hygiene: remove `Date.now()` IDs from saved state

**Problem**
- `Date.now()` / `Math.random()` are used in a few places that can end up in persistent state (IDs for script characters/roles, generator IDs).
  - Evidence: `src/components/game/CastingBoard.tsx`, `src/data/TalentGenerator.ts`, `src/data/StudioGenerator.ts`.

**Fix**
- Replace with deterministic ID allocation where IDs are persisted.

**Implementation approach**
- For “create a new entity in state”, use an allocator derived from existing IDs.
  - Utility exists: `src/utils/idAllocator.ts` (`nextNumericId`).
- Keep nondeterministic IDs only for ephemeral UI-only elements that are never saved.

**Acceptance checks**
- Saved game content does not introduce new IDs derived from wall-clock time.
- Determinism tests remain stable:
  - `tests/determinismLongHorizon.test.ts`
  - `tests/engineNoMathRandom.test.ts`

---

### 6) Expand narrative variety without derailing pacing

**Problem**
- Drama systems exist but risk a low variety ceiling.
  - Evidence: `src/game/systems/playerCircleDramaSystem.ts`.

**Fix**
- Add more archetypes and stronger ties to projects/outcomes.

**Implementation ideas (low-risk)**
- Add additional event templates via the existing modding/template approach.
- Tie event triggers to:
  - release timing,
  - awards season,
  - rival releases,
  - repeated collaborations (chemistry/loyalty).

**Acceptance checks**
- Over a multi-year sim run, the drama feed exhibits a broader distribution of event IDs/archetypes.

---

## Recommended order (no timeline)

1) Finance feedback authoritative + per-system deltas
2) “Because X,Y,Z” breakdowns
3) First 10-week onboarding funnel
4) Remove rules drift (single tick pipeline)
5) Determinism hygiene
6) Narrative variety
