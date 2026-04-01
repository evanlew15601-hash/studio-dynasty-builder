param(
  [string]$ButlerPath = "butler",
  [string]$BuildInput = "itch_build_input"
)

$target = $env:ITCH_TARGET
if (-not $target) {
  throw "ITCH_TARGET env var must be set (format: user/game:channel, e.g. myname/studio-magnate:windows)"
}

$version = $env:ITCH_VERSION

Write-Host "Using butler: $ButlerPath"
Write-Host "Input: $BuildInput"
Write-Host "Target: $target"

$cmd = @("push", $BuildInput, $target)

if ($version) {
  $cmd += @("--userversion", $version)
}

& $ButlerPath @cmd
