"""Reemplazar costo por prioridad en mantenimientos y actas_mantenimiento.

Los mantenimientos no se cobran: en lugar del costo se registra la
prioridad del servicio (baja | media | alta | urgente).
"""

revision = "c3f4a5b6c7d8"
down_revision = "b7c8d9e0f1a2"
branch_labels = None
depends_on = None

from alembic import op
import sqlalchemy as sa


def upgrade() -> None:
    op.add_column(
        "mantenimientos",
        sa.Column("prioridad", sa.String(length=20), nullable=False, server_default="media"),
    )
    op.add_column(
        "actas_mantenimiento",
        sa.Column("prioridad", sa.String(length=20), nullable=False, server_default="media"),
    )
    op.drop_column("mantenimientos", "costo")
    op.drop_column("actas_mantenimiento", "costo")


def downgrade() -> None:
    op.add_column(
        "actas_mantenimiento",
        sa.Column("costo", sa.Numeric(precision=12, scale=2), nullable=True),
    )
    op.add_column(
        "mantenimientos",
        sa.Column("costo", sa.Numeric(precision=12, scale=2), nullable=True),
    )
    op.drop_column("actas_mantenimiento", "prioridad")
    op.drop_column("mantenimientos", "prioridad")