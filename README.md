# Studio Magnate

A film-studio management / “Hollywood tycoon” simulation game built with Vite + React + TypeScript.

## Local development

```sh
npm i

# Optional: only needed if/when enabling Supabase features
cp .env.example .env

npm run dev
```

## Scripts

- `npm run lint` — ESLint
- `npm run typecheck` — TypeScript typecheck (project references)
- `npm test` — Vitest (simulation/integration tests live in `tests/`)
- `npm run test:e2e` — Playwright
- `npm run build` / `npm run preview` — production build / serve build
- `npm run check` — preflight (lint + typecheck + tests + build + license allowlist)

## Desktop app (Tauri)

If you have a Rust toolchain installed, you can run the desktop shell:

```sh
npm run tauri:dev
npm run tauri:build
```

## Configuration

This project includes a generated Supabase client (`src/integrations/supabase/client.ts`).

If/when Supabase features are enabled, set these environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Notes:
- `.env` is gitignored to avoid committing secrets.
- The frontend should only ever use the Supabase anon/publishable key (never a service role key).

## Open source & compliance

This project is licensed under Apache-2.0 (see `LICENSE`) and only uses dependencies that are free to use in commercial/monetized products.

### License allowlist check

```sh
npm run licenses:check
```

### Regenerate third-party notices (in-app Open Source tab)

```sh
npm run licenses:generate
```

### Generate an SBOM (CycloneDX)

This produces `sbom/sbom.cdx.json` (not committed; uploaded as a CI artifact).

```sh
npm run sbom:generate
```
