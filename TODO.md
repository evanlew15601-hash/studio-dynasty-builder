# Online League SQL Setup — FIXED

## Status: [IN PROGRESS] 1/10

## Overview
User request: Show full SQL for online league schema in the online league help page (src/pages/Help.tsx + src/pages/Online.tsx area) for easy copy-paste. Currently exists in src/content/online_league_setup.sql (bundled migrations) and src/content/help.md (mentions \"Copy Online League SQL\" but likely no UI button/modal implements it).

**Confirmed files:**
- `src/pages/Help.tsx`: Renders src/content/help.md via MarkdownLite; has \"Online League (beta)\" section referencing non-existent \"Configure… → Copy Online League SQL\".
- `src/pages/Online.tsx`: Online landing/game page; imports GameLanding (likely has league config UI).
- `src/content/help.md`: Has setup steps mentioning SQL copy (outdated/missing implementation).
- `src/content/online_league_setup.sql`: PERFECT – full bundled SQL from all 8 migrations, safe idempotent (IF NOT EXISTS), ready-to-paste.

**Plan:** Add UI to Online.tsx/Help.tsx: collapsible \"Copy SQL\" section with syntax-highlighted SQL from online_league_setup.sql, one-click copy-to-clipboard, instructions. Link between pages.

## Steps
- [x] 1. Plan + TODO.md created
- [ ] 2. Create src/content/onlineLeagueSql.ts (export sqlContent as string from online_league_setup.sql)
- [ ] 3. Update src/pages/Online.tsx: Add \"Setup SQL\" collapsible/card with SyntaxHighlighter + CopyButton before GameLanding.
- [ ] 4. Update src/pages/Help.tsx: Add direct link to Online.tsx#sql-setup; enhance MD if needed.
- [ ] 5. Create reusable CopySQLButton.tsx (Clipboard API + toast).
- [ ] 6. Add react-syntax-highlighter if missing (`bun add react-syntax-highlighter`).
- [ ] 7. Test copy functionality.
- [ ] 8. Manual test: dev server → Online → copy SQL → verify.
- [ ] 9. Update src/content/help.md with link.
- [ ] 10. attempt_completion.

## Key Files
- `src/pages/Online.tsx` (primary: add SQL display)
- `src/pages/Help.tsx` (link)
- `src/content/online_league_setup.sql` (source ✅)
- `src/content/help.md` (docs)

## Risks/Notes
- Use shadcn Accordion/Card for UX.
- Fallback: <pre><code> if no highlighter.

