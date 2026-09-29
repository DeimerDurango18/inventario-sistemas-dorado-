"""mantenimientos por ubicacion (farmacia) y activo opcional

Revision ID: cf6319f2a0b1
Revises: 8f2a0c94d7b3
Create Date: 2026-09-29 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'cf6319f2a0b1'
down_revision: Union[str, None] = '8f2a0c94d7b3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('mantenimientos', sa.Column('ubicacion_id', sa.Integer(), nullable=True))
    op.create_index('ix_mantenimientos_ubicacion_id', 'mantenimientos', ['ubicacion_id'])
    op.create_foreign_key('fk_mantenimientos_ubicaciones', 'mantenimientos', 'ubicaciones', ['ubicacion_id'], ['id'])
    op.alter_column('mantenimientos', 'activo_id', existing_type=sa.Integer(), nullable=True)


def downgrade() -> None:
    op.alter_column('mantenimientos', 'activo_id', existing_type=sa.Integer(), nullable=False)
    op.drop_constraint('fk_mantenimientos_ubicaciones', 'mantenimientos', type_='foreignkey')
    op.drop_index('ix_mantenimientos_ubicacion_id', table_name='mantenimientos')
    op.drop_column('mantenimientos', 'ubicacion_id')