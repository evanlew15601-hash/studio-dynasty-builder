# Fix Casting Softlock: Show Closest Talent Options

## Status: [IN PROGRESS] 0/9

## Overview
Roles with strict criteria (age/race/nationality) show no options → softlock.
**Fix**: Fuzzy matching with fit scores, UI shows sorted candidates + partial fit badges.

## Steps
- [ ] 1. Implement `getTalentRoleFitScore` & `talentSortsRole` in `src/utils/castingEligibility.ts`
- [ ] 2. Run `vitest run tests/castingEligibility.test.ts` → update tests if needed
- [x] 3. Plan confirmed
- [ ] 4. Read `src/components/game/CastingBoard.tsx` full content
- [ ] 5. Update CastingBoard: filter/sort by fit score, badges for mismatches, perfect/low warnings
- [ ] 6. Run relevant UI/game tests `vitest run tests/casting*`
- [ ] 7. Update `src/components/game/PersistentCharacterCasting.tsx` to use sorting
- [ ] 8. Manual verify: casting UI shows closest options, negotiation works, no softlock
- [ ] 9. attempt_completion

## Key Files
```
src/utils/castingEligibility.ts     # Fit score logic
src/components/game/CastingBoard.tsx # Player casting UI
src/components/game/PersistentCharacterCasting.tsx # History UI
tests/castingEligibility.test.ts    # Tests
```

## Risks/Notes
- Preserve strict mode for tests/debug
- Threshold: warn <70/100, block <50/100?
- Age flex: ±4yrs=100%, ±8yrs=75%, etc.
- Races: exact=100%, similar group=60%

