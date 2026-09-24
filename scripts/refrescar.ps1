# ============================================================
# ETICOS - Refrescar PRODUCCION (VITE_API_BASE + build + deploy Pages)
# Nota: los Quick Tunnels (trycloudflare.com) devuelven HTTP 530 si quien
# llama es la red interna de Cloudflare, asi que el front se conecta al
# tunel DIRECTAMENTE (VITE_API_BASE en .env.production), sin usar el
# proxy /api de Pages Functions como backend.
# Uso:
#   powershell -ExecutionPolicy Bypass -File .\refrescar.ps1
#   powershell -ExecutionPolicy Bypass -File .\refrescar.ps1 -TunnelUrl https://xxxx.trycloudflare.com
# Sin -TunnelUrl usa la ultima URL detectada en el log del tunel.
# ============================================================
param([string]$TunnelUrl)
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$frontend = Join-Path $root "frontend"
$pagesProject = if ($env:CLOUDFLARE_PAGES_PROJECT) { $env:CLOUDFLARE_PAGES_PROJECT } else { "inventario-equipos" }
if (-not $env:CLOUDFLARE_ACCOUNT_ID) {
    throw 'Falta CLOUDFLARE_ACCOUNT_ID. Ej: $env:CLOUDFLARE_ACCOUNT_ID = "e572d5126cadf7b2dc5e61eafb23d758"'
}

if (-not $TunnelUrl) {
    $tlog = "$env:TEMP\eticos_tunnel.cloudflared.log"
    $c = Get-Content -LiteralPath $tlog -Raw -ErrorAction SilentlyContinue
    if ($c) {
        $matchesAll = [regex]::Matches($c, "https://[a-z0-9-]+\.trycloudflare\.com")
        if ($matchesAll.Count -gt 0) { $TunnelUrl = $matchesAll[$matchesAll.Count - 1].Value }
    }
}
if (-not $TunnelUrl) { $TunnelUrl = Read-Host "URL del tunel (trycloudflare.com, sin barra final)" }

Write-Host "== Apuntando VITE_API_BASE al tunel ($TunnelUrl) =="
$envFile = Join-Path $frontend ".env.production"
$apiBase = $TunnelUrl.TrimEnd('/') + "/api"
"VITE_API_BASE=$apiBase" | Set-Content -LiteralPath $envFile -Encoding ascii

Write-Host "== 1/3 Build del frontend =="
Push-Location $frontend
& npm run build
$ncode = $LASTEXITCODE
Pop-Location
if ($ncode -ne 0) { throw "Fall el build. Revisa la salida de npm." }

Write-Host "== 2/3 Secret BACKEND_URL -> $TunnelUrl (backup/preview, el prod usa VITE_API_BASE directo) =="
$TunnelUrl | & npx --yes wrangler@4 pages secret put BACKEND_URL --project-name $pagesProject
if ($LASTEXITCODE -ne 0) { throw "Fall al publicar el secreto." }

Write-Host "== 3/3 Deploy en Cloudflare Pages =="
Push-Location $frontend
& npx --yes wrangler@4 pages deploy dist --project-name $pagesProject --branch main
$ncode = $LASTEXITCODE
Pop-Location
if ($ncode -ne 0) { throw "Fall el deploy." }

Write-Host "Produccion: https://inventario-equipos.pages.dev" -ForegroundColor Green
Write-Host "Verifica: verificar.ps1"