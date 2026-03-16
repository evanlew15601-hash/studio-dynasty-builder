param(
  [Parameter(Mandatory = $true)]
  [int]$AppId,

  [Parameter(Mandatory = $true)]
  [int]$DepotId,

  [Parameter(Mandatory = $true)]
  [string]$ContentRoot,

  [string]$BuildDescription = "local",
  [string]$Branch = "",
  [string]$SteamCmdPath = "steamcmd",
  [string]$BuildOutput = "steam_build_output"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $ContentRoot)) {
  throw "ContentRoot does not exist: $ContentRoot"
}

if (-not $env:STEAM_USERNAME) {
  throw "STEAM_USERNAME env var must be set (Steamworks account username)"
}

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$OutDir = Join-Path $Root "out"
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$DepotVdfPath = Join-Path $OutDir "depot_build_$DepotId.vdf"
$AppVdfPath = Join-Path $OutDir "app_build_$AppId.vdf"

@"
"DepotBuildConfig"
{
  "DepotID" "$DepotId"
  "ContentRoot" "$ContentRoot"
  "FileMapping"
  {
    "LocalPath" "*"
    "DepotPath" "."
    "recursive" "1"
  }
}
"@ | Set-Content -Encoding ASCII -Path $DepotVdfPath

$BranchLine = ""
if ($Branch -ne "") {
  $BranchLine = "  \"setlive\" \"$Branch\"`n"
}

@"
"AppBuild"
{
  "AppID" "$AppId"
  "Desc" "$BuildDescription"
  "ContentRoot" "$ContentRoot"
  "BuildOutput" "$BuildOutput"
$BranchLine  "Depots"
  {
    "$DepotId" "$DepotVdfPath"
  }
}
"@ | Set-Content -Encoding ASCII -Path $AppVdfPath

Write-Host "App build VDF: $AppVdfPath"
Write-Host "Depot build VDF: $DepotVdfPath"
Write-Host "Using steamcmd: $SteamCmdPath"

& $SteamCmdPath "+login" $env:STEAM_USERNAME "+run_app_build" $AppVdfPath "+quit"
