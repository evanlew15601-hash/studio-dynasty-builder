# itch.io upload (Butler)

This repo produces a portable build artifact (zip) via the `windows-tauri-build` GitHub Action.

To upload that artifact to itch.io, use [Butler](https://itch.io/docs/butler/).

## 1) Install Butler

Download Butler and ensure `butler` is on your PATH:

- https://itch.io/docs/butler/installing.html

## 2) Authenticate

```sh
butler login
```

## 3) Upload

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
