# Release checklist (beta)

This is a lightweight checklist to help ensure builds are reproducible and artifacts are shippable.

## 1) Versioning

- [ ] Bump version in `package.json` (used by Tauri config via `src-tauri/tauri.conf.json`)
- [ ] Bump version in `src-tauri/Cargo.toml` (crate/app metadata)
- [ ] Ensure `src-tauri/tauri.conf.json` identifier, product name, and bundle settings are correct

## 2) Environment / Supabase

- [ ] Create `.env` from `.env.example`
- [ ] Confirm only the **anon/publishable** Supabase key is used in the frontend
- [ ] Confirm the app starts with missing env vars (it should fail fast with a clear error)

## 3) Security

- [ ] Review `src-tauri/tauri.conf.json` CSP (keep it as strict as possible)
- [ ] Confirm the CSP allows required network access (e.g. `https://*.supabase.co`, `wss://*.supabase.co`)

## 4) Preflight

```sh
npm ci
npm run check
```

## 5) Desktop builds (Tauri)

### Local

```sh
npm run tauri:build
```

### CI (Windows)

- [ ] Run the `windows-tauri-build` GitHub Actions workflow and download artifacts
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
