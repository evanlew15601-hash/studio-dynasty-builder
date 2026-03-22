# Release checklist (beta)

This is a lightweight checklist to help ensure builds are reproducible and artifacts are shippable.

## 1) Versioning

- [ ] Bump version in `package.json` (used by Tauri config via `src-tauri/tauri.conf.json`)
- [ ] Bump version in `src-tauri/Cargo.toml` (crate/app metadata)
- [ ] Ensure `src-tauri/tauri.conf.json` identifier, product name, and bundle settings are correct

## 2) Environment

- [ ] Confirm the app starts and plays a new run with no environment variables set

## 3) Security

- [ ] Review `src-tauri/tauri.conf.json` CSP (keep it as strict as possible)
- [ ] Confirm debug/test UI is hidden in production builds
  - Optional QA override: set `localStorage["studio-magnate-debug-ui"] = "1"`
- [ ] Confirm noisy console logging is suppressed in production builds
  - Optional QA override: set `localStorage["studio-magnate-verbose-logs"] = "1"`

## 4) Preflight

```sh
npm ci
npm run check
```

## 5) Desktop builds (Tauri)

- [ ] Verify saving works on a clean machine (creates a save file on disk via the in-game Saves… dialog)

### Local

```sh
npm run tauri:build
```

### CI (GitHub Actions)

- [ ] Run the `itch-release` GitHub Actions workflow (or push a `v*` tag)
- [ ] Smoke test Windows installer (`windows`): install, launch, uninstall, upgrade from previous beta
- [ ] Smoke test macOS builds:
  - [ ] `osx-arm64` (Apple Silicon)
  - [ ] `osx-x64` (Intel)

## 6) itch.io upload

See: `scripts/itch/README.md`

- [ ] Configure GitHub Secrets (`BUTLER_API_KEY`, `ITCH_USERNAME`, `ITCH_GAME`) if using CI
- [ ] Upload builds either:
  - [ ] via GitHub Actions: run `itch-release` (manual) or push a `v*` tag, or
  - [ ] locally using `butler push` (or `scripts/itch/upload.ps1`)

## 7) Open source compliance

- [ ] Ensure third-party notices are up to date:

```sh
npm run licenses:check
npm run licenses:generate
```

- [ ] Ensure SBOM can be generated:

```sh
npm run sbom:generate
```

## 8) Release artifacts

- [ ] Record commit SHA used for builds
- [ ] Attach installers (NSIS/MSI) and/or other platform bundles
- [ ] Publish release notes (known issues, minimum OS requirements, upgrade notes)
