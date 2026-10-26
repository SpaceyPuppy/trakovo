$ErrorActionPreference = 'Stop'
$packageRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$scriptPath = Join-Path $packageRoot 'make-zip.ps1'
$parseErrors = $null
$tokens = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile($scriptPath, [ref]$tokens, [ref]$parseErrors)
if ($parseErrors.Count) { throw 'Packaging script has syntax errors.' }

# Load the actual helpers, without invoking the full repository packaging process.
$ast.FindAll({ param($node) $node -is [System.Management.Automation.Language.FunctionDefinitionAst] }, $false) |
    ForEach-Object { . ([ScriptBlock]::Create($_.Extent.Text)) }

$testRoot = Join-Path $packageRoot "tmp-release-$([DateTime]::UtcNow.Ticks)"
$nextDir = Join-Path $testRoot 'build'
try {
    foreach ($folder in @('server', 'static', 'standalone', 'cache', 'dev')) {
        New-Item -ItemType Directory -Path (Join-Path $nextDir $folder) -Force | Out-Null
    }
    foreach ($relative in @('BUILD_ID', 'server/app.js', 'static/app.js', 'standalone/.env', 'cache/data', 'dev/server.js')) {
        [IO.File]::WriteAllText((Join-Path $nextDir $relative), 'test fixture')
    }
    $output = Join-Path $testRoot 'output'
    New-Item -ItemType Directory -Path $output | Out-Null
    Copy-CpanelBuild (Join-Path $output '.next')
    [IO.File]::WriteAllText((Join-Path $output 'package.json'), '{}')
    $archivePath = Join-Path $testRoot 'valid.zip'
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [IO.Compression.ZipFile]::CreateFromDirectory($output, $archivePath)
    Assert-CpanelArchive $archivePath
    if (Test-Path -LiteralPath (Join-Path $output '.next/standalone')) { throw 'Standalone tree was copied.' }
    if (Test-Path -LiteralPath (Join-Path $output '.next/cache')) { throw 'Cache was copied.' }
    if (Test-Path -LiteralPath (Join-Path $output '.next/dev')) { throw 'Development build was copied.' }
    if (-not (Test-Path -LiteralPath (Join-Path $output '.next/server/app.js'))) { throw 'Server build was omitted.' }
    Write-Host 'PASS: cPanel build retains server/static output and excludes standalone/cache.'

    [IO.File]::WriteAllText((Join-Path $output '.next/server/.env'), 'test fixture')
    $unsafeArchive = Join-Path $testRoot 'unsafe.zip'
    [IO.Compression.ZipFile]::CreateFromDirectory($output, $unsafeArchive)
    $rejected = $false
    try { Assert-CpanelArchive $unsafeArchive } catch { $rejected = $true }
    if (-not $rejected) { throw 'Archive containing an environment file was not rejected.' }
    Write-Host 'PASS: archive validation rejects environment files outside the standalone tree too.'

    # Exercise the real full-install branch, including its actual required-file list.
    $fullFixture = Join-Path $testRoot 'full-install'
    New-Item -ItemType Directory -Path $fullFixture | Out-Null
    $label = '0.0.0'
    $filesAssignment = $ast.Find({ param($node)
        $node -is [System.Management.Automation.Language.AssignmentStatementAst] -and
        $node.Left.Extent.Text -eq '$releaseFiles'
    }, $false)
    . ([ScriptBlock]::Create($filesAssignment.Extent.Text))
    foreach ($item in $releaseFiles) {
        $fixtureItem = Join-Path $fullFixture $item
        if ($item -in @('src', 'public', 'prisma', 'database')) {
            New-Item -ItemType Directory -Path $fixtureItem | Out-Null
        } else { [IO.File]::WriteAllText($fixtureItem, 'fixture') }
    }
    [IO.File]::WriteAllText((Join-Path $fullFixture 'package.json'), '{"version":"0.0.0","deployment":{"requires_full_install":true}}')
    New-Item -ItemType Directory -Path (Join-Path $fullFixture '.next/server') -Force | Out-Null
    [IO.File]::WriteAllText((Join-Path $fullFixture '.next/BUILD_ID'), 'fixture-build')
    [IO.File]::WriteAllText((Join-Path $fullFixture '.next/server/app.js'), 'fixture')
    Push-Location $fullFixture
    try { & $scriptPath } finally { Pop-Location }
    if (-not (Test-Path -LiteralPath (Join-Path $fullFixture 'trakovo-v0.0.0.zip'))) { throw 'Full release was not created.' }
    if (Test-Path -LiteralPath (Join-Path $fullFixture 'next-bundle-v0.0.0.zip')) { throw 'Full-install release produced an unsafe OTA asset.' }
    Write-Host 'PASS: full-install releases produce the full cPanel package and omit the OTA bundle.'
} finally {
    Remove-PackagingPath $testRoot
}
