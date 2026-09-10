"""Añadir índices únicos filtrados para folio (equipos), numero (actas y actas_mantenimiento)
con manejo correcto de empresa_id IS NULL en SQL Server."""

revision = "a1b2c3d4e5f6"
down_revision = "d4a1b2c3e6f7"
branch_labels = None
depends_on = None

from alembic import op
import sqlalchemy as sa


def upgrade() -> None:
    dialect = op.get_bind().dialect.name

    if dialect == "mssql":
        # --- Equipos ---
        op.execute(
            "IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'uq_equipos_folio_null') "
            "CREATE UNIQUE INDEX uq_equipos_folio_null ON equipos(folio) WHERE empresa_id IS NULL"
        )
        op.execute(
            "IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'uq_equipos_folio_empresa2') "
            "CREATE UNIQUE INDEX uq_equipos_folio_empresa2 ON equipos(folio, empresa_id) WHERE empresa_id IS NOT NULL"
        )
        # --- Actas ---
        op.execute(
            "IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'uq_actas_numero_null') "
            "CREATE UNIQUE INDEX uq_actas_numero_null ON actas(numero) WHERE empresa_id IS NULL"
        )
        op.execute(
            "IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'uq_actas_numero_empresa2') "
            "CREATE UNIQUE INDEX uq_actas_numero_empresa2 ON actas(numero, empresa_id) WHERE empresa_id IS NOT NULL"
        )
        # --- Actas de mantenimiento ---
        op.execute(
            "IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'uq_actasm_numero_null') "
            "CREATE UNIQUE INDEX uq_actasm_numero_null ON actas_mantenimiento(numero) WHERE empresa_id IS NULL"
        )
        op.execute(
            "IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'uq_actasm_numero_empresa') "
            "CREATE UNIQUE INDEX uq_actasm_numero_empresa ON actas_mantenimiento(numero, empresa_id) WHERE empresa_id IS NOT NULL"
        )


def downgrade() -> None:
    dialect = op.get_bind().dialect.name

    if dialect == "mssql":
        drops = [
            ("uq_equipos_folio_null",        "equipos"),
            ("uq_equipos_folio_empresa2",     "equipos"),
            ("uq_actas_numero_null",          "actas"),
            ("uq_actas_numero_empresa2",      "actas"),
            ("uq_actasm_numero_null",         "actas_mantenimiento"),
            ("uq_actasm_numero_empresa",      "actas_mantenimiento"),
        ]
        for idx_name, table in drops:
            op.execute(f"DROP INDEX IF EXISTS {idx_name} ON {table}")
