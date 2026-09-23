"""stock por ubicacion, ajustes y valoracion

Revision ID: a3f22b9114c0
Revises: b9c4107f3d00
Create Date: 2026-09-22 21:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a3f22b9114c0'
down_revision: Union[str, None] = 'b9c4107f3d00'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('movimientos_stock', sa.Column('ubicacion_id', sa.Integer(), sa.ForeignKey('ubicaciones.id')))
    op.add_column('movimientos_stock', sa.Column('nuevo_stock', sa.Integer()))
    op.add_column('movimientos_stock', sa.Column('stock_anterior', sa.Integer()))

    op.create_table(
        'stock_items_ubicaciones',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('item_id', sa.Integer(), sa.ForeignKey('stock_items.id'), nullable=False),
        sa.Column('ubicacion_id', sa.Integer(), sa.ForeignKey('ubicaciones.id'), nullable=False),
        sa.Column('cantidad', sa.Integer(), server_default='0', nullable=False),
        sa.UniqueConstraint('item_id', 'ubicacion_id', name='uq_stock_item_ubicacion'),
    )


def downgrade() -> None:
    op.drop_table('stock_items_ubicaciones')
    op.drop_column('movimientos_stock', 'stock_anterior')
    op.drop_column('movimientos_stock', 'nuevo_stock')
    op.drop_column('movimientos_stock', 'ubicacion_id')