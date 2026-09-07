"""AUDITORIA: tabla audit_logs + garantía en equipos

Revision ID: b2e41f9a7c01
Revises: edec53cba12d
Create Date: 2026-09-07 12:00:00.000000+00:00

Idempotente en SQL Server: como la app usa Base.metadata.create_all al
arrancar, la tabla audit_logs puede existir ya; aquí solo se asegura la
existencia de la tabla, sus FKs y las columnas de garantía en equipos.
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b2e41f9a7c01'
down_revision = 'edec53cba12d'
branch_labels = None
depends_on = None


def _is_mssql() -> bool:
    return op.get_bind().dialect.name == "mssql"


def upgrade() -> None:
    bind = op.get_bind()

    if _is_mssql():
        op.execute("""
            IF OBJECT_ID('audit_logs', 'U') IS NULL
            BEGIN
                CREATE TABLE audit_logs (
                    id INTEGER NOT NULL IDENTITY,
                    empresa_id INTEGER NULL,
                    user_id INTEGER NULL,
                    entity_type VARCHAR(50) NOT NULL,
                    entity_id INTEGER NOT NULL,
                    action VARCHAR(20) NOT NULL,
                    changes VARCHAR(MAX) NULL,
                    created_at DATETIMEOFFSET NULL DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT [pk_audit_logs] PRIMARY KEY (id)
                );
            END
        """)
        op.execute("""
            IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_audit_logs_empresa')
            AND OBJECT_ID('audit_logs', 'U') IS NOT NULL
                ALTER TABLE audit_logs ADD CONSTRAINT [fk_audit_logs_empresa]
                    FOREIGN KEY (empresa_id) REFERENCES empresas (id);
        """)
        op.execute("""
            IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'fk_audit_logs_usuario')
            AND OBJECT_ID('audit_logs', 'U') IS NOT NULL
                ALTER TABLE audit_logs ADD CONSTRAINT [fk_audit_logs_usuario]
                    FOREIGN KEY (user_id) REFERENCES usuarios (id);
        """)
        op.execute("""
            IF COL_LENGTH('equipos', 'fecha_compra') IS NULL
                ALTER TABLE equipos ADD fecha_compra DATETIMEOFFSET NULL;
        """)
        op.execute("""
            IF COL_LENGTH('equipos', 'meses_garantia') IS NULL
                ALTER TABLE equipos ADD meses_garantia INTEGER NULL;
        """)
        bind.execute(sa.text(
            "IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'ix_audit_logs_id') "
            "CREATE INDEX ix_audit_logs_id ON audit_logs (id);"
        ))
    else:
        op.create_table(
            'audit_logs',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('empresa_id', sa.Integer(), nullable=True),
            sa.Column('user_id', sa.Integer(), nullable=True),
            sa.Column('entity_type', sa.String(length=50), nullable=False),
            sa.Column('entity_id', sa.Integer(), nullable=False),
            sa.Column('action', sa.String(length=20), nullable=False),
            sa.Column('changes', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index(op.f('ix_audit_logs_id'), 'audit_logs', ['id'], unique=False)
        op.create_foreign_key('fk_audit_logs_empresa', 'audit_logs', 'empresas', ['empresa_id'], ['id'])
        op.create_foreign_key('fk_audit_logs_usuario', 'audit_logs', 'usuarios', ['user_id'], ['id'])

        op.add_column('equipos', sa.Column('fecha_compra', sa.DateTime(timezone=True), nullable=True))
        op.add_column('equipos', sa.Column('meses_garantia', sa.Integer(), nullable=True))


def downgrade() -> None:
    if _is_mssql():
        op.execute("IF COL_LENGTH('equipos', 'meses_garantia') IS NOT NULL ALTER TABLE equipos DROP COLUMN meses_garantia;")
        op.execute("IF COL_LENGTH('equipos', 'fecha_compra') IS NOT NULL ALTER TABLE equipos DROP COLUMN fecha_compra;")
        op.execute("IF OBJECT_ID('fk_audit_logs_usuario', 'F') IS NOT NULL ALTER TABLE audit_logs DROP CONSTRAINT fk_audit_logs_usuario;")
        op.execute("IF OBJECT_ID('fk_audit_logs_empresa', 'F') IS NOT NULL ALTER TABLE audit_logs DROP CONSTRAINT fk_audit_logs_empresa;")
        op.execute("IF OBJECT_ID('audit_logs', 'U') IS NOT NULL DROP TABLE audit_logs;")
    else:
        op.drop_column('equipos', 'meses_garantia')
        op.drop_column('equipos', 'fecha_compra')
        op.drop_constraint('fk_audit_logs_usuario', 'audit_logs', type_='foreignkey')
        op.drop_constraint('fk_audit_logs_empresa', 'audit_logs', type_='foreignkey')
        op.drop_index(op.f('ix_audit_logs_id'), table_name='audit_logs')
        op.drop_table('audit_logs')