# Trakovo build packaging script
# Run AFTER: npm run build
#
# Produces two zip files:
#   trakovo-vX.X.X.zip      — full release for fresh deployments
#   next-bundle-vX.X.X.zip  — update bundle for admin Settings > Updates

$version = (Get-Content package.json | ConvertFrom-Json).version
$releaseZip = "trakovo-v$version.zip"
$bundleZip = "next-bundle-v$version.zip"

Write-Host "Packaging Trakovo v$version..."

# Sanity check
if (-not (Test-Path ".next\BUILD_ID")) {
    Write-Error ".next\BUILD_ID not found. Run 'npm run build' first."
    exit 1
}

# --- Full release zip ---
Remove-Item $releaseZip -ErrorAction SilentlyContinue

$releaseFiles = @(
    "src",
    "public",
    "prisma",
    ".next",
    "app.js",
    "next.config.js",
    "package.json",
    "package-lock.json",
    ".env.example",
    "DEPLOYMENT-CPANEL.md",
    ".cpanel.yml",
    "tailwind.config.ts",
    "tsconfig.json",
    "postcss.config.js"
)

# Filter to only files/folders that exist
$existing = $releaseFiles | Where-Object { Test-Path $_ }
Compress-Archive -Path $existing -DestinationPath $releaseZip
Write-Host "  Created $releaseZip  ($([Math]::Round((Get-Item $releaseZip).Length / 1MB, 1)) MB)"

# --- Update bundle zip (just .next) ---
Remove-Item $bundleZip -ErrorAction SilentlyContinue
Compress-Archive -Path ".next" -DestinationPath $bundleZip
Write-Host "  Created $bundleZip  ($([Math]::Round((Get-Item $bundleZip).Length / 1MB, 1)) MB)"

Write-Host ""
Write-Host "Done. To release:"
Write-Host "  git tag v$version && git push origin v$version"
Write-Host "  gh release create v$version $releaseZip $bundleZip --notes 'Release v$version'"
