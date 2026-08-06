# Trakovo build packaging script
# Run AFTER: npm run build
#
# Produces two zip files:
#   trakovo-vX.X.X.zip      — full release for fresh deployments
#   next-bundle-vX.X.X.zip  — update bundle for admin Settings > Updates

$pkg = Get-Content package.json | ConvertFrom-Json
$version = $pkg.version
$label = if ($pkg.build_label) { $pkg.build_label } else { $version }
$releaseZip = "trakovo-v$label.zip"
$bundleZip = "next-bundle-v$label.zip"
$timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()

try {
    Add-Type -AssemblyName System.IO.Compression.ZipFile -ErrorAction Stop
} catch {
    Add-Type -AssemblyName System.IO.Compression.FileSystem
}

Write-Host "Packaging Trakovo v$label..."

# Sanity check
$nextDir = Join-Path (Get-Location) ".next"
$buildIdPath = Join-Path $nextDir "BUILD_ID"
if (-not (Test-Path -LiteralPath $buildIdPath)) {
    Write-Error ".next\BUILD_ID not found. Run 'npm run build' first."
    exit 1
}

$releaseFiles = @("src","public","prisma","app.js","next.config.js","package.json",
                  "package-lock.json",".env.example","DEPLOYMENT-CPANEL.md",
                  "BILLING-MVP.md","PENDING-DEPLOY.md","DOCUMENTATION-DEBT.md","README.md",
                  "RELEASE-NOTES-v$label.md",
                  ".cpanel.yml","tailwind.config.js","tsconfig.json","postcss.config.js")
$missingReleaseFiles = @($releaseFiles | Where-Object { -not (Test-Path -LiteralPath $_) })
if ($missingReleaseFiles.Count -gt 0) {
    Write-Error "Required release files are missing: $($missingReleaseFiles -join ', ')"
    exit 1
}

# --- Full release zip (via temp dir to exclude .next/cache) ---
Remove-Item $releaseZip -ErrorAction SilentlyContinue
$tmpRelease = ".\tmp-release-$timestamp"
New-Item -ItemType Directory -Path $tmpRelease | Out-Null

foreach ($f in $releaseFiles) {
    Copy-Item -LiteralPath $f -Destination $tmpRelease -Recurse
}
$releaseNextDir = Join-Path $tmpRelease ".next"
Copy-Item -LiteralPath $nextDir -Destination $releaseNextDir -Recurse
Remove-Item (Join-Path $releaseNextDir "cache") -Recurse -Force -ErrorAction SilentlyContinue

$releaseZipPath = Join-Path (Get-Location) $releaseZip
[System.IO.Compression.ZipFile]::CreateFromDirectory(
    (Resolve-Path -LiteralPath $tmpRelease).Path,
    $releaseZipPath,
    [System.IO.Compression.CompressionLevel]::Optimal,
    $false
)
Remove-Item $tmpRelease -Recurse -Force
Write-Host "  Created $releaseZip  ($([Math]::Round((Get-Item $releaseZip).Length / 1MB, 1)) MB)"

# --- Update bundle zip (.next excluding cache + package.json) ---
# package.json keeps on-disk version in sync after a bundle swap
Remove-Item $bundleZip -ErrorAction SilentlyContinue
$tmpBundle = ".\tmp-bundle-$timestamp"
New-Item -ItemType Directory -Path $tmpBundle | Out-Null
$bundleNextDir = Join-Path $tmpBundle ".next"
Copy-Item -LiteralPath $nextDir -Destination $bundleNextDir -Recurse
Remove-Item (Join-Path $bundleNextDir "cache") -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item -LiteralPath "package.json" -Destination (Join-Path $tmpBundle "package.json")
$bundleZipPath = Join-Path (Get-Location) $bundleZip
[System.IO.Compression.ZipFile]::CreateFromDirectory(
    (Resolve-Path -LiteralPath $tmpBundle).Path,
    $bundleZipPath,
    [System.IO.Compression.CompressionLevel]::Optimal,
    $false
)
Remove-Item $tmpBundle -Recurse -Force
Write-Host "  Created $bundleZip  ($([Math]::Round((Get-Item $bundleZip).Length / 1MB, 1)) MB)"

Write-Host ""
Write-Host ""
Write-Host "Done. To release:"
Write-Host "  git tag v$label && git push origin v$label"
Write-Host "  gh release create v$label $releaseZip $bundleZip --title 'Trakovo v$label' --notes-file 'RELEASE-NOTES-v$label.md'"
