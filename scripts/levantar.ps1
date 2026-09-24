# ============================================================
# ETICOS - Levantar entorno PUBLICO (backend + tunel cloudflared)
# Levanta el backend local y publica su API mediante un tunel.
# Uso:
#   powershell -ExecutionPolicy Bypass -File .\levantar.ps1
# ============================================================
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

Write-Host ""
if ($url) {
    Write-Host "Backend publico (tunel): $url" -ForegroundColor Green
    Write-Host "Frontend publico: https://inventario-equipos.pages.dev" -ForegroundColor Green
    Write-Host "Si esta URL cambio respecto a la anterior, ejecuta refrescar.ps1." -ForegroundColor Yellow
    Write-Host "Verificacion: verificar.ps1"
} else {
    Write-Host "No se detecto la URL del tunel aun. Revisa: $tlog" -ForegroundColor Yellow
    Write-Host "Puedes fijarla manualmente: refrescar.ps1 -TunnelUrl <url>"
}