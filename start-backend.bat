@echo off
title Inventario - Backend (:8500)
chcp 65001 >nul
setlocal

set "ROOT=%~dp0"
set "PY=%ROOT%.venv\Scripts\python.exe"
set "BACKEND=%ROOT%backend"

if not exist "%PY%" (
    echo [ERROR] No existe el entorno virtual: %PY%
    echo Ejecuta:  python -m venv .venv && "%VENV_PY%" -m pip install -r backend\requirements.txt
    pause
    exit /b 1
)

echo [INFO] Liberando puerto 8500 si hay una instancia previa...
powershell -NoProfile -Command "$ErrorActionPreference='SilentlyContinue'; Get-CimInstance Win32_Process -Filter \"Name='python.exe'\" | Where-Object { $_.CommandLine -match 'uvicorn app.main:app' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }; Get-NetTCPConnection -LocalPort 8500 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }"

echo [INFO] Iniciando Backend FastAPI  (DB: SQL Server / InventarioEquipos)
echo          Health: http://localhost:8500/health
echo          Docs:   http://localhost:8500/docs
echo.
cd /d "%BACKEND%"
"%PY%" -m uvicorn app.main:app --host 0.0.0.0 --port 8500