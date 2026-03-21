# Studio Magnate — Playability Score (Technical Evidence Rubric)

## Scope

- **Scope:** *pure playability* of the **single-player base game**.
- **Not scored:** Steam/achievements integration, Supabase/Online League ops, installers, release checklists, storefront concerns.
- **Method:** this score is **criteria-driven** and based on **verifiable repo evidence** (engine structure, guardrails, tests, and UI affordances that directly support play).

## How scoring works

- Total: **0–100**
- Each category has **explicit checks** with point values.
- The final score is the **sum of points earned**.

> This is intentionally more “technical” than experiential: it rewards *implemented, testable play systems* and penalizes missing *systemic scaling/authoritativeness*.

---

## Final technical playability score: **83 / 100**

### Score breakdown

| Category | Max | Score |
|---|---:|---:|
| 1) Determinism & reproducibility guardrails | 20 | 18 |
| 2) Core loop completeness (create → ship → outcomes) | 25 | 21 |
| 3) Economic loop coherence (costs ↔ revenue ↔ risk) | 15 | 10 |
| 4) Player guidance & observability (technical signals) | 15 | 10 |
| 5) Long-horizon scaffolding (years/eras/history) | 10 | 10 |
| 6) Verification depth (tests as playability proxy) | 15 | 14 |
| 7) Systemic difficulty scaling & tuning knobs | 10 | 0 |
| **Total** | **100** | **83** |

---

## 1) Determinism & reproducibility guardrails (Max 20, Score 18)

**What this measures:** whether the simulation is repeatable and debuggable (a big playability multiplier for management sims).

### Checks

- **+5** Deterministic weekly tick pipeline with seeded RNG
  - Evidence: `src/game/core/tick.ts` (ctx.rng, single tick entrypoint).
- **+4** Explicit guardrail preventing `Math.random()` in `src/game/**`
  - Evidence: `tests/engineNoMathRandom.test.ts`.
- **+3** Explicit guardrail preventing local-time `new Date(year, ...)` usage
  - Evidence: `tests/noLocalDateCtorInSrc.test.ts`.
- **+5** Determinism regression test: same seed + same decisions ⇒ identical final state
  - Evidence: `tests/determinismLongHorizon.test.ts`.
- **+3** Deterministic stable scoring for outcomes (e.g., stable critics/audience scores)
  - Evidence: `src/game/systems/boxOfficeSystem.ts` (`stableInt(...)`).

### Deductions

- **−2** UI-side state mutations still use nondeterministic sources (e.g., `Date.now()` for IDs) which can reduce perfect replay reproducibility.
  - Evidence: `src/components/game/CastingBoard.tsx` uses `Date.now()` for role IDs.

---

## 2) Core loop completeness (Max 25, Score 21)

**What this measures:** whether the core “make content → ship → see outcomes → reinvest” loop is implemented end-to-end.

### Checks

- **+4** Script creation + greenlight path exists
  - Evidence: `src/components/game/ScriptDevelopment.tsx`.
- **+4** Casting loop exists (availability filters + negotiation + assignment)
  - Evidence: `src/components/game/CastingBoard.tsx`, `src/components/game/TalentNegotiationDialog.tsx`.
- **+5** Phase progression is engine-owned with gating rules (prevents skipping requirements)
  - Evidence: `src/game/systems/projectLifecycleSystem.ts` (director/lead gating, post-production stop for marketing).
- **+3** Marketing progression exists and transitions into release readiness
  - Evidence: `src/game/systems/marketingCampaignSystem.ts`.
- **+4** Release scheduling and “scheduled release becomes released” pipeline exists
  - Evidence: `src/game/systems/scheduledReleaseSystem.ts`.
- **+5** Outcomes pipeline exists (theatrical performance + downstream revenue windows)
  - Evidence: `src/game/systems/boxOfficeSystem.ts`, `src/game/systems/studioRevenueSystem.ts`, `src/game/systems/postTheatricalRevenueSystem.ts`.

### Deductions

- **−2** Some loop logic appears split between engine systems and UI/legacy helpers, which can create “what actually drives outcomes?” ambiguity.
  - Evidence: presence of non-engine gameplay utilities such as `src/components/game/GameplayLoops.tsx` and UI-side financial tracking (`FinancialEngine`) alongside engine-side `StudioEconomySystem`.

---

## 3) Economic loop coherence (Max 15, Score 10)

**What this measures:** whether costs/revenue are consistently applied so players can learn by reading outcomes.

### Checks

- **+5** Studio operating costs + production cost drain + debt/interest exist
  - Evidence: `src/game/systems/studioEconomySystem.ts`.
- **+3** Talent payroll is modeled and contracts expire
  - Evidence: `src/game/systems/talentContractsSystem.ts`.
- **+4** Revenue collection is modeled from box office and post-theatrical releases
  - Evidence: `src/game/systems/studioRevenueSystem.ts`.

### Deductions

- **−2** Multiple financial representations exist (engine-side budget/debt changes vs UI-side ledger), increasing risk of inconsistent player feedback.
  - Evidence: `src/components/game/FinancialEngine.tsx` and related UI components vs `StudioEconomySystem`/`StudioRevenueSystem`.

---

## 4) Player guidance & observability (technical signals) (Max 15, Score 10)

**What this measures:** technical presence of UX affordances that reduce confusion (not subjective UI quality).

### Checks

- **+5** “Next action” guidance exists
  - Evidence: `src/components/game/NextActionsBar.tsx`.
- **+5** Tick recap infrastructure exists (per-system reporting)
  - Evidence: `src/game/core/tick.ts`, `src/utils/tickReport.ts`, `src/game/store.ts` (tickHistory/lastTickReport).
- **+3** A dashboard aggregates key state for fast reading
  - Evidence: `src/components/game/StudioDashboard.tsx`.
- **+2** In-game help exists
  - Evidence: `src/content/help.md`.

### Deductions

- **−5** Some surfaced metrics are placeholders or not obviously driven by the simulation, reducing trust in feedback.
  - Evidence: fixed “Quarterly Revenue +$2.0M” in `StudioDashboard.tsx`.

---

## 5) Long-horizon scaffolding (Max 10, Score 10)

**What this measures:** support for multi-year play (a major playability factor for tycoon sims).

### Checks

- **+3** Talent lifecycle and retirement exist
  - Evidence: `src/game/systems/talentLifecycleSystem.ts`, `src/game/systems/talentRetirementSystem.ts`.
- **+3** Annual yearbook + milestone summarization exists
  - Evidence: `src/game/systems/worldYearbookSystem.ts`, `src/game/systems/worldMilestonesSystem.ts`.
- **+2** Market trend shifts exist
  - Evidence: `src/game/systems/genreTrendsSystem.ts`.
- **+2** Archival/pruning exists to keep timelines bounded
  - Evidence: `src/game/systems/worldArchiveSystem.ts`.

---

## 6) Verification depth (tests as playability proxy) (Max 15, Score 14)

**What this measures:** presence of automated checks that prevent “break the loop” regressions.

### Checks

- **+5** Engine tick + determinism tests exist
  - Evidence: `tests/engineCore.test.ts`, `tests/determinismLongHorizon.test.ts`.
- **+4** Softlock resistance is tested
  - Evidence: `tests/softlockSmoke.test.ts`.
- **+3** Determinism guardrails exist (no Math.random, no local Date constructor)
  - Evidence: `tests/engineNoMathRandom.test.ts`, `tests/noLocalDateCtorInSrc.test.ts`.
- **+3** Broad system coverage exists (box office, awards, releases, talent, governance)
  - Evidence: `tests/engineBoxOfficeSystem.test.ts`, `tests/engineAwardsSeasonSystem.test.ts`, `tests/engineScheduledReleaseSystem.test.ts`, `tests/studioGovernanceSystem.test.ts`, etc.

### Deductions

- **−1** UI playability regressions (click-path/UX) are not strongly evidenced in unit tests (expected, but still a technical gap).

---

## 7) Systemic difficulty scaling & tuning knobs (Max 10, Reported as missing)

**What this measures:** whether difficulty changes ongoing constraints (not just initial cash).

### Evidence-based assessment

- Difficulty selection exists, but the clearest visible impact is **starting budget**.
  - Evidence: `src/components/game/GameLanding.tsx` (difficultySettings → startingBudget).

Because you asked for a technical scoring method and explicitly care about **systemic scaling**, this category is reported as **missing** (0/10) rather than partially satisfied.

---

## Quick interpretation

- **Why this technical score is higher than subjective/play-feel scores:** the repo has unusually strong determinism + regression testing, which is a major technical foundation for long-form management play.
- **What’s holding it back technically (relative to 90+):** the main blockers are (1) **single source of truth** for finances/feedback, and (2) **difficulty scaling that changes the simulation**, not just the starting conditions.
