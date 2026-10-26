# Trakovo build packaging script
# Run AFTER: npm run build
#
# Produces two zip files:
#   trakovo-vX.X.X.zip      — full release for fresh deployments
#   next-bundle-vX.X.X.zip  — update bundle for admin Settings > Updates

$ErrorActionPreference = 'Stop'
$packageRoot = (Resolve-Path -LiteralPath '.').Path

$pkg = Get-Content package.json | ConvertFrom-Json
$version = $pkg.version
$label = if ($pkg.build_label) { $pkg.build_label } else { $version }
$releaseZip = "trakovo-v$label.zip"
$bundleZip = "next-bundle-v$label.zip"
$requiresFullInstall = $pkg.deployment.requires_full_install -eq $true
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

function Copy-CpanelBuild([string]$destination) {
    New-Item -ItemType Directory -Path $destination | Out-Null
    # Passenger uses the server's node_modules. The Docker-only standalone tree
    # is unnecessary here and can contain environment files copied by Next.js.
    Get-ChildItem -LiteralPath $nextDir -Force |
        Where-Object { $_.Name -notin @('cache', 'standalone', 'dev') } |
        ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $destination -Recurse }
}

function Assert-CpanelArchive([string]$archivePath) {
    $archive = [System.IO.Compression.ZipFile]::OpenRead($archivePath)
    try {
        $names = @($archive.Entries | ForEach-Object { $_.FullName.Replace('\', '/') })
        if ($names -notcontains '.next/BUILD_ID' -or $names -notcontains 'package.json') {
            throw 'cPanel archive is missing required build metadata.'
        }
        $forbidden = @($names | Where-Object {
            ($_ -match '(^|/)\.env($|\.)' -and $_ -notmatch '(^|/)\.env\.example$') -or
            $_ -match '^\.next/(standalone|cache|dev)/'
        })
        if ($forbidden.Count -gt 0) {
            throw "Unsafe cPanel archive entries: $($forbidden -join ', ')"
        }
    } finally { $archive.Dispose() }
}

function Remove-PackagingPath([string]$targetPath) {
    $candidate = if ([System.IO.Path]::IsPathRooted($targetPath)) { $targetPath } else { Join-Path $packageRoot $targetPath }
    $absolutePath = [System.IO.Path]::GetFullPath($candidate)
    $leaf = [System.IO.Path]::GetFileName($absolutePath)
    if (-not $absolutePath.StartsWith("$packageRoot$([System.IO.Path]::DirectorySeparatorChar)") -or
        $leaf -notmatch '^(tmp-(release|bundle)-[0-9]+|(trakovo|next-bundle)-v[0-9A-Za-z.-]+\.zip)$') {
        throw 'Refusing to remove an unexpected packaging path.'
    }
    if (Test-Path -LiteralPath $absolutePath) { Remove-Item -LiteralPath $absolutePath -Recurse -Force }
}

$releaseFiles = @("src","public","prisma","database","app.js","next.config.js","package.json",
                  "package-lock.json",".env.example","DEPLOYMENT-CPANEL.md",
                  "BILLING-MVP.md","PENDING-DEPLOY.md","DOCUMENTATION-DEBT.md","README.md",
                  "RELEASE-NOTES-v$label.md",
                  "SECURITY-REVIEW-2026-10-26.md",
                  ".cpanel.yml","eslint.config.mjs","tailwind.config.js","tsconfig.json","postcss.config.js")
$missingReleaseFiles = @($releaseFiles | Where-Object { -not (Test-Path -LiteralPath $_) })
if ($missingReleaseFiles.Count -gt 0) {
    Write-Error "Required release files are missing: $($missingReleaseFiles -join ', ')"
    exit 1
}

# --- Full cPanel release zip ---
Remove-PackagingPath $releaseZip
$tmpRelease = ".\tmp-release-$timestamp"
New-Item -ItemType Directory -Path $tmpRelease | Out-Null

foreach ($f in $releaseFiles) {
    Copy-Item -LiteralPath $f -Destination $tmpRelease -Recurse
}
$releaseNextDir = Join-Path $tmpRelease ".next"
Copy-CpanelBuild $releaseNextDir

$releaseZipPath = Join-Path (Get-Location) $releaseZip
[System.IO.Compression.ZipFile]::CreateFromDirectory(
    (Resolve-Path -LiteralPath $tmpRelease).Path,
    $releaseZipPath,
    [System.IO.Compression.CompressionLevel]::Optimal,
    $false
)
Assert-CpanelArchive $releaseZipPath
Remove-PackagingPath $tmpRelease
Write-Host "  Created $releaseZip  ($([Math]::Round((Get-Item $releaseZip).Length / 1MB, 1)) MB)"

if ($requiresFullInstall) {
    Remove-PackagingPath $bundleZip
    Write-Host 'Full installation required: no OTA bundle will be produced. Follow PENDING-DEPLOY.md.'
    exit 0
}

# --- Update bundle zip (cPanel build + package.json) ---
# package.json keeps on-disk version in sync after a bundle swap
Remove-PackagingPath $bundleZip
$tmpBundle = ".\tmp-bundle-$timestamp"
New-Item -ItemType Directory -Path $tmpBundle | Out-Null
$bundleNextDir = Join-Path $tmpBundle ".next"
Copy-CpanelBuild $bundleNextDir
Copy-Item -LiteralPath "package.json" -Destination (Join-Path $tmpBundle "package.json")
$bundleZipPath = Join-Path (Get-Location) $bundleZip
[System.IO.Compression.ZipFile]::CreateFromDirectory(
    (Resolve-Path -LiteralPath $tmpBundle).Path,
    $bundleZipPath,
    [System.IO.Compression.CompressionLevel]::Optimal,
    $false
)
Assert-CpanelArchive $bundleZipPath
Remove-PackagingPath $tmpBundle
Write-Host "  Created $bundleZip  ($([Math]::Round((Get-Item $bundleZip).Length / 1MB, 1)) MB)"

Write-Host ""
Write-Host ""
Write-Host "Done. To release:"
Write-Host "  git tag v$label && git push origin v$label"
Write-Host "  The tag triggers GitHub Actions to rebuild, validate and publish the release assets."
