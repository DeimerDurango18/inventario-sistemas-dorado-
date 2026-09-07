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
$root   = Split-Path -Parent $PSScriptRoot
$cf     = 'C:\Program Files (x86)\cloudflared\cloudflared.exe'
$log    = Join-Path $root 'cloudflared.log'
$urlFile = Join-Path $root 'tunel_url.txt'

if (-not (Test-Path $cf)) {
    Write-Error "No se encontró cloudflared en: $cf"
    exit 1
}

Write-Host "==> Deteniendo túnel anterior (si existe)..." -ForegroundColor Yellow
Get-CimInstance Win32_Process -Filter "Name='cloudflared.exe'" -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Sleep -Milliseconds 500
if (Test-Path $log) { Remove-Item $log -Force }

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

$urlLines = [regex]::Matches($content, 'https://[a-z0-9-]+\.trycloudflare\.com')
if ($urlLines.Count -gt 1) { $url = $urlLines[$urlLines.Count - 1].Value }
Set-Content -Path $urlFile -Value $url -Encoding ASCII -NoNewline

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  TÚNEL LISTO" -ForegroundColor Green
Write-Host "  URL: $url" -ForegroundColor Green
Write-Host "  Guardada en: $urlFile" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan