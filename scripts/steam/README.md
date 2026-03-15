# Steam depot upload (SteamPipe / steamcmd)

This repo can produce a Steam-friendly portable build artifact (zip) via the `windows-tauri-build` GitHub Action.

This folder contains a helper script to upload that build to Steam using `steamcmd`.

## Prereqs

- Install the Steamworks SDK tools and locate `steamcmd.exe`.
- Ensure you have a Steamworks account with permissions to upload builds.

## Usage (PowerShell)

```powershell
$env:STEAM_USERNAME = "your_steamworks_username"

# Example:
# -AppId 1234560 -DepotId 1234561
# -ContentRoot is the extracted portable zip folder
pwsh ./scripts/steam/upload.ps1 \
  -AppId <APP_ID> \
  -DepotId <DEPOT_ID> \
  -ContentRoot "C:\path\to\studio-magnate-windows-portable" \
  -BuildDescription "beta-0.1.0" \
  -Branch "beta"
```

Notes:
- The script uses `steamcmd +login <username>` without a password, so Steam will prompt interactively and handle Steam Guard.
- Do **not** ship `steam_appid.txt` in the Steam depot. That file is only for local testing when not launched from Steam.
- Ensure `steam_api64.dll` is present next to the game executable in the depot for Steamworks features (achievements + overlay).
