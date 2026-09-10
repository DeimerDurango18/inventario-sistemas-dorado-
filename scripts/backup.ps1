# ============================================================
# BACKUP.ps1 - Copia de seguridad de la base de datos a carpeta local
#
# Hace un BACKUP completo (.bak) con sqlcmd si está disponible; si no,
# vuelca las tablas principales a CSV usando el motor de SQLAlchemy.
# Mantiene las últimas 15 copias (borra las más antiguas).
#
# Uso:  .\scripts\backup.ps1
# Para automatizarlo, asócialo a una tarea programada de Windows.
# ============================================================
$ErrorActionPreference = 'Stop'
$root    = Split-Path -Parent $PSScriptRoot
$backupDir = Join-Path $root 'storage\backups'
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

# ---------- 1) Intentar BACKUP completo con sqlcmd ----------
$sqlcmd = Get-Command sqlcmd -ErrorAction SilentlyContinue
if ($sqlcmd) {
    # Credenciales de la BD: entorno (recomendado) o defecto de desarrollo.
    $user  = if ($env:DB_USERNAME) { $env:DB_USERNAME } else { 'inventario_app' }
    $pass  = if ($env:DB_PASSWORD) { $env:DB_PASSWORD } else { '@Yay0qSOa-@95WSZTCIcIaqe' }
    $db    = if ($env:DB_DATABASE) { $env:DB_DATABASE } else { 'InventarioEquipos' }
    $host_ = if ($env:DB_SERVER)   { $env:DB_SERVER }   else { 'localhost\SQLExpress' }

    $name  = "$(Get-Date -Format 'yyyyMMdd_HHmmss')_InventarioEquipos.bak"
    $dest  = Join-Path $backupDir $name
    Write-Host "==> BACKUP (.bak) de la BD '$db'..." -ForegroundColor Cyan
    & $sqlcmd.Source -S $host_ -U $user -P $pass -C -Q "BACKUP DATABASE [$db] TO DISK = N'$dest' WITH INIT"
    if ($LASTEXITCODE -ne 0) { Write-Error 'Falló el BACKUP con sqlcmd' }
    Write-Host "    Copia creada: $dest" -ForegroundColor Green
} else {
    # ---------- 2) Fallback: volcado CSV con Python ----------
    Write-Host "==> sqlcmd no disponible; volcando CSV con Python..." -ForegroundColor Yellow
    $py = Join-Path $root '.venv\Scripts\python.exe'
    if (-not (Test-Path $py)) { Write-Error 'No existe .venv\Scripts\python.exe' }
    $script = @'
import csv, sys, os
from pathlib import Path
sys.path.insert(0, os.getcwd())
from app.core.database import SessionLocal
import app.models  # noqa
from app.models.equipment import Equipment, Movement
from app.models.acta import Acta, ActaItem
from app.models.maintenance import MaintenanceRecord
from app.models.user import User
from app.models.catalog import Category, Location
from app.models.empresa import Empresa
from app.models.ticket import Ticket
from app.models.adjunto import Adjunto
from app.models.audit import AuditLog

outdir = Path(sys.argv[1])
outdir.mkdir(parents=True, exist_ok=True)
def dump(modelo, nombre):
    db = SessionLocal()
    try:
        filas = db.query(modelo).all()
        cols = [c.name for c in modelo.__table__.columns]
        with open(outdir / f"{nombre}.csv", "w", newline="", encoding="utf-8-sig") as fh:
            w = csv.writer(fh)
            w.writerow(cols)
            for r in filas:
                w.writerow([getattr(r, c) for c in cols])
        print(f"  {nombre}: {len(filas)}")
    finally:
        db.close()

for modelo, nombre in [
    (Equipment, "equipos"), (Movement, "movimientos"), (Acta, "actas"),
    (ActaItem, "acta_items"), (MaintenanceRecord, "mantenimientos"), (User, "usuarios"),
    (Category, "categorias"), (Location, "ubicaciones"), (Empresa, "empresas"),
    (Ticket, "tickets_soporte"), (Adjunto, "adjuntos_equipos"), (AuditLog, "audit_logs"),
]:
    try:
        dump(modelo, nombre)
    except Exception as e:
        print(f"  ! {nombre}: {e}")
'@
    $sub = Join-Path $backupDir "csv_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    Write-Host "==> Volcando tablas a $sub ..." -ForegroundColor Cyan
    & $py -c $script $sub
}

# ---------- 3) Retención: conservar 15 copias más recientes ----------
$all = Get-ChildItem -Path $backupDir -File | Sort-Object LastWriteTime -Descending
$toDelete = $all | Select-Object -Skip 15
foreach ($f in $toDelete) {
    Remove-Item -Path $f.FullName -Force
    Write-Host "    (retención) borrado: $($f.Name)" -ForegroundColor DarkYellow
}

Write-Host ""
Write-Host '============================================' -ForegroundColor Green
Write-Host '  BACKUP COMPLETADO' -ForegroundColor Green
Write-Host "  Carpeta: $backupDir" -ForegroundColor Cyan
Write-Host '============================================' -ForegroundColor Green