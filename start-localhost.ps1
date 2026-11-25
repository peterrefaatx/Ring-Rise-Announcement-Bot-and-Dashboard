param(
  [switch]$Dev,
  [switch]$Rebuild
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Localhost Launcher - Cold Calling Platform" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# 1. Locate PostgreSQL bin directory (18, 17, 16, etc.)
$pgBin = $null
$pgCandidates = Get-ChildItem "C:\Program Files\PostgreSQL\*\bin\pg_ctl.exe" -ErrorAction SilentlyContinue | Sort-Object FullName -Descending
if ($pgCandidates) {
  $pgBin = Split-Path $pgCandidates[0].FullName -Parent
} else {
  $cmdPg = Get-Command pg_ctl -ErrorAction SilentlyContinue
  if ($cmdPg) {
    $pgBin = Split-Path $cmdPg.Source -Parent
  }
}

if (-not $pgBin) {
  Write-Error "PostgreSQL binaries (pg_ctl.exe) not found. Please install PostgreSQL 16+ or add its bin folder to PATH."
  exit 1
}
Write-Host "[OK] Using PostgreSQL binaries at: $pgBin"

# 2. Ensure .env exists
if (-not (Test-Path ".env")) {
  Write-Host "[INFO] Creating local .env configuration..."
  $envContent = @"
DATABASE_URL="postgresql://postgres:LocalDevPg2026!@localhost:5433/cold_calling_platform?schema=public"
AUTH_SECRET="local-dev-auth-secret-9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b"
FORCE_SECURE_COOKIES="false"
INITIAL_ADMIN_NAME="System Administrator"
INITIAL_ADMIN_USERNAME="admin"
INITIAL_ADMIN_PASSWORD="AdminPassword123!"
SEED_SAMPLE_TEAM="true"
TELEGRAM_BOT_TOKEN=""
TELEGRAM_CHAT_ID=""
BRAND_NAME="Daily Dashboard"
BRAND_TAGLINE="Real-Time Lead & Campaign Tracker"
BRAND_PRIMARY_COLOR="#1D4ED8"
PORT="3000"
"@
  [System.IO.File]::WriteAllText((Join-Path $PSScriptRoot ".env"), $envContent)
}

# Load .env into current process
Get-Content ".env" | ForEach-Object {
  if ($_ -match '^([^#=]+)="?(.*?)"?$') {
    [Environment]::SetEnvironmentVariable($matches[1].Trim(), $matches[2], "Process")
  }
}

# 3. Ensure local PostgreSQL cluster (.pgdata) is initialized and running on port 5433
$pgPort = 5433
$pgStartedByScript = $false
$pgListening = Get-NetTCPConnection -LocalPort $pgPort -State Listen -ErrorAction SilentlyContinue

if (-not $pgListening) {
  if (-not (Test-Path ".pgdata\PG_VERSION")) {
    Write-Host "[INFO] Initializing local PostgreSQL cluster in .pgdata..."
    $pwFile = Join-Path $PSScriptRoot ".pgdata_pw.tmp"
    [System.IO.File]::WriteAllText($pwFile, "LocalDevPg2026!")
    try {
      & (Join-Path $pgBin "initdb.exe") -D ".pgdata" -U postgres -A scram-sha-256 "--pwfile=$pwFile" -E UTF8
      if ($LASTEXITCODE -ne 0) { throw "initdb failed" }
    } finally {
      Remove-Item $pwFile -Force -ErrorAction SilentlyContinue
    }
  }

  Write-Host "[INFO] Starting local PostgreSQL on port $pgPort..."
  & (Join-Path $pgBin "pg_ctl.exe") -D ".pgdata" -l ".pgdata\logfile.log" -o "-p $pgPort" start
  if ($LASTEXITCODE -ne 0) { throw "Failed to start PostgreSQL on port $pgPort" }
  $pgStartedByScript = $true
} else {
  Write-Host "[OK] PostgreSQL already listening on port $pgPort"
}

# Ensure database exists
$env:PGPASSWORD = "LocalDevPg2026!"
$dbExists = & (Join-Path $pgBin "psql.exe") -h localhost -p $pgPort -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname='cold_calling_platform'" 2>$null
if ($dbExists -ne "1") {
  Write-Host "[INFO] Creating database cold_calling_platform..."
  & (Join-Path $pgBin "createdb.exe") -h localhost -p $pgPort -U postgres cold_calling_platform
  if ($LASTEXITCODE -ne 0) { throw "createdb failed" }
}

# 4. Install dependencies if missing, generate Prisma client, migrate, and seed
if (-not (Test-Path "node_modules")) {
  Write-Host "[INFO] Installing npm dependencies..."
  npm install
  if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
}

Write-Host "[INFO] Applying database migrations & ensuring initial admin account..."
node node_modules/prisma/build/index.js generate
if ($LASTEXITCODE -ne 0) { throw "prisma generate failed" }

node node_modules/prisma/build/index.js migrate deploy
if ($LASTEXITCODE -ne 0) { throw "prisma migrate deploy failed" }

node node_modules/tsx/dist/cli.mjs prisma/seed.ts
if ($LASTEXITCODE -ne 0) { throw "seed failed" }

# 5. Start Next.js server
$appPort = if ($env:PORT) { $env:PORT } else { "3000" }
$existingApp = Get-NetTCPConnection -LocalPort ([int]$appPort) -State Listen -ErrorAction SilentlyContinue
if ($existingApp) {
  Write-Host "[WARN] Port $appPort is already in use. Open http://localhost:$appPort in your browser." -ForegroundColor Yellow
  Start-Process "http://localhost:$appPort"
  exit 0
}

try {
  if ($Dev) {
    $env:NODE_ENV = "development"
    Write-Host ""
    Write-Host "[READY] Starting Next.js in DEV mode at http://localhost:$appPort" -ForegroundColor Green
    Write-Host "        Admin login: admin / AdminPassword123!" -ForegroundColor Green
    Write-Host "        Press Ctrl+C to stop." -ForegroundColor DarkGray
    Start-Process "http://localhost:$appPort"
    node node_modules/next/dist/bin/next dev -p $appPort
  } else {
    if ($Rebuild -or -not (Test-Path ".next\BUILD_ID")) {
      Write-Host "[INFO] Building Next.js production bundle..."
      Remove-Item Env:NODE_ENV -ErrorAction SilentlyContinue
      node node_modules/next/dist/bin/next build
      if ($LASTEXITCODE -ne 0) { throw "next build failed" }
    }
    $env:NODE_ENV = "production"
    Write-Host ""
    Write-Host "[READY] Starting app at http://localhost:$appPort" -ForegroundColor Green
    Write-Host "        Admin login: admin / AdminPassword123!" -ForegroundColor Green
    Write-Host "        Press Ctrl+C to stop." -ForegroundColor DarkGray
    Start-Process "http://localhost:$appPort"
    node node_modules/next/dist/bin/next start -p $appPort
  }
} finally {
  if ($pgStartedByScript) {
    Write-Host "`n[INFO] Stopping local PostgreSQL..."
    & (Join-Path $pgBin "pg_ctl.exe") -D ".pgdata" stop -m fast | Out-Null
  }
}
