"""agregar serial a archivos de mantenimiento

Revision ID: d9f3a2b1c4e5
Revises: 4ce1f5c7d9a2
Create Date: 2026-09-29 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd9f3a2b1c4e5'
down_revision: Union[str, None] = '4ce1f5c7d9a2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('archivos', sa.Column('serial', sa.String(100), nullable=True))


def downgrade() -> None:
    op.drop_column('archivos', 'serial')