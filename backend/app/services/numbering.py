from __future__ import annotations

import threading
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from sqlalchemy import func, select

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

    from app.models.user import Usuario

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
    except Exception:
        pass


def get_next_number(db: "Session", prefix: str, model, attr: str = "numero") -> str:
    """Genera el siguiente número consecutivo PREFIX-XXXXXXX para la tabla del modelo."""
    max_val = db.scalar(select(func.max(getattr(model, attr))))
    ultimo = 0
    if max_val:
        try:
            ultimo = int(str(max_val).split("-")[-1])
        except ValueError:
            ultimo = 0
    return f"{prefix}-{ultimo + 1:07d}"