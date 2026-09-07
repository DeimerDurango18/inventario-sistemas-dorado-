@echo off
title Desplegar Inventario a Produccion
chcp 65001 >nul
color 0B

echo ============================================================
echo   DESPLEGAR A PRODUCCION  -  https://inventario-equipos.pages.dev
echo ============================================================
echo.

set "ROOT_DIR=%~dp0"
set "PYTHON_EXE=%ROOT_DIR%.venv\Scripts\python.exe"
set "CLOUDFLARED=C:\Program Files (x86)\cloudflared\cloudflared.exe"

:: ------------------------------------------------------------------
::  1) Verificaciones previas
:: ------------------------------------------------------------------
if not exist "%PYTHON_EXE%" goto :sin_venv
if not exist "%CLOUDFLARED%" goto :sin_tunel
if not exist "%ROOT_DIR%frontend\node_modules" goto :instalar_npm

set "TOKEN_CF="
for /f "usebackq tokens=1,* delims==" %%A in (`powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable('CLOUDFLARE_API_TOKEN','User')"`) do set "TOKEN_CF=%%B"
if not defined TOKEN_CF goto :sin_token
set "CLOUDFLARE_API_TOKEN=%TOKEN_CF%"

:continuar
echo [OK] Verificaciones completas.
echo.

:: ------------------------------------------------------------------
::  2) Pipeline completo: backend + tunel + deploy a Pages
:: ------------------------------------------------------------------
powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT_DIR%scripts\arrancar_local.ps1" -Produccion
set "RESULTADO=%ERRORLEVEL%"

echo.
echo ============================================================
if %RESULTADO%==0 (
    echo  APP EN PRODUCCION:  https://inventario-equipos.pages.dev
) else (
    echo  HUBO PROBLEMAS - revisa los mensajes de arriba.
    echo  Si el sitio no sirve la API vigente, desactiva el
    echo  auto-deploy en Cloudflare Pages Settings -^> Builds.
)
echo ============================================================
echo.
pause
exit /b %RESULTADO%

:sin_venv
echo [ERROR] No existe el entorno virtual.
echo         %PYTHON_EXE%
echo         Crealo con:  python -m venv "%ROOT_DIR%.venv"
goto :error

:sin_tunel
echo [ERROR] No se encontro cloudflared en:
echo         %CLOUDFLARED%
echo         Instalalo de:  https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
goto :error

:sin_token
echo [ERROR] Falta la variable de entorno CLOUDFLARE_API_TOKEN.
echo         Para configurarla:  setx CLOUDFLARE_API_TOKEN "tu_token"
goto :error

:instalar_npm
echo [INFO] Instalando dependencias del frontend...
pushd "%ROOT_DIR%frontend"
call npm install
popd
if errorlevel 1 (
    echo [ERROR] npm install fallo.
    goto :error
)
echo [OK] Dependencias del frontend listas.
goto :continuar

:error