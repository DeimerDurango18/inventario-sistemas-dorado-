# Re-monta el túnel cloudflared hacia el backend local (:8500) y actualiza
# el secret BACKEND_URL del proyecto Cloudflare Pages.
# Uso (desde la raiz del repo):
#   powershell -ExecutionPolicy Bypass -File scripts\deploy_tunnel.ps1
# Requisitos: backend corriendo en http://127.0.0.1:8500 y CLOUDFLARE_API_TOKEN en el entorno.

$ErrorActionPreference = "Stop"

$cf = Join-Path $env:LOCALAPPDATA "cloudflared\cloudflared.exe"
if (-not (Test-Path -LiteralPath $cf)) {
    Write-Host "cloudflared no esta instalado. Descargandolo..."
    New-Item -ItemType Directory -Path (Split-Path $cf) -Force | Out-Null
    Invoke-WebRequest -Uri "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" -OutFile $cf -UseBasicParsing
}

$log = "$env:TEMP\eticos_tunnel.cloudflared.log"
Remove-Item -LiteralPath $log -ErrorAction SilentlyContinue

$p = Start-Process -FilePath $cf -ArgumentList "tunnel", "--url", "http://127.0.0.1:8500", "--no-autoupdate", "--logfile", $log -WindowStyle Hidden -PassThru
Write-Host "Tunnel PID: $($p.Id)"

$m = $null
for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Seconds 2
    $c = Get-Content -LiteralPath $log -Raw -ErrorAction SilentlyContinue
    $m = [regex]::Match($c, "https://[a-z0-9-]+\.trycloudflare\.com")
    if ($m.Success) { break }
    if (Test-NetConnection -ComputerName localhost -Port 8500 -WarningAction SilentlyContinue).TcpTestSucceeded -eq $false {
        Write-Warning "El backend no responde en :8500. Inicialo antes."
    }
}
if (-not $m.Success) { throw "No se pudo capturar la URL del tunel (revisa el log: $log)" }

$url = $m.Value
Write-Host "URL tunel: $url"

$env:CLOUDFLARE_ACCOUNT_ID = "e572d5126cadf7b2dc5e61eafb23d758"
$url | & npx --yes wrangler@4 pages secret put BACKEND_URL --project-name inventario-equipos

Write-Host "Listo. Tu app vive en https://inventario-equipos.pages.dev"