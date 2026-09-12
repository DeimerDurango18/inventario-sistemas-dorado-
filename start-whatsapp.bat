@echo off
title Inventario - WhatsApp Gateway (:8900)
chcp 65001 >nul
setlocal

set "ROOT=%~dp0"
set "GW=%ROOT%whatsapp-gateway"

if not exist "%GW%\node_modules\whatsapp-web.js" (
    echo [INFO] Instalando dependencias del gateway (npm install)...
    cd /d "%GW%"
    call npm install
    if errorlevel 1 (
        echo [ERROR] Fallo npm install del gateway de WhatsApp
        pause
        exit /b 1
    )
)

echo [INFO] Liberando puerto 8900 si hay una instancia previa...
powershell -NoProfile -Command "$ErrorActionPreference='SilentlyContinue'; Get-NetTCPConnection -LocalPort 8900 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }"

echo [INFO] Iniciando gateway de WhatsApp (whatsapp-web.js)
echo          Health: http://127.0.0.1:8900/health
echo          Si pide QR: escanea con WhatsApp ^> Dispositivos vinculados ^> Vincular un equipo
echo.
cd /d "%GW%"
call node server.js