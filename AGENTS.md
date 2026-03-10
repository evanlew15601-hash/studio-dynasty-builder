# Agent notes

- Prefer validating game/simulation logic via the existing Vitest “in-game” integration tests under `tests/`.
- When you need coverage for a specific piece of system data and no test exists, add a small temporary test (and remove it once the change is verified if it’s only for debugging).
- Default commands:
  - Run unit/integration tests: `npm test` (script: `npx vitest run`)
  - Run lint: `npm run lint`
  - Run typecheck: `npm run typecheck`
  - Run build: `npm run build`
  - Run e2e tests: `npm run test:e2e`
  - Run full preflight: `npm run check`
  - Run Tauri dev shell: `npm run tauri:dev`
