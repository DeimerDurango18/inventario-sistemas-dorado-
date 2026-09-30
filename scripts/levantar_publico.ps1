# ============================================================
# ETICOS - Levantar PUBLICO completo (backend + tunel + deploy Pages)
# Levanta el backend local, publica su API mediante un tunel cloudflared
# y, si la URL del tunel cambio, actualiza VITE_API_BASE + redeploy.
# Uso:
#   powershell -ExecutionPolicy Bypass -File .\levantar_publico.ps1
#   powershell -ExecutionPolicy Bypass -File .\levantar_publico.ps1 -NoDeploy   (solo backend + tunel)
# ============================================================
param(
    [switch]$NoDeploy
)
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $root "backend"
$py = Join-Path $root ".venv\Scripts\python.exe"
$runPy = Join-Path $backendDir "run.py"
$apiPort = if ($env:API_PORT) { [int]$env:API_PORT } else { 8500 }
$tlog = "$env:TEMP\eticos_tunnel.cloudflared.log"

if (-not (Test-Path -LiteralPath $py)) { throw "No existe el venv: $py" }
if (-not (Test-Path -LiteralPath (Join-Path $backendDir ".env"))) {
    throw "Falta backend/.env. Copia backend/.env.example y configuralo."
}

function Test-PortOpen([int]$port) {
    return (Test-NetConnection -ComputerName "127.0.0.1" -Port $port -WarningAction SilentlyContinue).TcpTestSucceeded
}

function Wait-Health([int]$port) {
    for ($i = 0; $i -lt 40; $i++) {
        Start-Sleep -Seconds 2
        try {
            $h = Invoke-WebRequest -Uri "http://127.0.0.1:$port/api/health" -UseBasicParsing -TimeoutSec 5
            if ($h.StatusCode -eq 200 -and $h.Content -match '"success":true') { return $true }
        } catch { }
    }
    return $false
}

# ------------------------------------------------------------ 1. Backend
Write-Host "== Backend FastAPI =="
if (Test-PortOpen $apiPort) {
    Write-Host "Backend ya responde en :$apiPort."
} else {
    $bout = "$env:TEMP\eticos_backend.out.log"
    $berr = "$env:TEMP\eticos_backend.err.log"
    $p = Start-Process -FilePath $py -ArgumentList $runPy -WorkingDirectory $backendDir -WindowStyle Hidden -PassThru `
        -RedirectStandardOutput $bout -RedirectStandardError $berr
    Write-Host "Iniciando backend (PID $($p.Id))..."
    if (-not (Wait-Health $apiPort)) { throw "El backend no respondio. Revisa: $berr" }
    Write-Host "Backend arriba: http://localhost:$apiPort"
}

# ------------------------------------------------------------ 2. Tunel
Write-Host "== Tunel cloudflared =="
$cf = Join-Path $env:LOCALAPPDATA "cloudflared\cloudflared.exe"
if (-not (Test-Path -LiteralPath $cf)) {
    Write-Host "Descargando cloudflared..."
    New-Item -ItemType Directory -Path (Split-Path $cf) -Force | Out-Null
    Invoke-WebRequest -Uri "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" -OutFile $cf -UseBasicParsing
}

$runTunel = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -match "cloudflared" }
if ($runTunel) {
    Write-Host "Ya hay un tunel cloudflared corriendo (PID $($runTunel.ProcessId -join ','))."
} else {
    Remove-Item -LiteralPath $tlog -ErrorAction SilentlyContinue
    Start-Process -FilePath $cf -ArgumentList "tunnel", "--url", "http://127.0.0.1:$apiPort", "--no-autoupdate", "--logfile", $tlog -WindowStyle Hidden | Out-Null
    Write-Host "Tunel iniciado, esperando URL publica..."
}

$url = $null
for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Seconds 2
    $c = Get-Content -LiteralPath $tlog -Raw -ErrorAction SilentlyContinue
    $m = [regex]::Match($c, "https://[a-z0-9-]+\.trycloudflare\.com")
    if ($m.Success) { $url = $m.Value; break }
}
if (-not $url) {
    Write-Host "No se detecto la URL del tunel aun. Revisa: $tlog" -ForegroundColor Yellow
    exit 1
}
Write-Host "Backend publico (tunel): $url" -ForegroundColor Green

# ------------------------------------------------------------ 3. Deploy (opcional)
if ($NoDeploy) {
    Write-Host "== Modo -NoDeploy: se omite el deploy. =="
    Write-Host "Frontend publico: https://inventario-equipos.pages.dev"
    exit 0
}

$pagesProject = if ($env:CLOUDFLARE_PAGES_PROJECT) { $env:CLOUDFLARE_PAGES_PROJECT } else { "inventario-equipos" }
if (-not $env:CLOUDFLARE_ACCOUNT_ID) {
    Write-Host "Falta CLOUDFLARE_ACCOUNT_ID. Deja el deploy y usa refrescar.ps1 con: `$env:CLOUDFLARE_ACCOUNT_ID = `<id`>" -ForegroundColor Yellow
    exit 1
}
$frontend = Join-Path $root "frontend"
$envFile = Join-Path $frontend ".env.production"
$apiBase = $url.TrimEnd('/') + "/api"

Write-Host "== Apuntando VITE_API_BASE al tunel ($apiBase) =="
"VITE_API_BASE=$apiBase" | Set-Content -LiteralPath $envFile -Encoding ascii

Write-Host "== Build del frontend =="
Push-Location $frontend
& npm run build
$ncode = $LASTEXITCODE
Pop-Location
if ($ncode -ne 0) { throw "Fallo el build. Revisa la salida de npm." }

Write-Host "== Secret BACKEND_URL -> $url =="
$url | & npx --yes wrangler@4 pages secret put BACKEND_URL --project-name $pagesProject
if ($LASTEXITCODE -ne 0) { throw "Fallo al publicar el secreto." }

Write-Host "== Deploy en Cloudflare Pages =="
Push-Location $frontend
& npx --yes wrangler@4 pages deploy dist --project-name $pagesProject --branch main
$ncode = $LASTEXITCODE
Pop-Location
if ($ncode -ne 0) { throw "Fallo el deploy." }

Write-Host ""
Write-Host "Produccion: https://inventario-equipos.pages.dev" -ForegroundColor Green
Write-Host "Verificacion: verificar.ps1" -ForegroundColor Green