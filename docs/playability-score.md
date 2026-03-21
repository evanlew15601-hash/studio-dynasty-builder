# Studio Magnate — Playability Score (Code-Inspection Rubric)

## Scope and assumptions

- **Scope:** *pure playability* of the **single-player base game** (no Online League, no Steam/DLC unlock assumptions, no shipping concerns).
- **Basis:** this score is derived from **repository inspection** (systems + UI flow + tests) rather than hands-on playtesting, so it emphasizes *implemented mechanics and their likely player experience*.

## 0–100 interpretation

- **90–100:** exceptional, “lost-a-weekend” management sim with strong pacing, clarity, and long-run goals.
- **80–89:** very good; deep and cohesive with minor rough edges.
- **70–79:** solid and engaging; clearly playable, but with noticeable friction or tuning gaps.
- **60–69:** interesting systems but inconsistent moment-to-moment playability.
- **<60:** core loop exists but isn’t yet reliably compelling or readable.

---

## Rubric (weights + what “good” means)

Each category is scored **0–10**, then multiplied by its **weight**.

| Category | Weight | What a 9–10 looks like | What a 4–6 looks like |
|---|---:|---|---|
| **1) Core loop clarity & agency** | 20 | Player always knows what to do next; decisions are meaningful weekly; minimal “busywork”. | Loop exists but unclear; player frequently asks “what now?” |
| **2) Strategic depth & system interlock** | 20 | Many levers that interact; choices have second-order effects; multiple viable strategies. | Lots of features, but they don’t meaningfully connect (or one dominates). |
| **3) Feedback, legibility & UI affordances** | 15 | Outcomes are explained; dashboards/recaps tell the story; player can attribute cause→effect. | Data exists but is noisy/overwhelming or missing key “why did that happen?” |
| **4) Challenge, balance & fail states** | 15 | Difficulty meaningfully changes constraints; economy is stable; failure is possible but fair. | Difficulty is mostly starting resources; economy/AI feel swingy or exploitable. |
| **5) Pacing & friction** | 10 | Week-to-week cadence feels good; actions are low-click; no long dead zones. | Lots of clicking/tabs; waiting/idle time; frequent context switching. |
| **6) Narrative emergence & character attachment** | 10 | Talent/studio stories emerge; rivals and careers are memorable; drama is varied but not spammy. | Some events exist, but feel repetitive or disconnected from outcomes. |
| **7) Replayability & long-horizon motivation** | 10 | New runs feel meaningfully different; long-run arcs/eras/records create “just one more year”. | Runs feel similar; long-run goals are thin or mostly cosmetic. |

---

## Scorecard (with repo evidence)

### Final score: **72 / 100**

This lands in “solid and engaging, with noticeable friction/tuning gaps.” The game appears **very feature-rich**, with a **deterministic weekly simulation engine** and many interacting subsystems, but the *player-facing clarity* and *balance/difficulty depth* look like the main limiters to a higher playability score.

### 1) Core loop clarity & agency — **7.5 / 10 → 15 / 20**

**What’s strong**
- Clear intended loop: **script → casting → production → marketing → release → revenue/awards**.
  - UI phases and gating exist (e.g., project lifecycle gates requiring roles/casting): `src/game/systems/projectLifecycleSystem.ts`.
- “What should I do next?” support exists via a **Next Actions Bar** that points the player to the appropriate phase and project: `src/components/game/NextActionsBar.tsx`.
- The tick loop blocks advancing time while decisions are pending (prevents skipping important events): `src/game/store.ts` + `tests/advanceWeekBlockedByPendingEvents.test.ts`.

**What holds it back**
- **Help/onboarding is short** and largely non-mechanical; many subsystems are not explained in-game: `src/content/help.md`.
- The game has many panels (media, lore, awards, franchises, etc.) which can dilute the “core next step” unless the player follows the Next Actions Bar religiously.

### 2) Strategic depth & system interlock — **8 / 10 → 16 / 20**

**What’s strong**
- A large number of systems interact through the deterministic tick pipeline (projects, economy, box office, awards, post-theatrical, governance, talent lifecycle/retirement, genre trends, gossip/drama):
  - Registry ordering: `src/game/store.ts`.
  - Deterministic tick contract: `src/game/core/tick.ts`.
- Interlock examples that meaningfully matter:
  - **Marketing → box office multiplier**: `src/game/systems/marketingCampaignSystem.ts`, `src/game/systems/boxOfficeSystem.ts`.
  - **Awards → reputation/budget boosts**, and award campaigning affects probabilities: `src/game/systems/awardsSeasonSystem.ts`.
  - **Governance pressure** responds to runway, debt, project load and reputation: `src/game/systems/studioGovernanceSystem.ts`.
  - **Talent careers** evolve over years (stages, retirement, career events, yearbooks): `src/game/systems/talentLifecycleSystem.ts`, `src/game/systems/talentRetirementSystem.ts`, `src/game/systems/worldYearbookSystem.ts`.

**What holds it back**
- Some gameplay logic appears duplicated between legacy/UI-oriented systems and the engine (even if the repo is moving toward engine ownership). This can create “rules drift” risk and player confusion about what truly drives outcomes.

### 3) Feedback, legibility & UI affordances — **7.5 / 10 → 11 / 15**

**What’s strong**
- Week Recap and per-system reporting exists in the engine (and is tested): `src/game/core/tick.ts`, `src/utils/tickReport.ts`.
- Narrative summaries exist (yearbooks + milestones), which helps long runs feel coherent: `src/game/systems/worldYearbookSystem.ts`, `src/game/systems/worldMilestonesSystem.ts`.
- The dashboard surfaces key “tycoon UI” concepts (projects, trends, governance constraints): `src/components/game/StudioDashboard.tsx`.

**What holds it back**
- Some dashboard values look placeholder/simplified (e.g., fixed “Quarterly Revenue +$2.0M” presentation), which can reduce trust in the feedback loop.
- The UI breadth is very high; without careful prioritization, players may get *data-rich but decision-poor* screens.

### 4) Challenge, balance & fail states — **6 / 10 → 9 / 15**

**What’s strong**
- There is an actual **money/debt runway** model and recurring costs:
  - Studio overhead + production cost drain + debt interest: `src/game/systems/studioEconomySystem.ts`.
  - Payroll and contract expiry: `src/game/systems/talentContractsSystem.ts`.
- Competition exists via deterministic competitor releases and comparative pressure: `src/game/systems/competitorFilmReleaseSystem.ts`, `src/game/systems/studioGovernanceSystem.ts`.

**What holds it back**
- Difficulty appears **primarily starting budget** (easy/normal/hard/magnate). There’s limited evidence of systemic difficulty scaling beyond initial resources: `src/components/game/GameLanding.tsx`.
- Core economic numbers are relatively simple (fixed overhead constants, linear-ish multipliers), which can produce dominant strategies unless tuned carefully.

### 5) Pacing & friction — **7 / 10 → 7 / 10**

**What’s strong**
- Weekly cadence with deterministic systems is a good fit for this genre; the engine is designed to keep week advancement consistent.
- “Softlock smoke test” suggests the loop can run long without stalling on events: `tests/softlockSmoke.test.ts`.

**What holds it back**
- The gameplay surface area is extremely broad (many tabs + subpanels). Even if each is good, the overall experience risks heavy context switching.

### 6) Narrative emergence & character attachment — **7 / 10 → 7 / 10**

**What’s strong**
- Talent has meaningful identity hooks (biographies, relationships, chemistry, loyalty, scandals, filmographies): `src/types/game.ts`.
- Player-facing drama decisions exist and can affect reputation and relationships (and are deterministic-friendly): `src/game/systems/playerCircleDramaSystem.ts`.

**What holds it back**
- The “drama” layer currently looks like a **limited set of event archetypes** (feud/poach), which may feel repetitive without enough variety or stronger ties to specific projects and outcomes.

### 7) Replayability & long-horizon motivation — **7 / 10 → 7 / 10**

**What’s strong**
- Procedural + deterministic world generation enables varied runs and reproducibility.
- Long-horizon systems exist (talent lifecycle + retirement, yearbooks, milestones, genre shifts): `src/game/systems/talentLifecycleSystem.ts`, `src/game/systems/talentRetirementSystem.ts`, `src/game/systems/worldYearbookSystem.ts`, `src/game/systems/genreTrendsSystem.ts`.
- Franchises and public-domain IP add run variety and strategic direction: `src/types/game.ts`, `src/components/game/ScriptDevelopment.tsx`.

**What holds it back**
- The repo shows strong *infrastructure* for long runs, but less evidence (at UI/help level) of **explicit long-run player goals** beyond “grow and win awards.”

---

## Summary: why this is a 72 (not an 85)

The game already has many characteristics of a strong management sim:

- A deterministic weekly simulation engine with many integrated systems.
- Meaningful levers (casting, marketing, release strategy, awards campaigning, debt/runway management).
- Narrative texture (yearbooks/milestones, talent careers, player-circle events).

The main playability risks visible from the repo are:

- **Difficulty/balance depth**: difficulty largely looks like starting budget; economy numbers may need more tuning to ensure multiple viable strategies.
- **Clarity vs breadth**: many panels/features can dilute the “decision funnel” unless guidance/recaps are exceptionally good.
- **Consistency of feedback**: any placeholder or overly-simplified UI stats can undermine the core management-game satisfaction loop.

---

## “If you fixed only three playability things” (non-shipping)

1. **Strengthen onboarding for the first 10 in-game weeks** (explicit tutorialized goals and explanation of why numbers changed).
2. **Make difficulty affect systems, not just starting cash** (e.g., tighter market multipliers, harder negotiations, higher overhead/interest, stronger competitors).
3. **Tighten the feedback loop**: for every major outcome (box office, awards odds, negotiation acceptance), show a compact “because X, Y, Z” breakdown.

---

## Appendix: key files referenced

- Core loop + determinism: `src/game/core/tick.ts`, `src/game/store.ts`
- Project progression: `src/game/systems/projectLifecycleSystem.ts`
- Marketing + revenue: `src/game/systems/marketingCampaignSystem.ts`, `src/game/systems/boxOfficeSystem.ts`, `src/game/systems/studioRevenueSystem.ts`
- Economy + contracts: `src/game/systems/studioEconomySystem.ts`, `src/game/systems/talentContractsSystem.ts`
- Awards: `src/game/systems/awardsSeasonSystem.ts`
- Long-horizon: `src/game/systems/talentLifecycleSystem.ts`, `src/game/systems/talentRetirementSystem.ts`, `src/game/systems/worldYearbookSystem.ts`, `src/game/systems/worldMilestonesSystem.ts`, `src/game/systems/genreTrendsSystem.ts`
- Narrative/drama: `src/game/systems/playerCircleDramaSystem.ts`
- UI guidance: `src/components/game/NextActionsBar.tsx`, `src/components/game/StudioDashboard.tsx`
- Tests implying stability: `tests/softlockSmoke.test.ts` and the suite under `tests/engine*.test.ts`
