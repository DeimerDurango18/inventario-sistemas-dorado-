@echo off
title Inventario - Tunel Cloudflare
chcp 65001 >nul
setlocal

set "ROOT=%~dp0"

if exist "%ROOT%scripts\tunel.ps1" (
    powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%scripts\tunel.ps1" -Ventana
) else (
    echo [ERROR] No se encontro scripts\tunel.ps1
    pause
    exit /b 1
)