"""agregar acta a atenciones de punto

Revision ID: f9a1b3c5d7e2
Revises: e8c5f0a2b7d6
Create Date: 2026-09-30 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'f9a1b3c5d7e2'
down_revision: Union[str, None] = 'e8c5f0a2b7d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('atenciones_punto', sa.Column('acta_id', sa.Integer(), sa.ForeignKey('actas.id'), nullable=True))


def downgrade() -> None:
    op.drop_column('atenciones_punto', 'acta_id')