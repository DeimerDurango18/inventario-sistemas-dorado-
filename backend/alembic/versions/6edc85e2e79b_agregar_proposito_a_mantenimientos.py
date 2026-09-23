"""agregar proposito a mantenimientos

Revision ID: 6edc85e2e79b
Revises: 5d4afa6ebe0c
Create Date: 2026-09-22 14:45:02.927968

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '6edc85e2e79b'
down_revision: Union[str, None] = '5d4afa6ebe0c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('mantenimientos', sa.Column('proposito', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('mantenimientos', 'proposito')