# Studio Magnate

A film-studio management / “Hollywood tycoon” simulation game built with Vite + React + TypeScript.

## Local development

```sh
npm i
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

No environment variables are required to run the base game.

### Optional: Online League (Supabase)

Online League mode requires a Supabase project (hosted or local) and these Vite env vars:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Setup:

```sh
cp .env.example .env
# edit .env and set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
```

Notes:
- `.env` is gitignored to avoid committing secrets.

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
