"""seriales y cantidad en operaciones (prestamos, mantenimientos, bajas, movimientos_stock)

Revision ID: 8f2a0c94d7b3
Revises: a3f22b9114c0
Create Date: 2026-09-22 22:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '8f2a0c94d7b3'
down_revision: Union[str, None] = 'a3f22b9114c0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('prestamos', sa.Column('cantidad', sa.Integer(), server_default='1', nullable=False))
    op.add_column('prestamos', sa.Column('seriales_json', sa.Text(), nullable=True))

    op.add_column('mantenimientos', sa.Column('cantidad', sa.Integer(), server_default='1', nullable=False))
    op.add_column('mantenimientos', sa.Column('seriales_json', sa.Text(), nullable=True))

    op.add_column('bajas', sa.Column('cantidad', sa.Integer(), server_default='1', nullable=False))
    op.add_column('bajas', sa.Column('seriales_json', sa.Text(), nullable=True))

    op.add_column('movimientos_stock', sa.Column('seriales_json', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('movimientos_stock', 'seriales_json')
    op.drop_column('bajas', 'seriales_json')
    op.drop_column('bajas', 'cantidad')
    op.drop_column('mantenimientos', 'seriales_json')
    op.drop_column('mantenimientos', 'cantidad')
    op.drop_column('prestamos', 'seriales_json')
    op.drop_column('prestamos', 'cantidad')