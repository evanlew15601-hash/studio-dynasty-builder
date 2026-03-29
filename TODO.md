# Project Stabilization TODO
Status: 6/25 ✅

## Phase 1: Online League Setup (1-3)
1. [✅] Add "Setup Required" banner + SQL copy button to OnlineLeague.tsx
2. [✅] Integrate SupabaseConfigDialog trigger in OnlineLeague.tsx
3. [✅] Test SQL surfacing works (banner + dialogs functional)

## Phase 2: Talent Shortlist Integration (4-8)
4. [✅] Confirm shortlist store persistence (store.ts toggleShortlist persists in GameState)
5. [✅] Shortlist-first tabs + quick cast in CastingRoleManager.tsx
6. [✅] Shortlist toggle buttons in PersistentCharacterCasting.tsx
7. [✅] TalentMarketplace pagination + buttons (no lag)
8. [✅] Casting from shortlist updates project.cast + persists

Phase 2 ✅

## Phase 3: Streaming Wars Originals Completion (9-15)
9. [✅] Read StreamingHub.tsx + StreamingWarsPlatformApp.tsx + StreamingFilmSystem (series originals only, no films; loglines editable; standard casting; evals in sim)

## Phase 5: React Stability + Final (20-25)
20. [✅] Audit useEffect deps in edited files  
21. [✅] Fix React duplicate declaration (Vite SWC config)
22. [] Full integration test
23. [] Verify all success conditions
24. [] Update TODO.md to completed
25. [] attempt_completion

## Remaining Phases (post-stability)
## Phase 3: Streaming Wars Originals Completion (10-15)
10. [] Add film commissioning option to originals UI
11. [] Make loglines editable post-creation in ScriptDevelopment.tsx
12. [] Wire originals casting + shortlist integration
13. [] Fix release models (Binge/3-episode) + evals
14. [] Test originals full flow
15. [] Verify performance updates

## Phase 4: Economy Balance (16-19)
16. [] Locate talent marketValue update logic
17. [] Implement diminishing growth/soft cap
18. [] Remove touring revenue if found
19. [] Test no billion-dollar actors

