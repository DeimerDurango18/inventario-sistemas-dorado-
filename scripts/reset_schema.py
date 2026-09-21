"""Regeneración del esquema de la BD InventarioEquipos.

Elimina las tablas del esquema anterior y deja la BD vacía para que Alembic cree
el nuevo modelo. NO ejecutar sin haber respaldado los datos (scripts/backup_legacy.py).

Uso:
    python scripts/reset_schema.py --yes
"""
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(_ROOT / "backend"))
sys.path.insert(0, str(_ROOT))

from app.core.config import settings  # noqa: E402


def main() -> None:
    if len(sys.argv) < 2 or sys.argv[1] != "--yes":
        print("ABORTADO: usa --yes para confirmar la regeneración.")
        sys.exit(1)

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
        "SELECT COUNT(*) FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id "
        "WHERE t.is_ms_shipped = 0 AND t.name <> 'sysdiagrams'"
    )
    total = cur.fetchone()[0]
    if total == 0:
        print("La BD ya está vacía. Nada que hacer.")
        return

    print(f"Tablas a eliminar: {total}")
    cur.execute(
        """
        DECLARE @sql NVARCHAR(MAX) = N''
        SELECT @sql += N'ALTER TABLE [' + OBJECT_SCHEMA_NAME(fk.parent_object_id) + N'].['
            + OBJECT_NAME(fk.parent_object_id) + N'] DROP CONSTRAINT [' + fk.name + N'];' + char(10)
        FROM sys.foreign_keys fk
        EXEC sp_executesql @sql
        """
    )
    cur.execute(
        """
        DECLARE @sql NVARCHAR(MAX) = N''
        SELECT @sql += N'DROP TABLE [' + s.name + N'].[' + t.name + N'];' + char(10)
        FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id
        WHERE t.is_ms_shipped = 0 AND t.name <> 'sysdiagrams'
        EXEC sp_executesql @sql
        """
    )
    print("Tablas eliminadas. BD lista para Alembic.")


if __name__ == "__main__":
    main()