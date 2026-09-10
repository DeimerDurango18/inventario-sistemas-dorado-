"""Agregar coordinador_celular a puntos_venta y fotos a actas.

- puntos_venta.coordinador_celular: celular del responsable/coordinador de la sede.
- actas.fotos: lista JSON con rutas de las fotografias/evidencias de salida o entrada.
"""

revision = "d9e8f7a6b5c4"
down_revision = "c3f4a5b6c7d8"
branch_labels = None
depends_on = None

from alembic import op
import sqlalchemy as sa


def upgrade() -> None:
    op.add_column(
        "puntos_venta",
        sa.Column("coordinador_celular", sa.String(length=20), nullable=True),
    )
    op.add_column(
        "actas",
        sa.Column("fotos", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("actas", "fotos")
    op.drop_column("puntos_venta", "coordinador_celular")