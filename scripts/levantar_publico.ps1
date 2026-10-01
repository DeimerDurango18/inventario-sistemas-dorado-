# ============================================================
# ETICOS - LEVANTAR TODO (backend + tunel + deploy Pages) en un solo paso
# Levanta el backend local si esta caido, publica su API mediante un
# tunel cloudflared (manteniendo el tunel existente si esta vivo) y,
# si la URL del tunel cambio o no coincide, actualiza VITE_API_BASE y
# re-despliega Cloudflare Pages.
# Uso:
#   powershell -ExecutionPolicy Bypass -File .\levantar_publico.ps1
#   powershell -ExecutionPolicy Bypass -File .\levantar_publico.ps1 -NoDeploy
#   powershell -ExecutionPolicy Bypass -File .\levantar_publico.ps1 -TunnelUrl https://xxx.trycloudflare.com
# ============================================================
param(
    [switch]$NoDeploy,
    [string]$TunnelUrl
)
$ErrorActionPreference = "Stop"

# ------------------------------------------------------------ Cuenta Cloudflare (default de ETICOS)
if (-not $env:CLOUDFLARE_ACCOUNT_ID) {
    $env:CLOUDFLARE_ACCOUNT_ID = "e572d5126cadf7b2dc5e61eafb23d758"
    Write-Host "CLOUDFLARE_ACCOUNT_ID auto (default ETICOS)."
}
$pagesProject = if ($env:CLOUDFLARE_PAGES_PROJECT) { $env:CLOUDFLARE_PAGES_PROJECT } else { "inventario-equipos" }

$root = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $root "backend"
$py = Join-Path $root ".venv\Scripts\python.exe"
$runPy = Join-Path $backendDir "run.py"
$frontend = Join-Path $root "frontend"
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

function Wait-PublicHealth([string]$baseUrl) {
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 2
        try {
            $h = Invoke-WebRequest -Uri "$baseUrl/api/health" -UseBasicParsing -TimeoutSec 10
            if ($h.StatusCode -eq 200 -and $h.Content -match '"success":true') { return $true }
        } catch { }
    }
    return $false
}

# ------------------------------------------------------------ 1. Backend
Write-Host ""
Write-Host "== [1/4] Backend FastAPI =="
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
Write-Host ""
Write-Host "== [2/4] Tunel cloudflared =="
$cf = Join-Path $env:LOCALAPPDATA "cloudflared\cloudflared.exe"
if (-not (Test-Path -LiteralPath $cf)) {
    Write-Host "Descargando cloudflared..."
    New-Item -ItemType Directory -Path (Split-Path $cf) -Force | Out-Null
    Invoke-WebRequest -Uri "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" -OutFile $cf -UseBasicParsing
}

$runTunel = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -match "cloudflared" }
$tunelLog = $tlog
if ($runTunel) {
    Write-Host "Ya hay un tunel cloudflared corriendo (PID $($runTunel.ProcessId -join ','))."
    $mLog = [regex]::Match(($runTunel | Select-Object -First 1).CommandLine, "--logfile\s+(?:""([^""]+)""|([^ ]+))")
    if ($mLog.Success) { $tunelLog = if ($mLog.Groups[1].Value) { $mLog.Groups[1].Value } else { $mLog.Groups[2].Value } }
} else {
    Remove-Item -LiteralPath $tlog -ErrorAction SilentlyContinue
    Start-Process -FilePath $cf -ArgumentList "tunnel", "--url", "http://127.0.0.1:$apiPort", "--no-autoupdate", "--logfile", $tlog -WindowStyle Hidden | Out-Null
    Write-Host "Tunel iniciado, esperando URL publica..."
}

# Detectar la ultima URL publica del tunel
$detected = $null
for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Seconds 2
    $c = Get-Content -LiteralPath $tunelLog -Raw -ErrorAction SilentlyContinue
    if ($null -eq $c) { $c = "" }
    $matchesAll = [regex]::Matches($c, "https://[a-z0-9-]+\.trycloudflare\.com")
    if ($matchesAll.Count -gt 0) { $detected = $matchesAll[$matchesAll.Count - 1].Value; break }
}
if (-not $TunnelUrl) { $TunnelUrl = $detected }
if (-not $TunnelUrl) {
    Write-Host "No se detecto la URL del tunel. Revisa: $tunelLog" -ForegroundColor Yellow
    exit 1
}
$TunnelUrl = $TunnelUrl.TrimEnd('/')
Write-Host "Backend publico (tunel): $TunnelUrl" -ForegroundColor Green

if (-not (Wait-PublicHealth $TunnelUrl)) {
    Write-Host "AVISO: el tunel publico no respondio /api/health. Puede tardar unos segundos mas." -ForegroundColor Yellow
}

# ------------------------------------------------------------ 3. Apuntar frontend + build
Write-Host ""
Write-Host "== [3/4] VITE_API_BASE + build del frontend =="
$envFile = Join-Path $frontend ".env.production"
$apiBase = $TunnelUrl + "/api"
"VITE_API_BASE=$apiBase" | Set-Content -LiteralPath $envFile -Encoding ascii
Write-Host "VITE_API_BASE -> $apiBase"

Push-Location $frontend
& npm run build
$ncode = $LASTEXITCODE
Pop-Location
if ($ncode -ne 0) { throw "Fall el build. Revisa la salida de npm." }

# ------------------------------------------------------------ 4. Deploy (opcional)
if ($NoDeploy) {
    Write-Host ""
    Write-Host "== Modo -NoDeploy: se omite el deploy. =="
    Write-Host "Frontend apuntado a: $TunnelUrl"
    Write-Host "Frontend publico: https://inventario-equipos.pages.dev"
    exit 0
}

Write-Host ""
Write-Host "== [4/4] Secret BACKEND_URL + deploy =="
$TunnelUrl | & npx --yes wrangler@4 pages secret put BACKEND_URL --project-name $pagesProject
if ($LASTEXITCODE -ne 0) { throw "Fall al publicar el secreto." }

Push-Location $frontend
& npx --yes wrangler@4 pages deploy dist --project-name $pagesProject --branch main
$ncode = $LASTEXITCODE
Pop-Location
if ($ncode -ne 0) { throw "Fall el deploy." }

Write-Host ""
Write-Host "Produccion: https://inventario-equipos.pages.dev" -ForegroundColor Green
Write-Host "API (tunel): $TunnelUrl" -ForegroundColor Green
Write-Host "Verificacion: verificar.ps1" -ForegroundColor Green