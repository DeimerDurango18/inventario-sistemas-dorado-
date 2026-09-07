"""Puntos de venta, instalaciones, atenciones y vinculo de mantenimiento a punto

Revision ID: d4a1b2c3e6f7
Revises: c3f7a1b2d4e5
Create Date: 2026-09-07 16:00:00.000000+00:00

Idempotente en SQL Server: crea las tablas puntos_venta, instalaciones y
atenciones_punto solo si no existen, añade sus FKs y la columna punto_id en
mantenimientos solo si falta.
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd4a1b2c3e6f7'
down_revision = 'c3f7a1b2d4e5'
branch_labels = None
depends_on = None


def _is_mssql() -> bool:
    return op.get_bind().dialect.name == "mssql"


def upgrade() -> None:
    if _is_mssql():
        op.execute("""
            IF OBJECT_ID('puntos_venta', 'U') IS NULL
            BEGIN
                CREATE TABLE puntos_venta (
                    id INTEGER NOT NULL IDENTITY,
                    empresa_id INTEGER NULL,
                    nombre VARCHAR(200) NOT NULL,
                    tipo VARCHAR(30) NULL DEFAULT 'drogueria',
                    ciudad VARCHAR(150) NULL,
                    direccion VARCHAR(300) NULL,
                    telefono VARCHAR(50) NULL,
                    responsable VARCHAR(150) NULL,
                    estado VARCHAR(20) NULL DEFAULT 'activo',
                    created_at DATETIMEOFFSET NULL DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT [pk_puntos_venta] PRIMARY KEY (id)
                );
            END
        """)
        op.execute("""
            IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_puntos_empresa')
            AND OBJECT_ID('puntos_venta', 'U') IS NOT NULL
                ALTER TABLE puntos_venta ADD CONSTRAINT [fk_puntos_empresa]
                    FOREIGN KEY (empresa_id) REFERENCES empresas (id);
        """)

        op.execute("""
            IF OBJECT_ID('instalaciones', 'U') IS NULL
            BEGIN
                CREATE TABLE instalaciones (
                    id INTEGER NOT NULL IDENTITY,
                    empresa_id INTEGER NULL,
                    punto_id INTEGER NOT NULL,
                    equipo_id INTEGER NOT NULL,
                    software VARCHAR(300) NULL,
                    fecha_instalacion DATETIMEOFFSET NULL,
                    estado VARCHAR(20) NULL DEFAULT 'activa',
                    observaciones VARCHAR(MAX) NULL,
                    created_at DATETIMEOFFSET NULL DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT [pk_instalaciones] PRIMARY KEY (id)
                );
            END
        """)
        op.execute("""
            IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_inst_punto')
            AND OBJECT_ID('instalaciones', 'U') IS NOT NULL
                ALTER TABLE instalaciones ADD CONSTRAINT [fk_inst_punto]
                    FOREIGN KEY (punto_id) REFERENCES puntos_venta (id);
        """)
        op.execute("""
            IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_inst_equipo')
            AND OBJECT_ID('instalaciones', 'U') IS NOT NULL
                ALTER TABLE instalaciones ADD CONSTRAINT [fk_inst_equipo]
                    FOREIGN KEY (equipo_id) REFERENCES equipos (id);
        """)
        op.execute("""
            IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_inst_empresa')
            AND OBJECT_ID('instalaciones', 'U') IS NOT NULL
                ALTER TABLE instalaciones ADD CONSTRAINT [fk_inst_empresa]
                    FOREIGN KEY (empresa_id) REFERENCES empresas (id);
        """)

        op.execute("""
            IF OBJECT_ID('atenciones_punto', 'U') IS NULL
            BEGIN
                CREATE TABLE atenciones_punto (
                    id INTEGER NOT NULL IDENTITY,
                    empresa_id INTEGER NULL,
                    punto_id INTEGER NOT NULL,
                    ticket_id INTEGER NULL,
                    fecha DATETIMEOFFSET NULL DEFAULT CURRENT_TIMESTAMP,
                    tipo VARCHAR(30) NULL DEFAULT 'soporte',
                    descripcion VARCHAR(MAX) NULL,
                    tecnico VARCHAR(150) NULL,
                    resultado VARCHAR(300) NULL,
                    created_at DATETIMEOFFSET NULL DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT [pk_atenciones_punto] PRIMARY KEY (id)
                );
            END
        """)
        op.execute("""
            IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_atenc_punto')
            AND OBJECT_ID('atenciones_punto', 'U') IS NOT NULL
                ALTER TABLE atenciones_punto ADD CONSTRAINT [fk_atenc_punto]
                    FOREIGN KEY (punto_id) REFERENCES puntos_venta (id);
        """)
        op.execute("""
            IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_atenc_ticket')
            AND OBJECT_ID('atenciones_punto', 'U') IS NOT NULL
                ALTER TABLE atenciones_punto ADD CONSTRAINT [fk_atenc_ticket]
                    FOREIGN KEY (ticket_id) REFERENCES tickets_soporte (id);
        """)
        op.execute("""
            IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_atenc_empresa')
            AND OBJECT_ID('atenciones_punto', 'U') IS NOT NULL
                ALTER TABLE atenciones_punto ADD CONSTRAINT [fk_atenc_empresa]
                    FOREIGN KEY (empresa_id) REFERENCES empresas (id);
        """)

        op.execute("""
            IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('mantenimientos') AND name = 'punto_id')
                ALTER TABLE mantenimientos ADD punto_id INTEGER NULL;
        """)
        op.execute("""
            IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_mant_punto')
            AND OBJECT_ID('mantenimientos', 'U') IS NOT NULL
                ALTER TABLE mantenimientos ADD CONSTRAINT [fk_mant_punto]
                    FOREIGN KEY (punto_id) REFERENCES puntos_venta (id);
        """)
    else:
        op.create_table(
            "puntos_venta",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("empresa_id", sa.Integer(), nullable=True),
            sa.Column("nombre", sa.String(200), nullable=False),
            sa.Column("tipo", sa.String(30), nullable=True),
            sa.Column("ciudad", sa.String(150), nullable=True),
            sa.Column("direccion", sa.String(300), nullable=True),
            sa.Column("telefono", sa.String(50), nullable=True),
            sa.Column("responsable", sa.String(150), nullable=True),
            sa.Column("estado", sa.String(20), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        )
        op.create_table(
            "instalaciones",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("empresa_id", sa.Integer(), nullable=True),
            sa.Column("punto_id", sa.Integer(), nullable=False),
            sa.Column("equipo_id", sa.Integer(), nullable=False),
            sa.Column("software", sa.String(300), nullable=True),
            sa.Column("fecha_instalacion", sa.DateTime(timezone=True), nullable=True),
            sa.Column("estado", sa.String(20), nullable=True),
            sa.Column("observaciones", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        )
        op.create_table(
            "atenciones_punto",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("empresa_id", sa.Integer(), nullable=True),
            sa.Column("punto_id", sa.Integer(), nullable=False),
            sa.Column("ticket_id", sa.Integer(), nullable=True),
            sa.Column("fecha", sa.DateTime(timezone=True), nullable=True),
            sa.Column("tipo", sa.String(30), nullable=True),
            sa.Column("descripcion", sa.Text(), nullable=True),
            sa.Column("tecnico", sa.String(150), nullable=True),
            sa.Column("resultado", sa.String(300), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        )
        op.add_column("mantenimientos", sa.Column("punto_id", sa.Integer(), nullable=True))


def downgrade() -> None:
    if _is_mssql():
        op.execute("DROP TABLE IF EXISTS atenciones_punto;")
        op.execute("DROP TABLE IF EXISTS instalaciones;")
        op.execute("DROP TABLE IF EXISTS puntos_venta;")
        op.execute("""
            IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('mantenimientos') AND name = 'punto_id')
                ALTER TABLE mantenimientos DROP COLUMN punto_id;
        """)
    else:
        op.drop_table("atenciones_punto")
        op.drop_table("instalaciones")
        op.drop_table("puntos_venta")
        op.drop_column("mantenimientos", "punto_id")
