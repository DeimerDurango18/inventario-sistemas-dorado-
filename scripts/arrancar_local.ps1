# ============================================================
# ARRANCAR_LOCAL.ps1
#   Modo desarrollo (por defecto): backend (8010) + frontend dev (5173) + navegador.
#   Modo producción:  .\scripts\arrancar_local.ps1 -Produccion
#     backend (8010) + túnel Cloudflare + deploy a Pages + verificación.
# ============================================================
param(
    [switch]$Produccion
)

$ErrorActionPreference = 'Stop'
$scriptDir = $PSScriptRoot
$root    = Split-Path -Parent $scriptDir
$backend = Join-Path $root 'backend'
$front   = Join-Path $root 'frontend'
$py      = Join-Path $root '.venv\Scripts\python.exe'
$urlFile = Join-Path $root 'tunel_url.txt'

if (-not (Test-Path $py)) {
    Write-Error "No existe el entorno virtual: $py"
    Write-Host "Créalo con:  python -m venv .venv"
    exit 1
}

# --- Helper: asegurar backend corriendo con el código actual ---
function Start-Backend {
    Write-Host "==> Backend FastAPI en http://127.0.0.1:8010 ..." -ForegroundColor Cyan
    Start-Process cmd -ArgumentList "/k title Inventario-Backend-8010 && cd /d `"$backend`" && `"$py`" -m uvicorn app.main:app --host 127.0.0.1 --port 8010"
    # Esperar a que responda (/health)
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 1
        try {
            $r = Invoke-WebRequest -Uri 'http://127.0.0.1:8010/health' -UseBasicParsing -TimeoutSec 2
            if ($r.StatusCode -eq 200) { return $true }
        } catch { }
    }
    Write-Warning "Backend no respondió en /health (¿migraciones pendientes?)"
    return $false
}

# --- Liberar backend anterior (para cargar el código actual) ---
Write-Host "==> Liberando puertos 8010 (y 5173 en modo dev)..." -ForegroundColor Yellow
$puertos = if ($Produccion) { @(8010) } else { @(8010, 5173) }
Get-CimInstance Win32_Process -Filter "Name='python.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -match 'uvicorn app.main:app' } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Get-NetTCPConnection -LocalPort $puertos -State Listen -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 1

$backendOk = Start-Backend

if ($Produccion) {
    # ---- Modo PRODUCCIÓN: todo el pipeline en un comando ----
    Write-Host ""
    Write-Host "==> [2/3] Túnel Cloudflare (URL nueva en tunel_url.txt)..." -ForegroundColor Cyan
    & (Join-Path $scriptDir 'tunel.ps1')
    if (-not (Test-Path $urlFile)) { Write-Error "Fallo al levantar el túnel. Revisa cloudflared.log"; exit 1 }

    Write-Host ""
    Write-Host "==> [3/3] Deploy a Cloudflare Pages con verificación..." -ForegroundColor Cyan
    & (Join-Path $scriptDir 'desplegar.ps1')
    $deployCode = $LASTEXITCODE

    Write-Host ""
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "  PIPELINE DE PRODUCCIÓN FINALIZADO" -ForegroundColor Green
    Write-Host "  App:   https://inventario-equipos.pages.dev" -ForegroundColor Green
    Write-Host "  API:   $((Get-Content $urlFile -Raw).Trim())" -ForegroundColor Cyan
    if ($deployCode -ne 0) { Write-Host "  >>> La verificación del CDN falló; revisa el mensaje anterior." -ForegroundColor Red }
    Write-Host "============================================" -ForegroundColor Green
    exit $deployCode
}

# ---- Modo DESARROLLO (por defecto) ----
# [2/3] Frontend
Write-Host "==> [2/3] Frontend Vite en http://localhost:5173 ..." -ForegroundColor Cyan
if (-not (Test-Path (Join-Path $front 'node_modules'))) {
    Write-Host "    Instalando dependencias del frontend (npm install)..."
    Push-Location $front
    npm install
    Pop-Location
}
Start-Process cmd -ArgumentList "/k title Inventario-Frontend-5173 && cd /d `"$front`" && npm run dev -- --host 0.0.0.0 --port 5173"

# [3/3] Navegador
Write-Host "==> [3/3] Abriendo navegador..." -ForegroundColor Cyan
Start-Sleep -Seconds 5
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  LOCAL LISTO" -ForegroundColor Green
Write-Host "  App:      http://localhost:5173" -ForegroundColor Green
Write-Host "  API:      http://127.0.0.1:8010  (/health, /docs)"
Write-Host "  Login:    admin@sistemasbogota.com / Admin2026!"
Write-Host "  Detener:  cierra las ventanas de consola abiertas"
Write-Host "============================================" -ForegroundColor Green