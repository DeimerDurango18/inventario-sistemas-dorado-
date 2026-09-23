"""modulo de stock: items agregados y movimientos entrada/salida

Revision ID: b9c4107f3d00
Revises: 6edc85e2e79b
Create Date: 2026-09-22 16:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b9c4107f3d00'
down_revision: Union[str, None] = '6edc85e2e79b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('activos', sa.Column('cantidad_stock', sa.Integer(), server_default='0', nullable=False))

    op.create_table(
        'stock_items',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('nombre', sa.String(length=200), nullable=False),
        sa.Column('tipo', sa.String(length=30), server_default='EQUIPO', nullable=False),
        sa.Column('codigo', sa.String(length=50)),
        sa.Column('marca_id', sa.Integer(), sa.ForeignKey('marcas.id')),
        sa.Column('modelo_id', sa.Integer(), sa.ForeignKey('modelos.id')),
        sa.Column('categoria_id', sa.Integer(), sa.ForeignKey('categorias.id')),
        sa.Column('cantidad_stock', sa.Integer(), server_default='0', nullable=False),
        sa.Column('stock_minimo', sa.Integer(), server_default='0', nullable=False),
        sa.Column('valor_unitario', sa.Numeric(14, 2)),
        sa.Column('activo', sa.Boolean(), server_default=sa.text('1'), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index('ix_stock_items_codigo', 'stock_items', ['codigo'])

    op.create_table(
        'movimientos_stock',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('numero', sa.String(length=30), nullable=False),
        sa.Column('tipo', sa.String(length=30), nullable=False),
        sa.Column('referencia_tipo', sa.String(length=20), nullable=False),
        sa.Column('item_id', sa.Integer(), sa.ForeignKey('stock_items.id')),
        sa.Column('activo_id', sa.Integer(), sa.ForeignKey('activos.id')),
        sa.Column('cantidad', sa.Integer(), nullable=False),
        sa.Column('fecha', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('proveedor_id', sa.Integer(), sa.ForeignKey('proveedores.id')),
        sa.Column('documento', sa.String(length=100)),
        sa.Column('destino', sa.String(length=200)),
        sa.Column('valor', sa.Numeric(14, 2)),
        sa.Column('motivo', sa.String(length=255)),
        sa.Column('observaciones', sa.String(length=1000)),
        sa.Column('usuario_id', sa.Integer(), sa.ForeignKey('usuarios.id'), nullable=False),
        sa.Column('estado', sa.String(length=20), server_default='REGISTRADO', nullable=False),
        sa.Column('anulado_motivo', sa.String(length=255)),
        sa.Column('anulado_usuario_id', sa.Integer(), sa.ForeignKey('usuarios.id')),
        sa.Column('anulado_fecha', sa.DateTime()),
        sa.Column('acta_id', sa.Integer(), sa.ForeignKey('actas.id')),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
    )
    op.create_index('ix_movimientos_stock_tipo', 'movimientos_stock', ['tipo'])
    op.create_index('ix_movimientos_stock_fecha', 'movimientos_stock', ['fecha'])
    op.create_index('ix_movimientos_stock_numero', 'movimientos_stock', ['numero'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_movimientos_stock_numero', table_name='movimientos_stock')
    op.drop_index('ix_movimientos_stock_fecha', table_name='movimientos_stock')
    op.drop_index('ix_movimientos_stock_tipo', table_name='movimientos_stock')
    op.drop_table('movimientos_stock')
    op.drop_index('ix_stock_items_codigo', table_name='stock_items')
    op.drop_table('stock_items')
    op.drop_column('activos', 'cantidad_stock')