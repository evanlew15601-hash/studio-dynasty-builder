# Studio Magnate

A film-studio management / “Hollywood tycoon” simulation game built with Vite + React + TypeScript.

## Local development

Requirements:
- Node.js (LTS recommended; Vite requires Node >= 18)

```sh
npm i
npm run dev
```

If you see `TypeError: crypto.getRandomValues is not a function`, you are likely running an old Node version (or a `node` binary shadowing your system install). Check `node -v` and switch to an LTS Node (e.g. via `nvm use`).

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
npm run artifacts:package
```

### Linux system dependencies

On Linux, Tauri requires WebKitGTK + GTK development headers (via `pkg-config`). If you see errors like `The system library gdk-3.0 was not found`, install the prerequisites:

```sh
sudo apt update
sudo apt install -y pkg-config libgtk-3-dev libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf
```

(For other distros, see https://v2.tauri.app/start/prerequisites/#linux)

## Configuration

No environment variables are required to run the base game.

### Optional: Online League (Supabase)

Online League mode requires a Supabase project (hosted or local).

You can configure it either:

- **At runtime** (recommended for desktop builds): main menu → Online League → **Configure…**
- **At build-time** (recommended for local dev / CI builds): set these Vite env vars:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

Build-time setup:

```sh
cp .env.example .env
# edit .env and set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
```

Note: `.env` is only read by Vite during `npm run dev` / `npm run build` (it is not loaded at runtime by the shipped desktop app).

Notes:
- `.env` is gitignored to avoid committing secrets.
- The Supabase migrations include basic retention helpers:
  - completed/inactive leagues can be deleted via `select public.cleanup_online_leagues();`
  - turn-scoped rows are pruned automatically as leagues advance

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
