# ============================================================
# ARRANCAR_LOCAL.ps1 - Levanta backend (8010) + frontend (5173)
# en modo desarrollo y abre el navegador.
# Uso:  .\scripts\arrancar_local.ps1
# ============================================================
$ErrorActionPreference = 'Stop'
$root    = Split-Path -Parent $PSScriptRoot
$backend = Join-Path $root 'backend'
$front   = Join-Path $root 'frontend'
$py      = Join-Path $root '.venv\Scripts\python.exe'

if (-not (Test-Path $py)) {
    Write-Error "No existe el entorno virtual: $py"
    Write-Host "Créalo con:  python -m venv .venv"
    exit 1
}

# --- Liberar puertos previos (8010 backend, 5173 vite) ---
Write-Host "==> Liberando puertos 8010 y 5173..." -ForegroundColor Yellow
powershell -NoProfile -Command "$ErrorActionPreference='SilentlyContinue'; Get-CimInstance Win32_Process -Filter \"Name='python.exe'\" | Where-Object { $_.CommandLine -match 'uvicorn app.main:app' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }; Get-NetTCPConnection -LocalPort 8010,5173 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"

# --- Backend ---
Write-Host "==> [1/3] Backend FastAPI en http://127.0.0.1:8010 ..." -ForegroundColor Cyan
Start-Process cmd -ArgumentList "/k title Inventario-Backend-8010 && cd /d `"$backend`" && `"$py`" -m uvicorn app.main:app --host 127.0.0.1 --port 8010"

# --- Frontend ---
Write-Host "==> [2/3] Frontend Vite en http://localhost:5173 ..." -ForegroundColor Cyan
if (-not (Test-Path (Join-Path $front 'node_modules'))) {
    Write-Host "    Instalando dependencias del frontend (npm install)..."
    Push-Location $front
    npm install
    Pop-Location
}
Start-Process cmd -ArgumentList "/k title Inventario-Frontend-5173 && cd /d `"$front`" && npm run dev -- --host 0.0.0.0 --port 5173"

Write-Host "==> [3/3] Abriendo navegador..." -ForegroundColor Cyan
Start-Sleep -Seconds 4
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  LOCAL LISTO" -ForegroundColor Green
Write-Host "  App:      http://localhost:5173" -ForegroundColor Green
Write-Host "  API:      http://127.0.0.1:8010  (/health, /docs)"
Write-Host "  Login:    admin@sistemasbogota.com / Admin2026!"
Write-Host "  Detener:  cierra las ventanas de consola abiertas"
Write-Host "============================================" -ForegroundColor Green