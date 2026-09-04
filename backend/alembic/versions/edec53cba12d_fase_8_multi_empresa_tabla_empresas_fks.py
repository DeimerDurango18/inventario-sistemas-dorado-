"""FASE 8: multi-empresa (tabla empresas + FKs)

Revision ID: edec53cba12d
Revises: f18b24d6c3e2
Create Date: 2026-09-04 13:05:10.977348+00:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'edec53cba12d'
down_revision = 'f18b24d6c3e2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Tabla empresas
    op.create_table(
        'empresas',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('nombre', sa.String(length=200), nullable=False),
        sa.Column('nit', sa.String(length=50), nullable=True),
        sa.Column('telefono', sa.String(length=50), nullable=True),
        sa.Column('direccion', sa.String(length=300), nullable=True),
        sa.Column('logo_path', sa.String(length=300), nullable=True),
        sa.Column('activo', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('nit', name='uq_empresas_nit'),
    )
    op.create_index(op.f('ix_empresas_id'), 'empresas', ['id'], unique=False)

    # FKs empresa_id en todas las tablas
    op.add_column('equipos', sa.Column('empresa_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_equipos_empresa', 'equipos', 'empresas', ['empresa_id'], ['id'])
    op.create_unique_constraint('uq_folio_empresa', 'equipos', ['folio', 'empresa_id'])

    op.add_column('movimientos', sa.Column('empresa_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_movimientos_empresa', 'movimientos', 'empresas', ['empresa_id'], ['id'])

    op.add_column('actas', sa.Column('empresa_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_actas_empresa', 'actas', 'empresas', ['empresa_id'], ['id'])
    op.create_unique_constraint('uq_numero_empresa', 'actas', ['numero', 'empresa_id'])

    op.add_column('acta_items', sa.Column('empresa_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_acta_items_empresa', 'acta_items', 'empresas', ['empresa_id'], ['id'])

    op.add_column('mantenimientos', sa.Column('empresa_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_mantenimientos_empresa', 'mantenimientos', 'empresas', ['empresa_id'], ['id'])

    op.add_column('categorias', sa.Column('empresa_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_categorias_empresa', 'categorias', 'empresas', ['empresa_id'], ['id'])
    op.create_unique_constraint('uq_categoria_nombre_empresa', 'categorias', ['nombre', 'empresa_id'])

    op.add_column('ubicaciones', sa.Column('empresa_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_ubicaciones_empresa', 'ubicaciones', 'empresas', ['empresa_id'], ['id'])
    op.create_unique_constraint('uq_ubicacion_nombre_empresa', 'ubicaciones', ['nombre', 'empresa_id'])

    op.add_column('usuarios', sa.Column('empresa_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_usuarios_empresa', 'usuarios', 'empresas', ['empresa_id'], ['id'])

    # La unicidad global de folio/numero se deja de lado a favor de la compuesta
    # (empresa_id). La columna sigue indexada pero ya no única en solitario.
    op.drop_index(op.f('ix_equipos_folio'), table_name='equipos')
    op.create_index(op.f('ix_equipos_folio'), 'equipos', ['folio'], unique=False)

    op.drop_index(op.f('ix_actas_numero'), table_name='actas')
    op.create_index(op.f('ix_actas_numero'), 'actas', ['numero'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_actas_numero'), table_name='actas')
    op.create_index(op.f('ix_actas_numero'), 'actas', ['numero'], unique=True)
    op.drop_index(op.f('ix_equipos_folio'), table_name='equipos')
    op.create_index(op.f('ix_equipos_folio'), 'equipos', ['folio'], unique=True)

    op.drop_constraint('fk_usuarios_empresa', 'usuarios', type_='foreignkey')
    op.drop_column('usuarios', 'empresa_id')

    op.drop_constraint('uq_ubicacion_nombre_empresa', 'ubicaciones', type_='unique')
    op.drop_constraint('fk_ubicaciones_empresa', 'ubicaciones', type_='foreignkey')
    op.drop_column('ubicaciones', 'empresa_id')

    op.drop_constraint('fk_movimientos_empresa', 'movimientos', type_='foreignkey')
    op.drop_column('movimientos', 'empresa_id')

    op.drop_constraint('fk_mantenimientos_empresa', 'mantenimientos', type_='foreignkey')
    op.drop_column('mantenimientos', 'empresa_id')

    op.drop_constraint('uq_categoria_nombre_empresa', 'categorias', type_='unique')
    op.drop_constraint('fk_categorias_empresa', 'categorias', type_='foreignkey')
    op.drop_column('categorias', 'empresa_id')

    op.drop_constraint('fk_acta_items_empresa', 'acta_items', type_='foreignkey')
    op.drop_column('acta_items', 'empresa_id')

    op.drop_constraint('uq_numero_empresa', 'actas', type_='unique')
    op.drop_constraint('fk_actas_empresa', 'actas', type_='foreignkey')
    op.drop_column('actas', 'empresa_id')

    op.drop_constraint('uq_folio_empresa', 'equipos', type_='unique')
    op.drop_constraint('fk_equipos_empresa', 'equipos', type_='foreignkey')
    op.drop_column('equipos', 'empresa_id')

    op.drop_index(op.f('ix_empresas_id'), table_name='empresas')
    op.drop_table('empresas')
