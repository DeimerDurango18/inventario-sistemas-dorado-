"""agregar modo con/sin imagen al acta de mantenimiento

Revision ID: a7c3d9e2f1b4
Revises: d9f3a2b1c4e5
Create Date: 2026-09-29 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a7c3d9e2f1b4'
down_revision: Union[str, None] = 'd9f3a2b1c4e5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('mantenimientos', sa.Column('acta_con_fotos', sa.Boolean(), server_default='1', nullable=False))


def downgrade() -> None:
    op.drop_column('mantenimientos', 'acta_con_fotos')