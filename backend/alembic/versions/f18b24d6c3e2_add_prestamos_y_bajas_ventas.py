"""add prestamos y bajas_ventas a equipos

Revision ID: f18b24d6c3e2
Revises: 79a1f85d82fd
Create Date: 2026-09-03 21:40:00.000000+00:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f18b24d6c3e2'
down_revision = '79a1f85d82fd'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('equipos', sa.Column('prestamo_a', sa.String(length=150), nullable=True))
    op.add_column('equipos', sa.Column('prestamo_desde', sa.DateTime(timezone=True), nullable=True))
    op.add_column('equipos', sa.Column('prestamo_hasta', sa.DateTime(timezone=True), nullable=True))
    op.add_column('equipos', sa.Column('baja_motivo', sa.String(length=255), nullable=True))
    op.add_column('equipos', sa.Column('precio_venta', sa.Numeric(14, 2), nullable=True))
    op.add_column('equipos', sa.Column('fecha_baja', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('equipos', 'fecha_baja')
    op.drop_column('equipos', 'precio_venta')
    op.drop_column('equipos', 'baja_motivo')
    op.drop_column('equipos', 'prestamo_hasta')
    op.drop_column('equipos', 'prestamo_desde')
    op.drop_column('equipos', 'prestamo_a')