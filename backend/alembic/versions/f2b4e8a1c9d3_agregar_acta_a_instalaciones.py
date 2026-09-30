"""agregar acta a instalaciones

Revision ID: f2b4e8a1c9d3
Revises: a7c3d9e2f1b4
Create Date: 2026-09-30 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f2b4e8a1c9d3'
down_revision: Union[str, None] = 'a7c3d9e2f1b4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('instalaciones', sa.Column('acta_id', sa.Integer(), sa.ForeignKey('actas.id'), nullable=True))


def downgrade() -> None:
    op.drop_column('instalaciones', 'acta_id')