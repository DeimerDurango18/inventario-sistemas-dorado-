"""Post-procesa una migración de Alembic autogenerada para SQL Server.

Elimina los sa.ForeignKeyConstraint inline de los op.create_table y agrega al
final del upgrade un op.create_foreign_key por cada FK con nombre explícito.
Evita fallos de orden en tablas con dependencias circulares (actas<->movimientos).

Uso:
    python scripts/fix_fk_migration.py <ruta_migracion.py>
"""
import re
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(_ROOT / "backend"))
sys.path.insert(0, str(_ROOT))

from app.core.database import Base  # noqa: E402
from app import models  # noqa: E402, F401


def main(path: str) -> None:
    mpath = Path(path)
    src = mpath.read_text(encoding="utf-8")

    fks: list[tuple[str, str, str, str]] = []
    for tname, table in Base.metadata.tables.items():
        for col in table.columns:
            for fk in col.foreign_keys:
                ref_col = fk.column
                fks.append((tname, col.name, ref_col.table.name, ref_col.name))

    lines = src.splitlines(keepends=True)
    removed = 0
    kept: list[str] = []
    for ln in lines:
        if re.match(r"^\s+sa\.ForeignKeyConstraint\(", ln):
            removed += 1
            continue
        kept.append(ln)
    src = "".join(kept)

    fk_calls = []
    for table, col, ref_table, ref_col in fks:
        name = f"fk_{table}_{col}"
        fk_calls.append(
            f"    op.create_foreign_key('{name}', '{table}', '{ref_table}', ['{col}'], ['{ref_col}'])"
        )
    if fk_calls:
        block = "\n".join(fk_calls)
        marker = "    # ### end Alembic commands ###"
        if marker in src:
            src = src.replace(marker, block + "\n" + marker, 1)
        else:
            src += "\n" + block + "\n"

    mpath.write_text(src, encoding="utf-8")
    print(f"FK inline eliminadas: {removed}; FK explícitas al final: {len(fk_calls)}")


if __name__ == "__main__":
    main(sys.argv[1])