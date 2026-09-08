# ============================================================
# TUNEL.ps1 - Levanta el túnel Cloudflare del backend local (8010)
# Guarda la URL en tunel_url.txt (raíz del proyecto)
# Uso:  .\scripts\tunel.ps1            (silencioso)
#       .\scripts\tunel.ps1 -Ventana   (con ventana visible)
# ============================================================
param(
    [switch]$Ventana
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$urlFile = Join-Path $root 'tunel_url.txt'
$log = Join-Path $root 'cloudflared.log'

# --- Detectar cloudflared ---
$candidates = @(
    'C:\Program Files (x86)\cloudflared\cloudflared.exe',
    'C:\Program Files\cloudflared\cloudflared.exe'
)
$cf = $null
foreach ($c in $candidates) {
    if (Test-Path $c) { $cf = $c; break }
}
if (-not $cf) {
    $exe = Get-Command cloudflared -ErrorAction SilentlyContinue
    if ($exe) { $cf = $exe.Source }
}
if (-not $cf) {
    Write-Error "No se encontró cloudflared. Descárgalo de https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/ o instálalo con winget install cloudflare.cloudflared"
    exit 1
}
Write-Host "==> cloudflared: $cf" -ForegroundColor DarkGray

# --- Detener túnel anterior ---
Write-Host "==> Deteniendo túnel anterior (si existe)..." -ForegroundColor Yellow
Get-CimInstance Win32_Process -Filter "Name='cloudflared.exe'" -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Sleep -Milliseconds 500
if (Test-Path $log) { Remove-Item $log -Force }

# --- Lanzar túnel en segundo plano ---
$vbs = Join-Path $env:TEMP 'iniciar_tunel_cloudflared.vbs'
$cmd = Join-Path $env:TEMP 'iniciar_tunel_cloudflared.cmd'
$windowStyle = if ($Ventana) { 1 } else { 0 }

@"
@echo off
"$cf" tunnel --url http://localhost:8010 > "$log" 2>&1
"@ | Set-Content -Path $cmd -Encoding ASCII

@"
Set oShell = CreateObject("WScript.Shell")
oShell.Run "cmd.exe /c ""$cmd""", $windowStyle, False
"@ | Set-Content -Path $vbs -Encoding ASCII

& wscript.exe $vbs

# --- Esperar URL del túnel ---
Write-Host "==> Esperando URL del túnel..." -ForegroundColor Yellow
$url = $null
for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Seconds 1
    if (Test-Path $log) {
        $content = Get-Content -Path $log -Raw -ErrorAction SilentlyContinue
        if ($content) {
            $m = [regex]::Match($content, 'https://[a-z0-9-]+\.trycloudflare\.com')
            if ($m.Success) { $url = $m.Value; break }
        }
    }
}

if (-not $url) {
    Write-Error "No se pudo obtener la URL del túnel. Revisa: $log"
    exit 1
}

# Si el log contiene varias URLs, usar la última (las anteriores expiran)
$urlLines = [regex]::Matches($content, 'https://[a-z0-9-]+\.trycloudflare\.com')
if ($urlLines.Count -gt 1) { $url = $urlLines[$urlLines.Count - 1].Value }
Set-Content -Path $urlFile -Value $url -Encoding ASCII -NoNewline

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  TÚNEL LISTO" -ForegroundColor Green
Write-Host "  URL: $url" -ForegroundColor Green
Write-Host "  Guardada en: $urlFile" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

Write-Host ""
Write-Host "IMPORTANTE: esta URL pública es gratuita y cambia en cada reinicio."
Write-Host "Para usarla en el frontend desplegado (Cloudflare Pages/Netlify),"
Write-Host "actualiza la URL y vuelve a desplegar. Localmente no hace falta." -ForegroundColor DarkGray