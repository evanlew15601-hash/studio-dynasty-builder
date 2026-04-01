# itch.io builds (manual upload)

This repo supports generating itch.io-ready builds either:

- **Via GitHub Actions** (recommended for reproducibility): `.github/workflows/itch-release.yml` ("itch-build"), or
- **Locally** (build and package on your machine)

## GitHub Actions (recommended)

1) Trigger the workflow:

- Push a tag like `v0.1.0-beta.2` (the workflow triggers on tags matching `v*`), or
- Run it manually via **Actions → itch-build → Run workflow**
  - optional: provide a `version` input (used for artifact naming)

2) Download artifacts from the workflow run:

- `studio-magnate-windows-<version>`
- `studio-magnate-linux-<version>`
- `studio-magnate-mac-<version>`

Upload the downloaded zip(s) to itch.io via the web UI.

## Local builds (manual upload)

```sh
npm ci
npm run tauri:build
npm run artifacts:package
```

This produces versioned files under `release-artifacts/` which you can upload to itch.io.

## Optional: Butler

If you prefer Butler, see `scripts/itch/upload.ps1`.
