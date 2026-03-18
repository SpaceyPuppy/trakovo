# Trakovo build packaging script
# Run AFTER: npm run build
#
# Produces two zip files:
#   trakovo-vX.X.X.zip      — full release for fresh deployments
#   next-bundle-vX.X.X.zip  — update bundle for admin Settings > Updates

$version = (Get-Content package.json | ConvertFrom-Json).version
$releaseZip = "trakovo-v$version.zip"
$bundleZip = "next-bundle-v$version.zip"
$timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()

Write-Host "Packaging Trakovo v$version..."

# Sanity check
if (-not (Test-Path ".next\BUILD_ID")) {
    Write-Error ".next\BUILD_ID not found. Run 'npm run build' first."
    exit 1
}

# --- Full release zip (via temp dir to exclude .next/cache) ---
Remove-Item $releaseZip -ErrorAction SilentlyContinue
$tmpRelease = ".\tmp-release-$timestamp"
New-Item -ItemType Directory -Path $tmpRelease | Out-Null

$releaseFiles = @("src","public","prisma","app.js","next.config.js","package.json",
                  "package-lock.json",".env.example","DEPLOYMENT-CPANEL.md",
                  ".cpanel.yml","tailwind.config.ts","tsconfig.json","postcss.config.js")
foreach ($f in $releaseFiles) {
    if (Test-Path $f) { Copy-Item $f "$tmpRelease\" -Recurse }
}
Copy-Item ".next" "$tmpRelease\.next" -Recurse
Remove-Item "$tmpRelease\.next\cache" -Recurse -Force -ErrorAction SilentlyContinue

Compress-Archive -Path "$tmpRelease\*" -DestinationPath $releaseZip
Remove-Item $tmpRelease -Recurse -Force
Write-Host "  Created $releaseZip  ($([Math]::Round((Get-Item $releaseZip).Length / 1MB, 1)) MB)"

# --- Update bundle zip (.next excluding cache + package.json) ---
# package.json keeps on-disk version in sync after a bundle swap
Remove-Item $bundleZip -ErrorAction SilentlyContinue
$tmpBundle = ".\tmp-bundle-$timestamp"
New-Item -ItemType Directory -Path $tmpBundle | Out-Null
Copy-Item ".next" "$tmpBundle\.next" -Recurse
Remove-Item "$tmpBundle\.next\cache" -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item "package.json" "$tmpBundle\package.json"
Compress-Archive -Path "$tmpBundle\.next", "$tmpBundle\package.json" -DestinationPath $bundleZip
Remove-Item $tmpBundle -Recurse -Force
Write-Host "  Created $bundleZip  ($([Math]::Round((Get-Item $bundleZip).Length / 1MB, 1)) MB)"

Write-Host ""
Write-Host "Done. To release:"
Write-Host "  git tag v$version && git push origin v$version"
Write-Host "  gh release create v$version $releaseZip $bundleZip --notes 'Release v$version'"
