@echo off
title Inventario - Frontend (:4123)
chcp 65001 >nul
setlocal

set "ROOT=%~dp0"
set "FRONT=%ROOT%frontend"

if not exist "%FRONT%\node_modules" (
    echo [INFO] Instalando dependencias del frontend (npm install)...
    cd /d "%FRONT%"
    call npm install
    if errorlevel 1 (
        echo [ERROR] Fallo npm install
        pause
        exit /b 1
    )
)

echo [INFO] Liberando puerto 4123 si hay una instancia previa...
powershell -NoProfile -Command "$ErrorActionPreference='SilentlyContinue'; Get-NetTCPConnection -LocalPort 4123 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }"

echo [INFO] Iniciando Frontend Vite + React
echo          App: http://localhost:4123
echo.
cd /d "%FRONT%"
call npm run dev -- --host 0.0.0.0 --port 4123