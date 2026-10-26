# Reorganizacia repozitara sats-seo-gis (PowerShell verzia).
# Spusti z korena repozitara:
#   powershell -ExecutionPolicy Bypass -File .\restructure.ps1
# Pouziva git mv, takze historia suborov ostane zachovana. Nic nemaze natrvalo.

$ErrorActionPreference = 'Stop'

if (-not (Test-Path '.git')) {
    Write-Error 'Spusti skript z korena repozitara (kde je .git).'
}
if (git status --porcelain) {
    Write-Error 'Mas necommitnute zmeny. Najprv ich commitni alebo stashni.'
}

git checkout -b chore/restructure-repo
if ($LASTEXITCODE -ne 0) { Write-Error 'Vetvu chore/restructure-repo sa nepodarilo vytvorit (uz existuje?).' }

function Move-Safe($src, $dst) {
    if (-not (Test-Path -LiteralPath $src)) { return }
    if (Test-Path -LiteralPath $dst) {
        Write-Warning "PRESKOCENE (ciel existuje): $src -> $dst"
        return
    }
    $parent = Split-Path -Parent $dst
    if ($parent -and -not (Test-Path -LiteralPath $parent)) {
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }
    git mv -- $src $dst
    if ($LASTEXITCODE -eq 0) { Write-Host "OK: $src -> $dst" }
    else { Write-Warning "git mv zlyhal: $src -> $dst" }
}

# 1) Frontend (Vite) patri cely do app/
New-Item -ItemType Directory -Path 'app' -Force | Out-Null
foreach ($f in 'index.html','package.json','package-lock.json','lighthouserc.json',
               'playwright.config.js','vite.config.js','vite.config.ts') {
    Move-Safe $f "app/$f"
}
Move-Safe 'src'   'app/src'
Move-Safe 'tests' 'app/tests'

# 2) Zlucenie dvoch priecinkov public/ do app/public/
if (Test-Path 'public') {
    New-Item -ItemType Directory -Path 'app/public' -Force | Out-Null
    Get-ChildItem -LiteralPath 'public' -Force | ForEach-Object {
        Move-Safe ("public/" + $_.Name) ("app/public/" + $_.Name)
    }
    if (-not (Get-ChildItem -LiteralPath 'public' -Force)) {
        Remove-Item -LiteralPath 'public' -Force
    } else {
        Write-Warning 'public/ nie je prazdny - skontroluj konflikty rucne.'
    }
}

# 3) Planovanie a dokumentacia na jedno miesto
foreach ($d in 'docs/adr','docs/architecture','docs/minutes') {
    New-Item -ItemType Directory -Path $d -Force | Out-Null
}
Move-Safe 'planning' 'docs/planning'

# 4) Data: surove velke subory mimo gitu, skripty verzovane
foreach ($d in 'data/raw','data/processed','data/pipeline') {
    New-Item -ItemType Directory -Path $d -Force | Out-Null
}
New-Item -ItemType File -Path 'data/raw/.gitkeep' -Force | Out-Null
New-Item -ItemType File -Path 'data/processed/.gitkeep' -Force | Out-Null

# 5) CI workflow priecinok
New-Item -ItemType Directory -Path '.github/workflows' -Force | Out-Null

# 6) .gitignore doplnok (UTF-8 bez BOM)
$utf8 = New-Object System.Text.UTF8Encoding($false)
$ignore = @"

# --- doplnene restrukturalizaciou ---
node_modules/
app/dist/
data/raw/*
!data/raw/.gitkeep
data/processed/*
!data/processed/.gitkeep
*.pbf
*.pmtiles
.lighthouseci/
playwright-report/
test-results/
"@
[System.IO.File]::AppendAllText((Join-Path (Get-Location) '.gitignore'), $ignore, $utf8)

# 7) Korenovy package.json, ktory len deleguje prikazy do app/
if (-not (Test-Path 'package.json')) {
    $pkg = @"
{
  "name": "sats-seo-gis",
  "private": true,
  "scripts": {
    "install:app": "npm --prefix app install",
    "dev": "npm --prefix app run dev",
    "build": "npm --prefix app run build",
    "preview": "npm --prefix app run preview",
    "test:e2e": "npm --prefix app run test:e2e",
    "lhci": "npm --prefix app run lhci"
  }
}
"@
    [System.IO.File]::WriteAllText((Join-Path (Get-Location) 'package.json'), $pkg, $utf8)
}

# 8) Architektura (ak si ju skopiroval do korena)
if (Test-Path 'ARCHITECTURE.md') {
    if (git ls-files --error-unmatch ARCHITECTURE.md 2>$null) {
        git mv ARCHITECTURE.md docs/architecture/ARCHITECTURE.md
    } else {
        Move-Item ARCHITECTURE.md docs/architecture/ARCHITECTURE.md -Force
    }
}

git add -A
git commit -m "chore: reorganize repo into app/ data/ backend/ docs/ monorepo layout"

Write-Host ''
Write-Host 'Hotovo. Teraz rucne skontroluj (cesty sa po presune zmenili):'
Write-Host '  1. .github/workflows/*.yml   -> pridaj working-directory: app alebo uprav cesty'
Write-Host '  2. app/lighthouserc.json     -> staticDistDir / startServerCommand'
Write-Host '  3. app/playwright.config.js  -> webServer.command a testDir'
Write-Host '  4. README.md                 -> nova struktura a prikazy'
Write-Host '  5. Odkazy na planning/       -> docs/planning/'
Write-Host 'Potom: cd app; npm install; npm run build; npm run test:e2e'
Write-Host 'Ak je vsetko zelene: git push -u origin chore/restructure-repo a otvor Pull Request.'
