"""agregar acta_anulacion_id a movimientos y stock

Revision ID: e8c5f0a2b7d6
Revises: f2b4e8a1c9d3
Create Date: 2026-09-30 10:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e8c5f0a2b7d6'
down_revision: Union[str, None] = 'f2b4e8a1c9d3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    for tabla in ('movimientos', 'movimientos_stock'):
        op.add_column(tabla, sa.Column('acta_anulacion_id', sa.Integer(), sa.ForeignKey('actas.id'), nullable=True))


def downgrade() -> None:
    for tabla in ('movimientos', 'movimientos_stock'):
        op.drop_column(tabla, 'acta_anulacion_id')