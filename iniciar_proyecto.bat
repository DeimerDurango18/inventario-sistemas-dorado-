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

echo [1/3] Iniciando Backend FastAPI (Puerto 8010)...
start "Inventario - Backend (FastAPI :8010)" cmd /k "cd /d "%BACKEND_DIR%" && "%PYTHON_EXE%" -m uvicorn app.main:app --host 127.0.0.1 --port 8010 --reload"

echo [2/3] Iniciando Frontend Vite + React (Puerto 5173)...
start "Inventario - Frontend (Vite :5173)" cmd /k "cd /d "%FRONTEND_DIR%" && npm run dev -- --host 0.0.0.0 --port 5173"

echo.
echo Esperando que los servicios inicien...
timeout /t 3 /nobreak >nul

echo [3/3] Abriendo aplicacion en el navegador...
start http://localhost:5173

echo.
echo ============================================================
echo  SERVICIOS INICIADOS CORRECTAMENTE:
echo   - Backend API : http://127.0.0.1:8010
echo   - Health Check: http://127.0.0.1:8010/health
echo   - Frontend App: http://localhost:5173
echo.
echo  Para detener el sistema, cierra las ventanas de consola
echo  que se acaban de abrir.
echo ============================================================
echo.
pause