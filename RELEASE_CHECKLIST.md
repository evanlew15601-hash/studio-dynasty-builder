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
- [ ] If shipping on Steam with Steam Cloud, confirm Steam Auto Cloud is configured to sync the save folder shown in the in-game Saves… dialog
- [ ] If shipping on Steam with Achievements/Overlay integration (once you have a Steam App ID), confirm Steamworks is enabled for the build (Cargo feature `steam`) and the correct Steam App ID + `steam_api64.dll` are present in the final depot

### Local

```sh
npm run tauri:build
```

### CI (Windows)

- [ ] Run the `windows-tauri-build` GitHub Actions workflow and download artifacts
- [ ] Smoke test portable build (Steam-style): launch `studio-magnate.exe` from the extracted zip
- [ ] Upload to Steam (SteamPipe, once you have a Steam App ID): see `scripts/steam/README.md`
- [ ] Smoke test installer(s): install, launch, uninstall, upgrade from previous beta

## 6) Open source compliance

- [ ] Ensure third-party notices are up to date:

```sh
npm run licenses:check
npm run licenses:generate
```

- [ ] Ensure SBOM can be generated:

```sh
npm run sbom:generate
```

## 7) Release artifacts

- [ ] Record commit SHA used for builds
- [ ] Attach installers (NSIS/MSI) and/or other platform bundles
- [ ] Publish release notes (known issues, minimum OS requirements, upgrade notes)
