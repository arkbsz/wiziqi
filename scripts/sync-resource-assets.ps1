$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$resourceDir = Join-Path $root "resource"
$webDir = Join-Path $root "public"
$androidDir = Join-Path $root "android\app\src\main\assets\public"

$assets = @(
  "cover.png",
  "cover_anim.gif",
  "board_top.jpeg",
  "board_bottom.jpeg",
  "board_left.jpeg",
  "board_right.jpeg",
  "startup.png",
  "win.png"
)

foreach ($dir in @($resourceDir, $webDir, $androidDir)) {
  if (-not (Test-Path $dir)) {
    New-Item -ItemType Directory -Path $dir | Out-Null
  }
}

foreach ($asset in $assets) {
  $source = Join-Path $resourceDir $asset
  if (-not (Test-Path $source)) {
    Write-Warning "Missing source asset: $asset"
    continue
  }

  Copy-Item -LiteralPath $source -Destination (Join-Path $webDir $asset) -Force
  Copy-Item -LiteralPath $source -Destination (Join-Path $androidDir $asset) -Force
  Write-Output "Synced $asset"
}

Write-Output "Asset sync completed."
