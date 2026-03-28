# Fix Talent Management Page & Add Shortlist System

## Status: [IN PROGRESS] 1/12

## Overview
TalentMarketplace lags (renders ALL talent), Cast button useless → Shortlist (limit 12) → CastingBoard shows shortlist tab/quick-assign.

**Plan confirmed**: Limit 12, pagination, store updates.

## Steps
- [x] 1. Plan + TODO.md created
- [ ] 2. Read src/game/store.ts (main game store for types/state)
- [ ] 3. Read src/types/game.ts (extend GameState with shortlistedTalentIds: string[])
- [ ] 4. Update types/game.ts + store.ts (add shortlist state/actions: add/remove/toggle)
- [ ] 5. Update TalentMarketplace.tsx (add pagination 25/page, replace Cast→Shortlist toggle, shortlist badge)
- [ ] 6. Update CastingBoard.tsx (add \"Shortlist\" tab first, quick-assign using fit scores, \"Assign if agree\" workflow)
- [ ] 7. Add shared ShortlistSummary component/panel showing count/badges
- [ ] 8. vitest run tests/*talent* tests/castingEligibility.test.ts (add shortlist tests if missing)
- [ ] 9. Manual test: Marketplace paginates fast, shortlist toggle/limit 12, badge shows
- [ ] 10. Casting: Shortlist tab, fit-sorted, quick-assign to role if available
- [ ] 11. Performance: Marketplace <1s load even 1000+ talents
- [ ] 12. attempt_completion

## Key Files
- `src/components/game/TalentMarketplace.tsx` (lag + button fix)
- `src/components/game/CastingBoard.tsx` (shortlist integration)
- `src/game/store.ts` (shortlist state/actions)
- `src/types/game.ts` (GameState extension)

## Risks/Notes
- Shortlist: gameState.shortlistedTalentIds: string[] (max 12)
- Quick-assign: Use getTalentRoleFitScore from castingEligibility, skip negotiation if fit>80 & available
- No new deps unless virt needed (add react-window if lag persists)
- Persist shortlist across saves/loads via game store

