# Studio Magnate — Playability Score (Player Lens + Technical Lens)

## Scope and assumptions

- **Scope:** *pure playability* of the **single-player base game** (no Online League, no Steam/DLC unlock assumptions, no shipping concerns).
- **Basis:** derived from **repository inspection** (systems + UI flow + tests) rather than hands-on playtesting.

## 0–100 interpretation

- **90–100:** exceptional, “lost-a-weekend” management sim with strong pacing, clarity, and long-run goals.
- **80–89:** very good; deep and cohesive with minor rough edges.
- **70–79:** solid and engaging; clearly playable, but with noticeable friction or tuning gaps.
- **60–69:** interesting systems but inconsistent moment-to-moment playability.
- **<60:** core loop exists but isn’t yet reliably compelling or readable.

---

## Scores at a glance

This doc intentionally reports **two scores**:

| Lens | Score | What it measures |
|---|---:|---|
| **Player-facing playability (Tycoon-casual)** | **73 / 100** | Likely *felt* experience: clarity, feedback, pacing, cozy challenge. |
| **Technical playability foundation (Evidence checklist)** | **83 / 100** | Repo-backed signals: determinism, core-loop completeness, long-horizon scaffolding, tests/guardrails. |

Why they differ:

- The codebase is **technically strong** in determinism and automated regression coverage.
- The player-facing score stays lower because the rubric emphasizes **clarity/feedback quality** and **systemic difficulty scaling** (not just starting resources).

---

## Lens 1 — Player-facing playability (Tycoon-casual weighting)

### Rubric (weights)

Each category is scored **0–10**, then multiplied by its **weight**.

This weighting assumes the game should be **challenging without being frustrating**, and that having only a few intentional fail states is a **positive**.

| Category | Weight |
|---|---:|
| **1) Core loop clarity & agency** | 25 |
| **2) Feedback, legibility & UI affordances** | 20 |
| **3) Pacing & friction** | 15 |
| **4) Strategic depth & system interlock** | 15 |
| **5) Challenge, balance & fail states** | 10 |
| **6) Narrative emergence & character attachment** | 10 |
| **7) Replayability & long-horizon motivation** | 5 |

### Scorecard (with repo evidence)

**Final:** **73 / 100**

#### 1) Core loop clarity & agency — **7.5 / 10 → 18.8 / 25**

**What’s strong**
- Clear intended loop: **script → casting → production → marketing → release → revenue/awards**.
  - Lifecycle gating: `src/game/systems/projectLifecycleSystem.ts`.
- “What should I do next?” guidance: `src/components/game/NextActionsBar.tsx`.
- Time advance is guarded to prevent skipping decisions: `src/game/store.ts` + `tests/advanceWeekBlockedByPendingEvents.test.ts`.

**What holds it back**
- Onboarding/help is short and not deeply mechanical: `src/content/help.md`.
- UI breadth risks diluting the “decision funnel”.

#### 2) Feedback, legibility & UI affordances — **7.5 / 10 → 15 / 20**

**What’s strong**
- Tick recap infrastructure exists and is used: `src/game/core/tick.ts`, `src/utils/tickReport.ts`.
- Long-run summaries exist (yearbooks/milestones): `src/game/systems/worldYearbookSystem.ts`, `src/game/systems/worldMilestonesSystem.ts`.

**What holds it back**
- Some surfaced metrics appear placeholder/non-authoritative (trust hit): `src/components/game/StudioDashboard.tsx`.

#### 3) Pacing & friction — **7 / 10 → 10.5 / 15**

**What’s strong**
- Weekly cadence + deterministic systems fit the genre.
- Softlock resistance is explicitly tested: `tests/softlockSmoke.test.ts`.

**What holds it back**
- Many panels/tabs increases context switching.

#### 4) Strategic depth & system interlock — **8 / 10 → 12 / 15**

**What’s strong**
- Many integrated engine systems wired into a deterministic tick pipeline: `src/game/store.ts`, `src/game/core/tick.ts`.
- Examples of meaningful interlocks:
  - Marketing → box office: `src/game/systems/marketingCampaignSystem.ts`, `src/game/systems/boxOfficeSystem.ts`.
  - Awards campaigning: `src/game/systems/awardsSeasonSystem.ts`.
  - Governance pressure: `src/game/systems/studioGovernanceSystem.ts`.

**What holds it back**
- “Rules drift” risk if gameplay logic is split between engine and UI/legacy helpers.

#### 5) Challenge, balance & fail states — **6.5 / 10 → 6.5 / 10**

**What’s strong (for a cozy tycoon)**
- Game flow prevents accidental failure cascades (can’t skip required decisions).
- A real cost/runway model exists (overhead, debt interest, payroll):
  - `src/game/systems/studioEconomySystem.ts`
  - `src/game/systems/talentContractsSystem.ts`

**What holds it back (for systemic scaling)**
- Difficulty appears primarily tied to starting budget: `src/components/game/GameLanding.tsx`.

#### 6) Narrative emergence & character attachment — **7 / 10 → 7 / 10**

**What’s strong**
- Strong talent identity hooks and relationship scaffolding: `src/types/game.ts`.
- Player-facing drama decisions exist: `src/game/systems/playerCircleDramaSystem.ts`.

**What holds it back**
- Limited number of drama archetypes may become repetitive.

#### 7) Replayability & long-horizon motivation — **7 / 10 → 3.5 / 5**

**What’s strong**
- Long-horizon systems exist (lifecycle/retirement, yearbooks/milestones, genre shifts):
  - `src/game/systems/talentLifecycleSystem.ts`
  - `src/game/systems/talentRetirementSystem.ts`
  - `src/game/systems/worldYearbookSystem.ts`
  - `src/game/systems/genreTrendsSystem.ts`

**What holds it back**
- Less evidence of explicit long-run “north star” goals presented to the player.

### Summary: why this is a 73 (not an 85) under a tycoon-casual lens

- **Systemic difficulty scaling**: challenge seems to mostly be a *starting condition* choice rather than ongoing systemic pressure.
- **Clarity vs breadth**: the game has the systems, but the decision funnel and “why did this happen?” explanations can be stronger.

### “If you fixed only three playability things” (non-shipping)

1. **Strengthen onboarding for the first 10 in-game weeks** (tutorialized goals + why numbers changed).
2. **Add systemic difficulty scaling (without harsher fail states)**: tune market/AI multipliers, negotiations, costs, etc. (not just starting cash).
3. **Tighten the feedback loop**: show compact “because X, Y, Z” breakdowns for major outcomes.

---

## Lens 2 — Technical playability foundation (evidence checklist)

This lens is meant to be **criteria-driven**: it scores what’s verifiably present in the repo.

### Final technical score: **83 / 100**

| Category | Max | Score | Key evidence |
|---|---:|---:|---|
| 1) Determinism & reproducibility guardrails | 20 | 18 | `tests/engineNoMathRandom.test.ts`, `tests/noLocalDateCtorInSrc.test.ts`, `tests/determinismLongHorizon.test.ts` |
| 2) Core loop completeness (create → ship → outcomes) | 25 | 21 | `projectLifecycleSystem`, `scheduledReleaseSystem`, `boxOfficeSystem`, `studioRevenueSystem` |
| 3) Economic loop coherence (costs ↔ revenue ↔ risk) | 15 | 10 | `studioEconomySystem`, `talentContractsSystem`, `studioRevenueSystem` |
| 4) Player guidance & observability (technical presence) | 15 | 10 | `NextActionsBar`, tick report infrastructure |
| 5) Long-horizon scaffolding (years/eras/history) | 10 | 10 | lifecycle/retirement/yearbook/milestones/archive systems |
| 6) Verification depth (tests as playability proxy) | 15 | 14 | broad engine system tests + `softlockSmoke.test.ts` |
| 7) Systemic difficulty scaling & tuning knobs | 10 | 0 | difficulty primarily sets starting budget (`GameLanding.tsx`) |
| **Total** | **100** | **83** | |

### What this technical score is saying

- The repo has unusually strong **determinism** and **regression tests** for a management sim.
- The biggest technical gap (given your stated preference) is **systemic difficulty scaling**.

### Notable technical risks (playability-adjacent)

- **Non-deterministic ID/time sources still appear in UI and generators** (fine for UI, but can leak into “authoritative” logic if not contained):
  - e.g. `Date.now()` usage in casting/role scaffolding: `src/components/game/CastingBoard.tsx`.
- **Multiple “sources of truth” for some concepts** can reduce feedback trust if UI and engine drift:
  - e.g. UI financial tracking (`src/components/game/FinancialEngine.tsx`) alongside engine economy (`src/game/systems/studioEconomySystem.ts`).

---

## Appendix: key files referenced

- Core determinism + tick: `src/game/core/tick.ts`, `src/game/store.ts`
- Player guidance: `src/components/game/NextActionsBar.tsx`, `src/utils/tickReport.ts`
- Core loop systems: `src/game/systems/projectLifecycleSystem.ts`, `src/game/systems/marketingCampaignSystem.ts`, `src/game/systems/scheduledReleaseSystem.ts`, `src/game/systems/boxOfficeSystem.ts`, `src/game/systems/studioRevenueSystem.ts`
- Economy + contracts: `src/game/systems/studioEconomySystem.ts`, `src/game/systems/talentContractsSystem.ts`
- Long-horizon: `src/game/systems/talentLifecycleSystem.ts`, `src/game/systems/talentRetirementSystem.ts`, `src/game/systems/worldYearbookSystem.ts`, `src/game/systems/worldMilestonesSystem.ts`, `src/game/systems/worldArchiveSystem.ts`, `src/game/systems/genreTrendsSystem.ts`
- Guardrails/tests: `tests/engineNoMathRandom.test.ts`, `tests/noLocalDateCtorInSrc.test.ts`, `tests/determinismLongHorizon.test.ts`, `tests/softlockSmoke.test.ts`, `tests/engineCore.test.ts`
