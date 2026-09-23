"""Creación de notificaciones in-app (complementa el módulo de sistema)."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.system import Notificacion
from app.models.user import Usuario, Rol


def crear_notificacion(
    db: Session,
    tipo: str,
    titulo: str,
    mensaje: str | None = None,
    entidad_tipo: str | None = None,
    entidad_id: int | None = None,
    roles_destino: list[str] | None = None,
    usuario_destino_id: int | None = None,
) -> None:
    """Crea una notificación para un usuario concreto o para todos los que tengan algún rol."""
    destinos: list[int] = []
    if usuario_destino_id:
        destinos = [usuario_destino_id]
    elif roles_destino:
        rol_ids = db.scalars(select(Rol.id).where(Rol.codigo.in_(roles_destino), Rol.activo == True)).all()  # noqa: E712
        if rol_ids:
            destinos = db.scalars(
                select(Usuario.id).where(
                    Usuario.activo == True,  # noqa: E712
                    Usuario.roles.any(Rol.id.in_(rol_ids)),
                )
            ).all()
    if not destinos:
        return
    for uid in destinos:
        db.add(
            Notificacion(
                tipo=tipo,
                titulo=titulo,
                mensaje=mensaje,
                entidad_tipo=entidad_tipo,
                entidad_id=entidad_id,
                usuario_destino_id=uid,
                fecha_evento=datetime.now(timezone.utc),
            )
        )
    db.flush()