from __future__ import annotations

import logging
import threading
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from sqlalchemy import select

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

    from app.models.user import Usuario

logger = logging.getLogger(__name__)

_local = threading.local()


def set_current_user(user: Optional["Usuario"]) -> None:
    _local.user = user


def get_current_user() -> Optional["Usuario"]:
    return getattr(_local, "user", None)


def audit(
    db: "Session",
    modulo: str,
    entidad_tipo: str,
    entidad_id: int,
    accion: str,
    detalle: str | None = None,
    ip: str | None = None,
) -> None:
    """Registra una operación en la tabla de auditoría si es posible."""
    from app.models.user import Auditoria

    user = get_current_user()
    try:
        db.add(
            Auditoria(
                usuario_id=user.id if user else None,
                fecha=datetime.now(timezone.utc),
                accion=accion,
                modulo=modulo,
                entidad_tipo=entidad_tipo,
                entidad_id=entidad_id,
                valor_nuevo=detalle,
                ip=ip,
            )
        )
        db.flush()
    except Exception:
        logger.exception("No se pudo registrar la auditoría (%s %s %s)", modulo, entidad_tipo, accion)


def get_next_number(db: "Session", prefix: str, model, attr: str = "numero") -> str:
    """Genera el siguiente número consecutivo PREFIX-XXXXXXX para la tabla del modelo.

    Se toma el mayor sufijo numérico entre todos los prefijos existentes para no
    colisionar cuando conviven varios prefijos (ACT/ENS/SIS/AJS/MOV…).
    """
    ultimo = 0
    for valor in db.scalars(select(getattr(model, attr))).all():
        if not valor:
            continue
        try:
            sufijo = int(str(valor).rsplit("-", 1)[-1])
            ultimo = max(ultimo, sufijo)
        except ValueError:
            continue
    return f"{prefix}-{ultimo + 1:07d}"