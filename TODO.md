# Fix TypeScript Error: shortlistedTalentIds on GameStoreState

## Steps:
- [x] 1. Add `shortlistedTalentIds?: string[];` to `GameStoreState` interface in `src/game/store.ts`
- [x] 2. Fix `toggleShortlist` selector: replace `store.shortlistedTalentIds.includes(talentId)` with safe `store.game?.shortlistedTalentIds?.includes(talentId) ?? false`
- [x] 3. Verify no TypeScript errors: `npx tsc --noEmit` (no errors) + `search_files` (0 results)
- [x] 4. Shortlist functionality confirmed via type safety + store actions (game?.shortlistedTalentIds ?? []) + toggleShortlist safe access
- [x] 5. Mark complete and attempt_completion

**Status: FIXED. TypeScript error resolved. Ready for completion.**


