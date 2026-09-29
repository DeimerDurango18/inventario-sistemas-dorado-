"""mantenimientos por sede (dropdown desde modulo geografia)

Revision ID: 4ce1f5c7d9a2
Revises: cf6319f2a0b1
Create Date: 2026-09-29 11:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '4ce1f5c7d9a2'
down_revision: Union[str, None] = 'cf6319f2a0b1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('mantenimientos', sa.Column('sede_id', sa.Integer(), nullable=True))
    op.create_index('ix_mantenimientos_sede_id', 'mantenimientos', ['sede_id'])
    op.create_foreign_key('fk_mantenimientos_sedes', 'mantenimientos', 'sedes', ['sede_id'], ['id'])


def downgrade() -> None:
    op.drop_constraint('fk_mantenimientos_sedes', 'mantenimientos', type_='foreignkey')
    op.drop_index('ix_mantenimientos_sede_id', table_name='mantenimientos')
    op.drop_column('mantenimientos', 'sede_id')