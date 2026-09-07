# ============================================================
# DESPLEGAR.ps1 - Build del frontend y deploy a Cloudflare Pages
# Uso:
#   .\scripts\desplegar.ps1                 (usa el túnel guardado en tunel_url.txt)
#   .\scripts\desplegar.ps1 -Tunel https://xxx.trycloudflare.com   (túnel manual)
# ============================================================
param(
    [string]$Tunel = ''
)

$ErrorActionPreference = 'Stop'
$root    = Split-Path -Parent $PSScriptRoot
$front   = Join-Path $root 'frontend'
$urlFile = Join-Path $root 'tunel_url.txt'

# ---- 1) Túnel: usar el dado, el guardado, o levantarlo ----
if (-not $Tunel -and (Test-Path $urlFile)) {
    $Tunel = (Get-Content $urlFile -Raw).Trim()
}
if ($Tunel -notmatch '^https://[a-z0-9-]+\.trycloudflare\.com') {
    Write-Host "==> No hay URL de túnel válida. Levantando túnel..." -ForegroundColor Yellow
    & (Join-Path $PSScriptRoot 'tunel.ps1')
    $Tunel = (Get-Content $urlFile -Raw).Trim()
}
Write-Host "==> VITE_API_URL = $Tunel" -ForegroundColor Cyan

# ---- 2) Build del frontend con la URL del túnel horneada ----
Push-Location $front
$env:VITE_API_URL = $Tunel
Write-Host "==> Build de producción (Vite)..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) { Pop-Location; Write-Error "Build falló"; exit 1 }

# ---- 3) Deploy a Cloudflare Pages ----
$env:CLOUDFLARE_ACCOUNT_ID = 'e572d5126cadf7b2dc5e61eafb23d758'
$env:CLOUDFLARE_API_TOKEN   = [Environment]::GetEnvironmentVariable('CLOUDFLARE_API_TOKEN', 'User')
if (-not $env:CLOUDFLARE_API_TOKEN) {
    Pop-Location
    Write-Error "Falta la variable de usuario CLOUDFLARE_API_TOKEN"
    exit 1
}

Write-Host "==> Desplegando a Cloudflare Pages (inventario-equipos)..." -ForegroundColor Cyan
npx wrangler pages deploy dist --project-name inventario-equipos --branch main
$code = $LASTEXITCODE
Pop-Location

if ($code -ne 0) { Write-Error "Deploy falló (código $code)"; exit 1 }

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  DESPLIEGUE COMPLETO" -ForegroundColor Green
Write-Host "  App:   https://inventario-equipos.pages.dev" -ForegroundColor Green
Write-Host "  API:   $Tunel" -ForegroundColor Cyan
Write-Host "  Recarga con Ctrl+F5 para ver cambios." -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Green