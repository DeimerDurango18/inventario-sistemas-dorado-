# =====================================================================
# ETICOS - Arranque completo del proyecto (producción)
# Levanta: backend FastAPI (:8500) + túnel cloudflared + secret en Pages.
# Uso (desde la raiz del repo):
#   powershell -ExecutionPolicy Bypass -File scripts\start_eticos.ps1
# Requisitos: SQL Server local activo y CLOUDFLARE_API_TOKEN en el entorno.
# =====================================================================
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $root "backend"
$py = Join-Path $root ".venv\Scripts\python.exe"
$runPy = Join-Path $backendDir "run.py"
$cf = Join-Path $env:LOCALAPPDATA "cloudflared\cloudflared.exe"
$accountId = "e572d5126cadf7b2dc5e61eafb23d758"
$project = "inventario-equipos"

function Test-PortOpen([int]$port) {
    return (Test-NetConnection -ComputerName "127.0.0.1" -Port $port -WarningAction SilentlyContinue).TcpTestSucceeded
}

Write-Host "== [1/4] Backend FastAPI =="
if (Test-PortOpen 8500) {
    Write-Host "   Backend ya responde en :8500 (se reutiliza)."
} else {
    if (-not (Test-Path -LiteralPath $py)) { throw "No existe el venv: $py" }
    $bout = "$env:TEMP\eticos_backend.out.log"
    $berr = "$env:TEMP\eticos_backend.err.log"
    $p = Start-Process -FilePath $py -ArgumentList $runPy -WorkingDirectory $backendDir -WindowStyle Hidden -PassThru `
        -RedirectStandardOutput $bout -RedirectStandardError $berr
    Write-Host "   Iniciando backend (PID $($p.Id))... esperando a /api/health"
    $ok = $false
    for ($i = 0; $i -lt 40; $i++) {
        Start-Sleep -Seconds 2
        try {
            $h = Invoke-WebRequest -Uri "http://127.0.0.1:8500/api/health" -UseBasicParsing -TimeoutSec 5
            if ($h.StatusCode -eq 200) { $ok = $true; break }
        } catch { }
    }
    if (-not $ok) { throw "El backend no respondio. Revisa: $berr" }
    Write-Host "   Backend operativo: http://127.0.0.1:8500"
}

Write-Host "== [2/4] cloudflared (tunel) =="
if (-not (Test-Path -LiteralPath $cf)) {
    Write-Host "   Instalando cloudflared..."
    New-Item -ItemType Directory -Path (Split-Path $cf) -Force | Out-Null
    Invoke-WebRequest -Uri "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" -OutFile $cf -UseBasicParsing
}
Get-Process -Name cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

$tlog = "$env:TEMP\eticos_tunnel.cloudflared.log"
Remove-Item -LiteralPath $tlog -ErrorAction SilentlyContinue
$tp = Start-Process -FilePath $cf -ArgumentList "tunnel", "--url", "http://127.0.0.1:8500", "--no-autoupdate", "--logfile", $tlog -WindowStyle Hidden -PassThru
Write-Host "   Tunel iniciado (PID $($tp.Id)), capturando URL..."

$m = $null
for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Seconds 2
    $c = Get-Content -LiteralPath $tlog -Raw -ErrorAction SilentlyContinue
    $m = [regex]::Match($c, "https://[a-z0-9-]+\.trycloudflare\.com")
    if ($m.Success) { break }
}
if (-not $m.Success) { throw "No se capturo la URL del tunel (log: $tlog)" }
$url = $m.Value
Write-Host "   URL tunel: $url"

Write-Host "== [3/4] Actualizar secret BACKEND_URL (Cloudflare Pages) =="
$env:CLOUDFLARE_ACCOUNT_ID = $accountId
$url | & npx --yes wrangler@4 pages secret put BACKEND_URL --project-name $project
Write-Host "   Secret actualizado. Redesplegando para refrescar bindings..."
Push-Location (Join-Path $root "frontend")
& npx --yes wrangler@4 pages deploy dist --project-name $project --branch main | Out-Host
Pop-Location
Write-Host "   Redeploy completado."

Write-Host "== [4/4] Verificacion publica =="
$site = "https://$project.pages.dev"
for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Seconds 3
    try {
        $h = Invoke-WebRequest -Uri "$site/api/health" -UseBasicParsing -TimeoutSec 10
        if ($h.StatusCode -eq 200 -and $h.Content -match '"success"') {
            Write-Host "   OK: $site/api/health -> $($h.Content)"
            Write-Host ""
            Write-Host "=================================================="
            Write-Host "  ETICOS LISTO: $site"
            Write-Host "  Login: admin / Admin123!"
            Write-Host "=================================================="
            exit 0
        }
    } catch { }
}
Write-Host "   El sitio aun no responde /api/health; revisa el dashboard de Pages."