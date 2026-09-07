"""Soporte técnico, adjuntos, firma de actas y periodicidad de mantenimientos

Revision ID: c3f7a1b2d4e5
Revises: b2e41f9a7c01
Create Date: 2026-09-07 14:00:00.000000+00:00

Idempotente en SQL Server: asegura existencia de tablas tickets_soporte y
adjuntos_equipos, sus FKs, y las nuevas columnas (firma en actas y
periodicidad en mantenimientos) solo si faltan.
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c3f7a1b2d4e5'
down_revision = 'b2e41f9a7c01'
branch_labels = None
depends_on = None


def _is_mssql() -> bool:
    return op.get_bind().dialect.name == "mssql"


def upgrade() -> None:
    bind = op.get_bind()

    if _is_mssql():
        op.execute("""
            IF OBJECT_ID('tickets_soporte', 'U') IS NULL
            BEGIN
                CREATE TABLE tickets_soporte (
                    id INTEGER NOT NULL IDENTITY,
                    empresa_id INTEGER NULL,
                    equipo_id INTEGER NULL,
                    ubicacion_id INTEGER NULL,
                    titulo VARCHAR(150) NOT NULL,
                    descripcion VARCHAR(MAX) NULL,
                    prioridad VARCHAR(20) NULL DEFAULT 'media',
                    estado VARCHAR(20) NULL DEFAULT 'abierto',
                    tecnico VARCHAR(150) NULL,
                    fecha_visita DATETIMEOFFSET NULL,
                    fecha_resolucion DATETIMEOFFSET NULL,
                    creado_por VARCHAR(150) NULL,
                    created_at DATETIMEOFFSET NULL DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT [pk_tickets_soporte] PRIMARY KEY (id)
                );
            END
        """)
        op.execute("""
            IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_tickets_equipo')
            AND OBJECT_ID('tickets_soporte', 'U') IS NOT NULL
                ALTER TABLE tickets_soporte ADD CONSTRAINT [fk_tickets_equipo]
                    FOREIGN KEY (equipo_id) REFERENCES equipos (id);
        """)
        op.execute("""
            IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_tickets_ubicacion')
            AND OBJECT_ID('tickets_soporte', 'U') IS NOT NULL
                ALTER TABLE tickets_soporte ADD CONSTRAINT [fk_tickets_ubicacion]
                    FOREIGN KEY (ubicacion_id) REFERENCES ubicaciones (id);
        """)
        op.execute("""
            IF OBJECT_ID('adjuntos_equipos', 'U') IS NULL
            BEGIN
                CREATE TABLE adjuntos_equipos (
                    id INTEGER NOT NULL IDENTITY,
                    empresa_id INTEGER NULL,
                    tipo VARCHAR(20) NOT NULL,
                    equipo_id INTEGER NULL,
                    registro_id INTEGER NULL,
                    ticket_id INTEGER NULL,
                    archivo VARCHAR(300) NOT NULL,
                    descripcion VARCHAR(150) NULL,
                    creado_por VARCHAR(150) NULL,
                    created_at DATETIMEOFFSET NULL DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT [pk_adjuntos_equipos] PRIMARY KEY (id)
                );
            END
        """)
        op.execute("""
            IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_adjuntos_equipo')
            AND OBJECT_ID('adjuntos_equipos', 'U') IS NOT NULL
                ALTER TABLE adjuntos_equipos ADD CONSTRAINT [fk_adjuntos_equipo]
                    FOREIGN KEY (equipo_id) REFERENCES equipos (id);
        """)
        op.execute("""
            IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_adjuntos_ticket')
            AND OBJECT_ID('adjuntos_equipos', 'U') IS NOT NULL
                ALTER TABLE adjuntos_equipos ADD CONSTRAINT [fk_adjuntos_ticket]
                    FOREIGN KEY (ticket_id) REFERENCES tickets_soporte (id);
        """)
        op.execute("""
            IF COL_LENGTH('actas', 'firmado_por') IS NULL
                ALTER TABLE actas ADD firmado_por VARCHAR(150) NULL;
        """)
        op.execute("""
            IF COL_LENGTH('actas', 'documento_firma') IS NULL
                ALTER TABLE actas ADD documento_firma VARCHAR(50) NULL;
        """)
        op.execute("""
            IF COL_LENGTH('actas', 'fecha_firma') IS NULL
                ALTER TABLE actas ADD fecha_firma DATETIMEOFFSET NULL;
        """)
        op.execute("""
            IF COL_LENGTH('mantenimientos', 'periodicidad') IS NULL
                ALTER TABLE mantenimientos ADD periodicidad VARCHAR(20) NULL;
        """)
        bind.execute(sa.text(
            "IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ix_tickets_soporte_id') "
            "CREATE INDEX ix_tickets_soporte_id ON tickets_soporte (id);"
        ))
        bind.execute(sa.text(
            "IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ix_adjuntos_equipos_id') "
            "CREATE INDEX ix_adjuntos_equipos_id ON adjuntos_equipos (id);"
        ))
    else:
        op.create_table(
            'tickets_soporte',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('empresa_id', sa.Integer(), nullable=True),
            sa.Column('equipo_id', sa.Integer(), nullable=True),
            sa.Column('ubicacion_id', sa.Integer(), nullable=True),
            sa.Column('titulo', sa.String(length=150), nullable=False),
            sa.Column('descripcion', sa.Text(), nullable=True),
            sa.Column('prioridad', sa.String(length=20), nullable=True),
            sa.Column('estado', sa.String(length=20), nullable=True),
            sa.Column('tecnico', sa.String(length=150), nullable=True),
            sa.Column('fecha_visita', sa.DateTime(timezone=True), nullable=True),
            sa.Column('fecha_resolucion', sa.DateTime(timezone=True), nullable=True),
            sa.Column('creado_por', sa.String(length=150), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index(op.f('ix_tickets_soporte_id'), 'tickets_soporte', ['id'], unique=False)
        op.create_foreign_key('fk_tickets_equipo', 'tickets_soporte', 'equipos', ['equipo_id'], ['id'])
        op.create_foreign_key('fk_tickets_ubicacion', 'tickets_soporte', 'ubicaciones', ['ubicacion_id'], ['id'])

        op.create_table(
            'adjuntos_equipos',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('empresa_id', sa.Integer(), nullable=True),
            sa.Column('tipo', sa.String(length=20), nullable=False),
            sa.Column('equipo_id', sa.Integer(), nullable=True),
            sa.Column('registro_id', sa.Integer(), nullable=True),
            sa.Column('ticket_id', sa.Integer(), nullable=True),
            sa.Column('archivo', sa.String(length=300), nullable=False),
            sa.Column('descripcion', sa.String(length=150), nullable=True),
            sa.Column('creado_por', sa.String(length=150), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index(op.f('ix_adjuntos_equipos_id'), 'adjuntos_equipos', ['id'], unique=False)
        op.create_foreign_key('fk_adjuntos_equipo', 'adjuntos_equipos', 'equipos', ['equipo_id'], ['id'])
        op.create_foreign_key('fk_adjuntos_ticket', 'adjuntos_equipos', 'tickets_soporte', ['ticket_id'], ['id'])

        op.add_column('actas', sa.Column('firmado_por', sa.String(length=150), nullable=True))
        op.add_column('actas', sa.Column('documento_firma', sa.String(length=50), nullable=True))
        op.add_column('actas', sa.Column('fecha_firma', sa.DateTime(timezone=True), nullable=True))
        op.add_column('mantenimientos', sa.Column('periodicidad', sa.String(length=20), nullable=True))


def downgrade() -> None:
    if _is_mssql():
        op.execute("IF COL_LENGTH('mantenimientos', 'periodicidad') IS NOT NULL ALTER TABLE mantenimientos DROP COLUMN periodicidad;")
        op.execute("IF COL_LENGTH('actas', 'fecha_firma') IS NOT NULL ALTER TABLE actas DROP COLUMN fecha_firma;")
        op.execute("IF COL_LENGTH('actas', 'documento_firma') IS NOT NULL ALTER TABLE actas DROP COLUMN documento_firma;")
        op.execute("IF COL_LENGTH('actas', 'firmado_por') IS NOT NULL ALTER TABLE actas DROP COLUMN firmado_por;")
        op.execute("IF OBJECT_ID('fk_adjuntos_ticket', 'F') IS NOT NULL ALTER TABLE adjuntos_equipos DROP CONSTRAINT fk_adjuntos_ticket;")
        op.execute("IF OBJECT_ID('fk_adjuntos_equipo', 'F') IS NOT NULL ALTER TABLE adjuntos_equipos DROP CONSTRAINT fk_adjuntos_equipo;")
        op.execute("IF OBJECT_ID('adjuntos_equipos', 'U') IS NOT NULL DROP TABLE adjuntos_equipos;")
        op.execute("IF OBJECT_ID('fk_tickets_ubicacion', 'F') IS NOT NULL ALTER TABLE tickets_soporte DROP CONSTRAINT fk_tickets_ubicacion;")
        op.execute("IF OBJECT_ID('fk_tickets_equipo', 'F') IS NOT NULL ALTER TABLE tickets_soporte DROP CONSTRAINT fk_tickets_equipo;")
        op.execute("IF OBJECT_ID('tickets_soporte', 'U') IS NOT NULL DROP TABLE tickets_soporte;")
    else:
        op.drop_column('mantenimientos', 'periodicidad')
        op.drop_column('actas', 'fecha_firma')
        op.drop_column('actas', 'documento_firma')
        op.drop_column('actas', 'firmado_por')
        op.drop_constraint('fk_adjuntos_ticket', 'adjuntos_equipos', type_='foreignkey')
        op.drop_constraint('fk_adjuntos_equipo', 'adjuntos_equipos', type_='foreignkey')
        op.drop_index(op.f('ix_adjuntos_equipos_id'), table_name='adjuntos_equipos')
        op.drop_table('adjuntos_equipos')
        op.drop_constraint('fk_tickets_ubicacion', 'tickets_soporte', type_='foreignkey')
        op.drop_constraint('fk_tickets_equipo', 'tickets_soporte', type_='foreignkey')
        op.drop_index(op.f('ix_tickets_soporte_id'), table_name='tickets_soporte')
        op.drop_table('tickets_soporte')