[CmdletBinding()]
param(
    [ValidateSet('All', 'Check', 'GitHub', 'Prod', 'Rollback')]
    [string]$Target = 'All',
    [string]$CommitMessage = 'Deploy PizzaManager demo',
    [string]$SSHHost = 'root@vee-app.co.il'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$Origin = 'https://github.com/lironatar1994-coder/PizzaManager.git'
$SiteUrl = 'https://lawebs.co.il/PizzaManager/'

function Run([string]$Command, [string[]]$Arguments) {
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Command failed with exit code $LASTEXITCODE" }
}

function ReadNative([string]$Command, [string[]]$Arguments) {
    $output = & $Command @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Command failed with exit code $LASTEXITCODE" }
    return ($output | Out-String).Trim()
}

function VerifyLive([string]$ExpectedRevision) {
    $version = (Invoke-WebRequest -Uri "${SiteUrl}version.txt" -UseBasicParsing -TimeoutSec 20).Content.Trim()
    $page = Invoke-WebRequest -Uri $SiteUrl -UseBasicParsing -TimeoutSec 20
    if ($page.StatusCode -ne 200 -or $page.Content -notmatch '<html lang="he" dir="rtl">' -or $page.Content -notmatch 'noindex,nofollow') {
        throw 'Public demo page verification failed'
    }
    $sourcePrefix = 'src/'
    $revision = $version
    if ($page.Content -match '/storefront/src/app.js') {
        $sourcePrefix = 'storefront/src/'
        try {
            $manifest = (Invoke-WebRequest -Uri "${SiteUrl}assets/menu-ui-version.json" -UseBasicParsing -TimeoutSec 20).Content | ConvertFrom-Json
            $revision = $manifest.revision
        } catch {
            if ($ExpectedRevision) { throw 'Platform frontend revision could not be verified' }
        }
        $health = (Invoke-WebRequest -Uri "${SiteUrl}api/health" -UseBasicParsing -TimeoutSec 20).Content | ConvertFrom-Json
        if (-not $health.ok) { throw 'Platform is unavailable' }
    }
    if ($ExpectedRevision -and $revision -ne $ExpectedRevision) { throw "Live frontend revision mismatch: $revision" }
    $assets = @('app.js', 'styles.css', 'order.js', 'store.js', 'address.js', 'config-links.js') | ForEach-Object { $sourcePrefix + $_ }
    if ($sourcePrefix -eq 'src/') { $assets += 'src/schedule.js' }
    $assets += @('assets/brand/oven-mark.svg', 'assets/brand/favicon.svg', 'assets/pizza-hero-mobile.jpg', 'assets/pizza-base-v2.webp', 'assets/pizza-base-thin-v2.webp', 'assets/garlic-bread-demo.webp', 'assets/toppings/olive.webp', 'assets/toppings/mushroom.webp', 'assets/toppings/corn.webp', 'assets/toppings/onion.webp', 'assets/toppings/jalapeno.webp', 'assets/toppings/feta.webp')
    foreach ($asset in $assets) {
        $response = Invoke-WebRequest -Uri "${SiteUrl}${asset}" -Method Head -UseBasicParsing -TimeoutSec 20
        if ($response.StatusCode -ne 200) { throw "Missing live asset: $asset" }
    }
    foreach ($menuPhoto in $(if ($ExpectedRevision) { @('pizza', 'garlic', 'family', 'combo') } else { @() })) {
        $response = Invoke-WebRequest -Uri "${SiteUrl}assets/menu-${menuPhoto}-v1.webp" -Method Head -UseBasicParsing -TimeoutSec 20
        if ($response.StatusCode -ne 200) { throw "Missing live menu photo: $menuPhoto" }
    }
    Write-Host "Live site: $SiteUrl (frontend $revision; runtime $version)" -ForegroundColor Green
}

if ($SSHHost -notmatch '^[A-Za-z0-9._-]+@[A-Za-z0-9.-]+$') { throw 'Invalid SSH host' }
Push-Location $PSScriptRoot
try {
    if ($Target -eq 'Rollback') {
        Run 'ssh' @('-o', 'BatchMode=yes', '-o', 'ConnectTimeout=15', $SSHHost, 'bash /opt/pizza-manager/incoming/deploy_linux.sh rollback')
        VerifyLive ''
        return
    }

    Run 'node' @('scripts/check.mjs')
    if ($Target -eq 'Check') { return }
    if (-not (Test-Path -LiteralPath '.git')) { throw 'This directory must be initialized as the PizzaManager Git repository first' }
    Run 'git' @('diff', '--check')
    $currentOrigin = ReadNative 'git' @('remote', 'get-url', 'origin')
    if ($currentOrigin.ToLowerInvariant() -ne $Origin.ToLowerInvariant()) { throw "Unexpected Git origin: $currentOrigin" }
    $branch = ReadNative 'git' @('branch', '--show-current')
    if ($branch -ne 'main') { throw "Deploy from main, not $branch" }

    if ($Target -eq 'All' -or $Target -eq 'GitHub') {
        $paths = @('.gitignore', '.gitattributes', 'DEPLOY.PS1', 'deploy_linux.sh', 'deploy', 'scripts', 'index.html', 'src', 'assets', 'README.md', 'PRODUCT.md', 'DESIGN.md')
        Run 'git' (@('add', '--') + $paths)
        & git diff --cached --quiet
        if ($LASTEXITCODE -eq 1) { Run 'git' @('commit', '-m', $CommitMessage) }
        elseif ($LASTEXITCODE -ne 0) { throw 'Could not inspect staged changes' }
        Run 'git' @('push', '-u', 'origin', 'HEAD:main')
    }

    $remaining = ReadNative 'git' @('status', '--porcelain', '--untracked-files=all')
    if ($remaining) { throw "Uncommitted files remain:`n$remaining" }
    $revision = ReadNative 'git' @('rev-parse', 'HEAD')
    $remoteLine = ReadNative 'git' @('ls-remote', 'origin', 'refs/heads/main')
    $remoteRevision = ($remoteLine -split '\s+')[0]
    if ($remoteRevision -ne $revision) { throw 'GitHub main does not match the local revision' }
    if ($Target -eq 'GitHub') { Write-Host "Pushed $revision to GitHub"; return }

    New-Item -ItemType Directory -Path '.deploy' -Force | Out-Null
    $archive = Join-Path $PSScriptRoot ".deploy/$revision.tar.gz"
    Run 'git' @('archive', '--format=tar.gz', "--output=$archive", $revision)
    $digest = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant()
    Run 'ssh' @('-o', 'BatchMode=yes', '-o', 'ConnectTimeout=15', $SSHHost, 'install -d -m 755 /opt/pizza-manager/incoming')
    Run 'scp' @('-o', 'BatchMode=yes', '-o', 'ConnectTimeout=15', ".deploy/$revision.tar.gz", "${SSHHost}:/opt/pizza-manager/incoming/$revision.tar.gz")
    Run 'scp' @('-o', 'BatchMode=yes', '-o', 'ConnectTimeout=15', 'deploy_linux.sh', "${SSHHost}:/opt/pizza-manager/incoming/deploy_linux.sh")
    Run 'ssh' @('-o', 'BatchMode=yes', '-o', 'ConnectTimeout=15', $SSHHost, "bash /opt/pizza-manager/incoming/deploy_linux.sh deploy $revision $digest")
    VerifyLive $revision
} finally {
    Pop-Location
}
