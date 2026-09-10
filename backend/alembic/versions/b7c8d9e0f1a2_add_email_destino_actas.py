"""Añadir columna email_destino a actas para el envío automático del PDF."""

revision = "b7c8d9e0f1a2"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None

from alembic import op
import sqlalchemy as sa


def upgrade() -> None:
    op.add_column(
        "actas",
        sa.Column("email_destino", sa.String(length=500), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("actas", "email_destino")