param(
  [Parameter(Mandatory = $true)]
  [string]$InputPng,

  [Parameter(Mandatory = $true)]
  [string]$OutIco
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

if (-not (Test-Path -Path $InputPng -PathType Leaf)) {
  throw "Input PNG not found: $InputPng"
}

$outDir = Split-Path -Parent $OutIco
if ($outDir -and -not (Test-Path -Path $outDir)) {
  New-Item -ItemType Directory -Path $outDir | Out-Null
}

$img = [System.Drawing.Image]::FromFile($InputPng)

try {
  $size = 256
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $gfx = [System.Drawing.Graphics]::FromImage($bmp)

  try {
    $gfx.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $gfx.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $gfx.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $gfx.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $gfx.DrawImage($img, 0, 0, $size, $size)
  }
  finally {
    $gfx.Dispose()
  }

  $hIcon = $bmp.GetHicon()

  Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class Win32 {
  [DllImport("user32.dll", SetLastError=true)]
  public static extern bool DestroyIcon(IntPtr hIcon);
}
"@

  try {
    $icon = [System.Drawing.Icon]::FromHandle($hIcon)
    try {
      $fs = New-Object System.IO.FileStream($OutIco, [System.IO.FileMode]::Create)
      try {
        $icon.Save($fs)
      }
      finally {
        $fs.Dispose()
      }
    }
    finally {
      $icon.Dispose()
    }
  }
  finally {
    [Win32]::DestroyIcon($hIcon) | Out-Null
    $bmp.Dispose()
  }
}
finally {
  $img.Dispose()
}

Write-Host "Wrote RC-compatible ICO: $OutIco"
