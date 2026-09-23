"""Servicios de instalaciones y atenciones de punto."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.errors import NotFoundError, ValidationError
from app.models.operations import AtencionPunto, Instalacion
from app.schemas.operations import AtencionCreate, AtencionUpdate, InstalacionCreate, InstalacionUpdate
from app.services.numbering import audit as audit_op, get_next_number

_ESTADOS_INSTALACION = {"PROGRAMADA", "EN_PROCESO", "COMPLETADA", "CANCELADA"}
_ESTADOS_ATENCION = {"ABIERTA", "EN_ATENCION", "RESUELTA"}


def _get_or_404(db: Session, model, pk: int, nombre: str):
    m = db.get(model, pk)
    if not m:
        raise NotFoundError(nombre)
    return m


# ------------------------------------------------------------------ instalaciones
def list_instalaciones(db: Session, estado: str | None = None, page: int = 1, size: int = 30):
    stmt = select(Instalacion)
    if estado:
        stmt = stmt.where(Instalacion.estado == estado)
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = db.scalars(stmt.order_by(Instalacion.id.desc()).offset((page - 1) * size).limit(size)).all()
    return rows, total


def crear_instalacion(db: Session, data: InstalacionCreate, actor_id: int) -> Instalacion:
    estado = (data.estado or "PROGRAMADA").upper()
    if estado not in _ESTADOS_INSTALACION:
        raise ValidationError(f"Estado no válido: {estado}")
    numero = get_next_number(db, "INS", Instalacion)
    it = Instalacion(
        numero=numero,
        tipo_servicio=data.tipo_servicio,
        descripcion=data.descripcion,
        fecha_programada=data.fecha_programada,
        tecnico=data.tecnico,
        cliente=data.cliente,
        activo_id=data.activo_id,
        ubicacion_id=data.ubicacion_id,
        estado=estado,
        usuario_id=actor_id,
    )
    if estado == "COMPLETADA":
        it.fecha_ejecucion = datetime.now(timezone.utc)
    db.add(it)
    db.flush()
    audit_op(db, "OPERATIVO", "Instalacion", it.id, "CREAR", f"Instalación {numero} programada")
    db.commit()
    db.refresh(it)
    return it


def actualizar_instalacion(db: Session, instalacion_id: int, data: InstalacionUpdate, actor_id: int) -> Instalacion:
    it = _get_or_404(db, Instalacion, instalacion_id, "Instalación")
    cambios = data.model_dump(exclude_unset=True)
    if cambios.get("estado"):
        estado = cambios["estado"].upper()
        if estado not in _ESTADOS_INSTALACION:
            raise ValidationError(f"Estado no válido: {estado}")
        cambios["estado"] = estado
        if estado == "COMPLETADA" and not it.fecha_ejecucion:
            cambios["fecha_ejecucion"] = datetime.now(timezone.utc)
    for campo, valor in cambios.items():
        setattr(it, campo, valor)
    db.flush()
    audit_op(db, "OPERATIVO", "Instalacion", it.id, "EDITAR", f"Instalación {it.numero} actualizada")
    db.commit()
    db.refresh(it)
    return it


# ------------------------------------------------------------------ atenciones de punto
def list_atenciones(db: Session, estado: str | None = None, page: int = 1, size: int = 50):
    stmt = select(AtencionPunto)
    if estado:
        stmt = stmt.where(AtencionPunto.estado == estado)
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = db.scalars(stmt.order_by(AtencionPunto.id.desc()).offset((page - 1) * size).limit(size)).all()
    return rows, total


def crear_atencion(db: Session, data: AtencionCreate, actor_id: int) -> AtencionPunto:
    numero = get_next_number(db, "ATN", AtencionPunto)
    a = AtencionPunto(numero=numero, **data.model_dump(), usuario_id=actor_id)
    db.add(a)
    db.flush()
    audit_op(db, "OPERATIVO", "AtencionPunto", a.id, "CREAR", f"Atención {numero} creada")
    db.commit()
    db.refresh(a)
    return a


def actualizar_atencion(db: Session, atencion_id: int, data: AtencionUpdate, actor_id: int) -> AtencionPunto:
    a = _get_or_404(db, AtencionPunto, atencion_id, "Atención")
    cambios = data.model_dump(exclude_unset=True)
    if cambios.get("estado"):
        estado = cambios["estado"].upper()
        if estado not in _ESTADOS_ATENCION:
            raise ValidationError(f"Estado no válido: {estado}")
        cambios["estado"] = estado
        if estado == "RESUELTA":
            cambios["fecha_resuelta"] = datetime.now(timezone.utc)
    for campo, valor in cambios.items():
        setattr(a, campo, valor)
    db.flush()
    audit_op(db, "OPERATIVO", "AtencionPunto", a.id, "EDITAR", f"Atención {a.numero} actualizada")
    db.commit()
    db.refresh(a)
    return a