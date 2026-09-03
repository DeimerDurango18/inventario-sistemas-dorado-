@echo off
title Iniciar Inventario de Equipos
chcp 65001 >nul
color 0B

echo ============================================================
echo         INICIANDO SISTEMA DE INVENTARIO Y ACTAS
echo ============================================================
echo.

set "ROOT_DIR=%~dp0"
set "BACKEND_DIR=%ROOT_DIR%backend"
set "FRONTEND_DIR=%ROOT_DIR%frontend"
set "PYTHON_EXE=%ROOT_DIR%.venv\Scripts\python.exe"

:: Verificar que exista Python en el entorno virtual
if not exist "%PYTHON_EXE%" (
    echo [ERROR] No se encontro el entorno virtual en:
    echo "%PYTHON_EXE%"
    echo Por favor crea el entorno virtual antes de continuar.
    pause
    exit /b 1
)

:: ------------------------------------------------------------------
:: El backend se conecta a SQL Server (DB_ENGINE=mssql) con la base
:: InventarioEquipos ya migrada (alembic upgrade head) y con el usuario
:: administrador creado (admin@sistemasbogota.com).
:: Para cambiar a modo desarrollo sqlite, cambia mssql por sqlite.
:: Leer DB_ENGINE del archivo .env si está configurado, o usar mssql por defecto
set "DB_ENGINE=mssql"
if exist "%ROOT_DIR%.env" (
    for /f "usebackq tokens=1,2 delims==" %%A in ("%ROOT_DIR%.env") do (
        if /i "%%A"=="DB_ENGINE" set "DB_ENGINE=%%B"
    )
)

:: Liberar el puerto 8010 y detener cualquier instancia previa del backend
:: (evita el error 500 de login y el conflicto "direccion ya en uso").
powershell -NoProfile -Command "$ErrorActionPreference='SilentlyContinue'; Get-CimInstance Win32_Process -Filter \"Name='python.exe'\" | Where-Object { $_.CommandLine -match 'uvicorn app.main:app' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }; netstat -ano | Select-String ':8010.*LISTENING' | ForEach-Object { $p = ($_ -split '\s+')[-1]; if ($p -match '^\d+$') { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue } }"

echo [1/3] Iniciando Backend FastAPI (Puerto 8010, BD=%DB_ENGINE%)...
start "Inventario - Backend (FastAPI :8010)" cmd /k "set DB_ENGINE=%DB_ENGINE% && cd /d "%BACKEND_DIR%" && "%PYTHON_EXE%" -m uvicorn app.main:app --host 127.0.0.1 --port 8010"

echo [2/3] Iniciando Frontend Vite + React (Puerto 5173)...
start "Inventario - Frontend (Vite :5173)" cmd /k "cd /d "%FRONTEND_DIR%" && npm run dev -- --host 0.0.0.0 --port 5173"

echo.
echo Esperando que los servicios inicien...
timeout /t 4 /nobreak >nul

echo [3/3] Abriendo aplicacion en el navegador...
start http://localhost:5173

echo.
echo ============================================================
echo  SERVICIOS INICIADOS CORRECTAMENTE:
echo   - Backend API : http://127.0.0.1:8010
echo   - Health Check: http://127.0.0.1:8010/health
echo   - Frontend App: http://localhost:5173
echo.
echo  DATOS DE ACCESO (BD = SQL Server / InventarioEquipos):
echo   - Correo:     admin@sistemasbogota.com
echo   - Contrasena: Admin2026!
echo.
echo  Para detener el sistema, cierra las ventanas de consola
echo  que se acaban de abrir.
echo ============================================================
echo.
pause