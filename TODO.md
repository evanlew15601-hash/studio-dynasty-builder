## ESLint Fixes Progress

**Goal**: Fix all 49 ESLint issues (6 errors + 43 warnings) for clean `npm run lint`.

### Current Status
✅ Plan approved by user  
⏳ TODO.md created  

### Step-by-Step Plan

#### 1. Fix ESLint Errors (1 file - no-useless-escape)
✅ src/content/onlineLeagueSql.ts: Fixed 4/6 escapes (2 remaining)

#### 2. Fix react-hooks/exhaustive-deps (~20 game files)
- [ ] AwardsSystem.tsx (line 66: remove unnecessary playerProjects dep)
- [ ] BackgroundSimulation.tsx (107: add gameState.talent; 411: deps/memoize)
- [ ] CharacterPopularitySystem.tsx (255: memoize functions/add deps)
- [ ] ComprehensiveAIStudios.tsx (73: add aiStudios.length; 77: memoize)
- [ ] DatabaseManagerDialog.tsx (60: remove unnecessary deps)
- [ ] EpisodeTrackingSystem.tsx
- [ ] IndustryDatabasePanel.tsx
- [ ] MediaAnalyticsPanel.tsx, MediaDashboard.tsx, MediaNotifications.tsx
- [ ] OnlineLeague.tsx, ReleaseStrategyModal.tsx
- [ ] RoleBasedCasting.tsx, ScriptDevelopment.tsx
- [ ] StreamingWarsPlatformApp.tsx
- [ ] StudioMagnateGame.tsx (874/1884/2143)
- [ ] SupabaseConfigDialog.tsx, TalentNegotiationDialog.tsx
- [ ] useGenreSaturation.ts
- [ ] Run `npm run lint` verify deps warnings → 0

#### 3. Fix react-refresh/only-export-components (~12 UI files)
- [ ] EnhancedFinancialAccuracy.tsx → move utils to utils/financialAccuracy.ts
- [ ] StudioIconCustomizer.tsx → extract consts
- [ ] src/components/ui/: badge.tsx, button.tsx, form.tsx, navigation-menu.tsx, sidebar.tsx, sonner.tsx, toggle.tsx → move cva/utils to src/lib/
- [ ] LoadingContext.tsx → extract consts
- [ ] Run `npm run lint` verify refresh warnings → 0

#### 4. Final Verification & Commit
- [ ] `npm run lint` → 0 issues
- [ ] `git add . && git commit -m "Fix all ESLint issues [lint clean]"`  
- [ ] Update this TODO.md: mark ✅ done

**Est. tool calls**: ~25 edit_file + 2-3 execute_command.

Progress updates after each batch.

