# =====================================================================
# ETICOS - Arranque local + despliegue opcional con Cloudflare Pages
# Requiere: backend/.env configurado, Python venv y (opcional) cloudflared/wrangler.
# Los secretos y account IDs se leen del entorno; no se almacenan en el repo.
# =====================================================================
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $root "backend"
$py = Join-Path $root ".venv\Scripts\python.exe"
$runPy = Join-Path $backendDir "run.py"
$apiPort = if ($env:API_PORT) { [int]$env:API_PORT } else { 8500 }
$pagesProject = if ($env:CLOUDFLARE_PAGES_PROJECT) { $env:CLOUDFLARE_PAGES_PROJECT } else { "inventario-equipos" }

function Test-PortOpen([int]$port) {
    return (Test-NetConnection -ComputerName "127.0.0.1" -Port $port -WarningAction SilentlyContinue).TcpTestSucceeded
}

if (-not (Test-Path -LiteralPath $py)) { throw "No existe el venv: $py" }
if (-not (Test-Path -LiteralPath (Join-Path $backendDir ".env"))) {
    throw "Falta backend/.env. Copia backend/.env.example y configura secretos antes de iniciar."
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
    $ok = $false
    for ($i = 0; $i -lt 40; $i++) {
        Start-Sleep -Seconds 2
        try {
            $h = Invoke-WebRequest -Uri "http://127.0.0.1:$apiPort/api/health" -UseBasicParsing -TimeoutSec 5
            if ($h.StatusCode -eq 200 -and $h.Content -match '"success":true') { $ok = $true; break }
        } catch { }
    }
    if (-not $ok) { throw "El backend no respondió correctamente. Revisa: $berr" }
}

if ($env:ETICOS_DEPLOY -ne "1") {
    Write-Host "Arranque local completado. Para desplegar, usa ETICOS_DEPLOY=1 y configura Cloudflare."
    exit 0
}

if (-not $env:CLOUDFLARE_ACCOUNT_ID) { throw "Falta CLOUDFLARE_ACCOUNT_ID." }
if (-not $env:CLOUDFLARE_API_TOKEN) { throw "Falta CLOUDFLARE_API_TOKEN." }

Write-Host "== Cloudflare tunnel =="
$cf = Join-Path $env:LOCALAPPDATA "cloudflared\cloudflared.exe"
if (-not (Test-Path -LiteralPath $cf)) {
    New-Item -ItemType Directory -Path (Split-Path $cf) -Force | Out-Null
    Invoke-WebRequest -Uri "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" -OutFile $cf -UseBasicParsing
}
Get-Process -Name cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
$tlog = "$env:TEMP\eticos_tunnel.cloudflared.log"
Remove-Item -LiteralPath $tlog -ErrorAction SilentlyContinue
Start-Process -FilePath $cf -ArgumentList "tunnel", "--url", "http://127.0.0.1:$apiPort", "--no-autoupdate", "--logfile", $tlog -WindowStyle Hidden | Out-Null

$m = $null
for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Seconds 2
    $c = Get-Content -LiteralPath $tlog -Raw -ErrorAction SilentlyContinue
    $m = [regex]::Match($c, "https://[a-z0-9-]+\.trycloudflare\.com")
    if ($m.Success) { break }
}
if (-not $m.Success) { throw "No se capturó la URL del túnel. Log: $tlog" }
$url = $m.Value
Write-Host "Tunnel: $url"

Write-Host "== Cloudflare Pages =="
$url | & npx --yes wrangler@4 pages secret put BACKEND_URL --project-name $pagesProject
Push-Location (Join-Path $root "frontend")
& npx --yes wrangler@4 pages deploy dist --project-name $pagesProject --branch main
Pop-Location
Write-Host "Despliegue completado."
