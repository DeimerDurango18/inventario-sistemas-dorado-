# ============================================================
# ETICOS - Detener entorno PUBLICO (tunel + backend)
# Uso:
#   powershell -ExecutionPolicy Bypass -File .\detener.ps1
#   powershell -ExecutionPolicy Bypass -File .\detener.ps1 -Todo   (tambien frontend dev 5173)
# ============================================================
param([switch]$Todo)
$ErrorActionPreference = "Continue"

Write-Host "== Deteniendo tunel cloudflared =="
Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -match "cloudflared" } |
    ForEach-Object {
        Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
        Write-Host "  tunel PID $($_.ProcessId) detenido."
    }

Write-Host "== Deteniendo backend =="
Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -match "InventarioEquiposEticos" -and $_.CommandLine -match "run\.py|app\.main:app|uvicorn" } |
    ForEach-Object {
        Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
        Write-Host "  backend PID $($_.ProcessId) detenido."
    }
Get-NetTCPConnection -LocalPort 8500 -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess |
    ForEach-Object {
        Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
        Write-Host "  puerto 8500 PID $_ detenido."
    }

if ($Todo) {
    Write-Host "== Deteniendo frontend dev (5173) =="
    Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess |
        ForEach-Object {
            Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue
            Write-Host "  puerto 5173 PID $_ detenido."
        }
}

Write-Host "Listo. El backend publico quedo caido (Pages sigue sirviendo el frontend)."