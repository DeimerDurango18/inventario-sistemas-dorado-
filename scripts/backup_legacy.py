"""Respaldo de datos de la BD InventarioEquipos (esquema anterior).

Exporta cada tabla a CSV con cabeceras en backend/storage/backups/csv y,
si el usuario tiene permiso, intenta un BACKUP DATABASE (.bak).

Uso:
    python scripts/backup_legacy.py

El respaldo se hace ANTES de regenerar el esquema con el remaster.
"""
import csv
import os
import sys
from datetime import datetime
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(_ROOT / "backend"))
sys.path.insert(0, str(_ROOT))

from app.core.config import settings  # noqa: E402

BACKUP_DIR = Path(settings.storage_path) / "backups"
CSV_DIR = BACKUP_DIR / "csv"
CSV_DIR.mkdir(parents=True, exist_ok=True)


def _casted_select(cur, table: str) -> str:
    """SELECT que castea columnas datetimeoffset a NVARCHAR (pyodbc no las lee)."""
    cur.execute(
        """
        SELECT c.name, t.user_type_id
        FROM sys.columns c
        JOIN sys.types t ON c.user_type_id = t.user_type_id
        JOIN sys.tables tb ON c.object_id = tb.object_id
        WHERE tb.name = ?
        """,
        table,
    )
    cols = cur.fetchall()
    parts = []
    for name, type_id in cols:
        if int(type_id) == 43:  # datetimeoffset
            parts.append(f"CAST([{name}] AS NVARCHAR(64)) AS [{name}]")
        else:
            parts.append(f"[{name}]")
    return "SELECT " + ", ".join(parts) + f" FROM [{table}]"


def main() -> None:
    import pyodbc

    encrypt = "yes" if int(settings.db_encrypt) else "no"
    server = f"{settings.db_server},{settings.db_port}" if settings.db_port else settings.db_server
    cs = (
        f"DRIVER={{{settings.db_driver}}};SERVER={server};DATABASE={settings.db_database};"
        f"UID={settings.db_username};PWD={settings.db_password};Encrypt={encrypt};"
        f"TrustServerCertificate=yes"
    )
    cn = pyodbc.connect(cs, timeout=15)
    cn.autocommit = True
    cur = cn.cursor()

    cur.execute(
        "SELECT name FROM sys.tables WHERE name NOT IN ('sysdiagrams', 'alembic_version') ORDER BY name"
    )
    tables = [r[0] for r in cur.fetchall()]
    if not tables:
        print("No hay tablas para respaldar.")
        return

    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    # 1) BACKUP DATABASE nativo (.bak) en el directorio de backup de la instancia
    #    (el servicio SQL Server solo escribe en sus propias rutas).
    from shutil import copy2

    def _server_call(sql: str, *params, query: bool = False):
        c2 = pyodbc.connect(cs, timeout=15)
        c2.autocommit = True
        cur2 = c2.cursor()
        r = cur2.execute(sql, *params).fetchone() if query else cur2.execute(sql, *params).rowcount
        c2.close()
        return r

    default_bak = str(BACKUP_DIR / "sqlserver_backups")
    try:
        row = _server_call("SELECT CONVERT(nvarchar(500), SERVERPROPERTY('InstanceDefaultBackupPath'))", query=True)
        if row and row[0]:
            default_bak = row[0]
    except Exception:
        pass
    Path(default_bak).mkdir(parents=True, exist_ok=True)
    server_bak = Path(default_bak) / f"InventarioEquipos_{stamp}.bak"
    try:
        _server_call(f"BACKUP DATABASE [{settings.db_database}] TO DISK = ? WITH FORMAT, INIT", str(server_bak))
        print(f"[OK] Backup completo -> {server_bak}")
        try:
            local_bak = BACKUP_DIR / server_bak.name
            copy2(str(server_bak), str(local_bak))
            print(f"[OK] Copia local -> {local_bak}")
        except Exception as e:
            print(f"[AVISO] No se pudo copiar localmente: {e}")
    except Exception as e:
        print(f"[AVISO] No se pudo crear .bak: {e}")

    # 2) Exportar cada tabla a CSV (copia de datos)
    n = 0
    for t in tables:
        out = CSV_DIR / f"{t}.csv"
        try:
            cur.execute(_casted_select(cur, t))
            cols = [d[0] for d in cur.description]
            rows = cur.fetchall()
            with out.open("w", newline="", encoding="utf-8-sig") as fh:
                w = csv.writer(fh)
                w.writerow(cols)
                for r in rows:
                    w.writerow(["" if c is None else c for c in r])
            n += 1
            print(f"[OK] {t}: {len(rows)} filas -> {out.name}")
        except Exception as e:
            print(f"[ERROR] {t}: {e}")
    print(f"\nRespaldo finalizado: {n} tablas exportadas a {CSV_DIR}")


if __name__ == "__main__":
    main()