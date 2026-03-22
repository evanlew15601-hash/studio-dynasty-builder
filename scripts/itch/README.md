# itch.io upload (Butler)

This repo supports itch.io uploads either:

- **Locally** (run `butler push` yourself), or
- **Via GitHub Actions** (recommended): `.github/workflows/itch-release.yml`

## GitHub Actions (recommended)

### 1) Configure repo secrets

Add the following GitHub Secrets (or Variables where noted):

- `BUTLER_API_KEY` (**Secret**; itch.io API key)
- `ITCH_USERNAME` (Secret or Variable; your itch.io username)
- `ITCH_GAME` (Secret or Variable; your itch.io project slug, e.g. `studio-magnate`)

### 2) Trigger the workflow

You can either:

- Push a tag like `v0.1.0-beta.1` (the workflow triggers on tags matching `v*`), or
- Run the workflow manually via **Actions → itch-release → Run workflow**
  - optional: provide a `version` input for Butler `--userversion`

The workflow builds platform bundles and uploads to:

- `ITCH_USERNAME/ITCH_GAME:windows`
- `ITCH_USERNAME/ITCH_GAME:linux`
- `ITCH_USERNAME/ITCH_GAME:mac`

## Local upload

To upload locally, use [Butler](https://itch.io/docs/butler/).

### 1) Install Butler

Download Butler and ensure `butler` is on your PATH:

- https://itch.io/docs/butler/installing.html

### 2) Authenticate

```sh
butler login
```

### 3) Upload

You can push either a directory or a zip.

PowerShell helper:

```pwsh
$env:ITCH_TARGET = "youritchusername/studio-magnate:windows"

# optional
$env:ITCH_VERSION = "0.3.0"

pwsh ./scripts/itch/upload.ps1 -BuildInput "path/to/studio-magnate-windows.zip"
```

Notes:
- `ITCH_TARGET` is `user/game:channel` (e.g. `myname/studio-magnate:windows`).
- If `ITCH_VERSION` is set, the script passes `--userversion` to Butler.
