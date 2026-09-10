"""Corregir typo describcion -> descripcion en actas_mantenimiento.

La columna nunca fue poblada por ningún endpoint; se renombra para
dejar el esquema consistente.
"""

revision = "e5f4a3b2c1d0"
down_revision = "d9e8f7a6b5c4"
branch_labels = None
depends_on = None

from alembic import op


def upgrade() -> None:
    op.execute("EXEC sp_rename 'actas_mantenimiento.describcion', 'descripcion', 'COLUMN'")


def downgrade() -> None:
    op.execute("EXEC sp_rename 'actas_mantenimiento.descripcion', 'describcion', 'COLUMN'")