# Studio Dynasty Builder Fixes - Main Branch Only

## Plan Overview
Fix 6 issues per task spec, no branches/PRs, verify in main.

## Steps (Sequential)

### 1. ✅ [DONE] Diagnosis & Planning Complete
- Analyzed files, diagnosed root causes.

### 2. ✅ Issue 1: Online League SQL Visibility
- Edited `src/components/game/OnlineLeague.tsx`: Added prominent SQL dialog trigger.

### 3. ✅ Issue 2: Talent Management Performance
- Edited `src/components/game/TalentMarketplace.tsx`: Added pagination + pager UI.

### 4. Issue 3: Cast Button → Shortlist (Minimal)
- [ ] Verify/enhance shortlist integration if needed (CastingBoard.tsx).

### 5. ✅ Issue 4: Streaming Wars (partial)
- Edited `src/components/game/StreamingWarsPlatformApp.tsx`: Added logline input + default, auto-cast/crew with roles.

### 6. Issues 5/6: No/Minimal Changes
- [ ] Verify touring removed.
- [ ] Tune talent value decay if needed.

### 7. ✅ Verification
- [ ] Run tests: `npm test` (streaming/talent/online).
- [ ] Manual: Check SQL button, pagination, originals logline/roles.
- [ ] attempt_completion.

**Progress: 1/7**
