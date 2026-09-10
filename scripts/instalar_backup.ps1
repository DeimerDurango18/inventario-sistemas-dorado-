# ============================================================
# INSTALAR_BACKUP.ps1 - Programa la copia de seguridad diaria
#
# Crea la tarea programada 'InventarioBackup' que ejecuta
# scripts\backup.ps1 todos los días a las 02:00.
#
# Uso:
#   .\scripts\instalar_backup.ps1              (tarea diaria 02:00)
#   .\scripts\instalar_backup.ps1 -Hora "23:30" (hora personalizada)
#   .\scripts\instalar_backup.ps1 -Activar     (habilitar tarea existente)
#   .\scripts\instalar_backup.ps1 -Desactivar  (deshabilitar tarea)
#   .\scripts\instalar_backup.ps1 -Eliminar    (borrar la tarea)
# ============================================================
param(
    [string]$Hora = '02:00',
    [switch]$Activar,
    [switch]$Desactivar,
    [switch]$Eliminar
)

$ErrorActionPreference = 'Stop'
$root  = Split-Path -Parent $PSScriptRoot
$backupScript = Join-Path $root 'scripts\backup.ps1'
$taskName     = 'InventarioBackup'

if (-not (Test-Path $backupScript)) {
    Write-Error "No se encontró $backupScript"
}

if ($Eliminar) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue
    Write-Host "Tarea '$taskName' eliminada." -ForegroundColor Green
    exit 0
}

$task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($Desactivar) {
    Disable-ScheduledTask -TaskName $taskName
    Write-Host "Tarea '$taskName' deshabilitada." -ForegroundColor Green
    exit 0
}
if ($Activar) {
    Enable-ScheduledTask -TaskName $taskName
    Write-Host "Tarea '$taskName' habilitada." -ForegroundColor Green
    exit 0
}

# Credenciales (opcionales) del entorno para backup.ps1.
$cred   = if ($env:DB_USERNAME) { $env:DB_USERNAME } else { '' }
$pass   = if ($env:DB_PASSWORD) { $env:DB_PASSWORD } else { '' }
$sysPrincipal = New-Object System.Security.Principal.WindowsPrincipal([System.Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $sysPrincipal.IsInRole([System.Security.Principal.WindowsBuiltInRole]::Administrator)
$runLevel = if ($isAdmin) { 'Highest' } else { 'Limited' }

$action = New-ScheduledTaskAction -Execute 'powershell.exe' `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$backupScript`"" `
    -WorkingDirectory $root

$trigger = New-ScheduledTaskTrigger -Daily -At $Hora

$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -DontStopOnIdleEnd `
    -ExecutionTimeLimit (New-TimeSpan -Hours 1)

Write-Host "==> Creando tarea programada '$taskName' (diaria $Hora)..." -ForegroundColor Cyan
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings `
    -RunLevel $runLevel -Force | Out-Null

Write-Host "    Tarea creada. Detalle:" -ForegroundColor Green
Write-Host "    - Script:     $backupScript" -ForegroundColor Green
if ($cred -and $pass) {
    Write-Host "    - Credenciales BD: del entorno (si cambian, edítalas en las variables de usuario)" -ForegroundColor Green
} else {
    Write-Host "    - Credenciales BD: defecto de desarrollo (recomendado fijar DB_USERNAME/DB_PASSWORD de usuario)" -ForegroundColor Yellow
}
Write-Host "    - Prueba manual:  .\scripts\backup.ps1" -ForegroundColor Green
Write-Host "    - Logs: en el Historial de la tarea (schtasks /Query /TN $taskName /V)" -ForegroundColor DarkGray