# ============================================================
# DESPLEGAR.ps1 - Build del frontend y deploy a Cloudflare Pages
# Uso:
#   .\scripts\desplegar.ps1                 (usa el túnel guardado en tunel_url.txt)
#   .\scripts\desplegar.ps1 -Tunel https://xxx.trycloudflare.com   (túnel manual)
# Tras el deploy VALIDA que el bundle servido por el CDN apunte
# al túnel vigente (evita quedarte con una API muerta).
# ============================================================
param(
    [string]$Tunel = ''
)

$ErrorActionPreference = 'Stop'
$root    = Split-Path -Parent $PSScriptRoot
$front   = Join-Path $root 'frontend'
$urlFile = Join-Path $root 'tunel_url.txt'
$sitio   = 'https://inventario-equipos.pages.dev'

# ---- 1) Túnel: usar el dado, el guardado, o levantarlo ----
if (-not $Tunel -and (Test-Path $urlFile)) {
    $Tunel = (Get-Content $urlFile -Raw).Trim()
}
if ($Tunel -notmatch '^https://[a-z0-9-]+\.trycloudflare\.com') {
    Write-Host "==> No hay URL de túnel válida. Levantando túnel..." -ForegroundColor Yellow
    & (Join-Path $PSScriptRoot 'tunel.ps1')
    if (-not (Test-Path $urlFile)) { Write-Error "No se pudo obtener la URL del túnel"; exit 1 }
    $Tunel = (Get-Content $urlFile -Raw).Trim()
}
Write-Host "==> VITE_API_URL = $Tunel" -ForegroundColor Cyan

# ---- 2) Build del frontend con la URL del túnel horneada ----
Push-Location $front
$env:VITE_API_URL = $Tunel

# También actualizar el config.json publicado: permite corregir la URL
# desde Configuración > Conexión sin necesidad de rebuild.
$configJson = Join-Path $front 'public\config.json'
$configContent = @(
    "{",
    "  `"apiUrl`": `"$Tunel`"",
    "}"
) -join [Environment]::NewLine
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($configJson, $configContent, $utf8NoBom)

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

# ---- 4) Validación post-deploy: el bundle del CDN debe apuntar a $Tunel ----
Write-Host "==> Verificando que el CDN sirva la API vigente..." -ForegroundColor Cyan
Start-Sleep -Seconds 6

$validado = $false
$cacheBuster = "?v=$([DateTime]::UtcNow.Ticks)"
for ($i = 0; $i -lt 8; $i++) {
    try {
        $wc = New-Object System.Net.WebClient
        $html = $wc.DownloadString("$sitio/$cacheBuster")
        $jsAsset = [regex]::Match($html, 'assets/[^"'']+\.js').Value
        if ($jsAsset) {
            $bundle = $wc.DownloadString("$sitio/$jsAsset")
            $apis = @([regex]::Matches($bundle, 'https://[a-z0-9-]+\.trycloudflare\.com') | ForEach-Object { $_.Value } | Sort-Object -Unique)
            if ($apis -contains $Tunel) { $validado = $true; break }
        }
    } catch { }
    Start-Sleep -Seconds 10
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
if ($validado) {
    Write-Host "  DESPLIEGUE COMPLETO Y VERIFICADO" -ForegroundColor Green
    Write-Host "  App:   $sitio" -ForegroundColor Green
    Write-Host "  API:   $Tunel  (correcta en el CDN)" -ForegroundColor Green
} else {
    Write-Host "  DESPLIEGUE COMPLETO, PERO..." -ForegroundColor Red
    Write-Host "  El sitio NO está sirviendo la API vigente ($Tunel)." -ForegroundColor Red
    Write-Host "  Causa probable: el auto-deploy de Pages (VITE_API_URL del" -ForegroundColor Yellow
    Write-Host "  panel) sobreescribe el deploy. Desactívalo en Settings ->" -ForegroundColor Yellow
    Write-Host "  Builds & deployments, o actualiza la variable a:" -ForegroundColor Yellow
    Write-Host "  $Tunel" -ForegroundColor Cyan
}
Write-Host "  Recarga con Ctrl+F5 para ver cambios." -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Green

if (-not $validado) { exit 2 }