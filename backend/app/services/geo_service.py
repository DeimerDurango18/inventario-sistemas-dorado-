from __future__ import annotations

from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.errors import ConflictError, NotFoundError
from app.models.geo import Ciudad, Departamento, Pais, Sede, TipoUbicacion, Ubicacion
from app.schemas.geo import (
    CiudadCreate,
    DepartamentoCreate,
    PaisCreate,
    SedeCreate,
    SedeUpdate,
    TipoUbicacionCreate,
    UbicacionCreate,
    UbicacionUpdate,
)
from app.services.numbering import audit as audit_op


def _get_or_404(db: Session, model, pk: int, nombre: str):
    m = db.get(model, pk)
    if not m:
        raise NotFoundError(nombre)
    return m


# ------------------------------------------------------------------ geografía
def list_paises(db: Session):
    return db.scalars(select(Pais).order_by(Pais.nombre)).all()


def create_pais(db: Session, data: PaisCreate):
    dup = db.scalar(select(Pais).where(Pais.nombre == data.nombre))
    if dup:
        raise ConflictError("Ya existe un país con ese nombre.")
    p = Pais(nombre=data.nombre)
    db.add(p)
    db.flush()
    audit_op(db, "GEO", "Pais", p.id, "CREAR", f"País {data.nombre} creado")
    db.commit()
    db.refresh(p)
    return p


def list_departamentos(db: Session, pais_id: int | None = None):
    stmt = select(Departamento).order_by(Departamento.nombre)
    if pais_id:
        stmt = stmt.where(Departamento.pais_id == pais_id)
    return db.scalars(stmt).all()


def create_departamento(db: Session, data: DepartamentoCreate):
    _get_or_404(db, Pais, data.pais_id, "País")
    dup = db.scalar(
        select(Departamento).where(
            Departamento.nombre == data.nombre,
            Departamento.pais_id == data.pais_id,
        )
    )
    if dup:
        raise ConflictError("Ya existe un departamento con ese nombre en el país.")
    departamento = Departamento(nombre=data.nombre, pais_id=data.pais_id)
    db.add(departamento)
    db.flush()
    audit_op(db, "GEO", "Departamento", departamento.id, "CREAR", f"Departamento {data.nombre} creado")
    db.commit()
    db.refresh(departamento)
    return departamento


def list_ciudades(db: Session, departamento_id: int | None = None):
    stmt = select(Ciudad).order_by(Ciudad.nombre)
    if departamento_id:
        stmt = stmt.where(Ciudad.departamento_id == departamento_id)
    return db.scalars(stmt).all()


def create_ciudad(db: Session, data: CiudadCreate):
    _get_or_404(db, Departamento, data.departamento_id, "Departamento")
    c = Ciudad(nombre=data.nombre, departamento_id=data.departamento_id)
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


def list_tipos_ubicacion(db: Session, incluir_inactivos: bool = False):
    stmt = select(TipoUbicacion).order_by(TipoUbicacion.id)
    if not incluir_inactivos:
        stmt = stmt.where(TipoUbicacion.activo == True)  # noqa: E712
    return db.scalars(stmt).all()


def create_tipo_ubicacion(db: Session, data: TipoUbicacionCreate):
    dup = db.scalar(select(TipoUbicacion).where(TipoUbicacion.codigo == data.codigo))
    if dup:
        raise ConflictError("Ya existe un tipo de ubicación con ese código.")
    t = TipoUbicacion(**data.model_dump())
    db.add(t)
    db.flush()
    audit_op(db, "GEO", "TipoUbicacion", t.id, "CREAR", f"Tipo ubicación {data.nombre} creado")
    db.commit()
    db.refresh(t)
    return t


# ------------------------------------------------------------------ sedes
def list_sedes(db: Session, incluir_inactivas: bool = False) -> list[Sede]:
    stmt = select(Sede).options(
        selectinload(Sede.ciudad).selectinload(Ciudad.departamento),
        selectinload(Sede.tipo_ubicacion),
        selectinload(Sede.centro_distribucion),
    ).order_by(Sede.nombre)
    if not incluir_inactivas:
        stmt = stmt.where(Sede.estado == "ACTIVA")
    return db.scalars(stmt).all()


def create_sede(db: Session, data: SedeCreate) -> Sede:
    _get_or_404(db, Ciudad, data.ciudad_id, "Ciudad")
    dup = db.scalar(select(Sede).where(Sede.codigo == data.codigo))
    if dup:
        raise ConflictError("Ya existe una sede con ese código.")
    s = Sede(**data.model_dump())
    db.add(s)
    db.flush()
    audit_op(db, "GEO", "Sede", s.id, "CREAR", f"Sede {data.nombre} creada")
    db.commit()
    return s


def get_sede(db: Session, sede_id: int) -> Sede:
    return _get_or_404(db, Sede, sede_id, "Sede")


def update_sede(db: Session, sede_id: int, data: SedeUpdate) -> Sede:
    s = _get_or_404(db, Sede, sede_id, "Sede")
    for campo in ("nombre", "direccion", "telefono", "responsable", "estado", "observaciones"):
        v = getattr(data, campo)
        if v is not None:
            setattr(s, campo, v)
    if data.ciudad_id is not None:
        s.ciudad_id = data.ciudad_id
    if data.tipo_ubicacion_id is not None:
        s.tipo_ubicacion_id = data.tipo_ubicacion_id
    if data.ced_id is not None:
        _get_or_404(db, Sede, data.ced_id, "Sede")
        s.ced_id = data.ced_id
    db.flush()
    audit_op(db, "GEO", "Sede", s.id, "EDITAR", f"Sede {s.nombre} actualizada")
    db.commit()
    return s


# ------------------------------------------------------------------ ubicaciones
def list_ubicaciones(db: Session, sede_id: int | None = None, incluir_inactivas: bool = False):
    stmt = select(Ubicacion).options(
        selectinload(Ubicacion.sede),
        selectinload(Ubicacion.tipo_ubicacion),
    ).order_by(Ubicacion.sede_id, Ubicacion.nombre)
    if sede_id:
        stmt = stmt.where(Ubicacion.sede_id == sede_id)
    if not incluir_inactivas:
        stmt = stmt.where(Ubicacion.es_activa == True)  # noqa: E712
    return db.scalars(stmt).all()


def create_ubicacion(db: Session, data: UbicacionCreate) -> Ubicacion:
    u = Ubicacion(**data.model_dump())
    db.add(u)
    db.flush()
    audit_op(db, "GEO", "Ubicacion", u.id, "CREAR", f"Ubicación {data.nombre} creada")
    db.commit()
    return u


def update_ubicacion(db: Session, ubicacion_id: int, data: UbicacionUpdate) -> Ubicacion:
    u = _get_or_404(db, Ubicacion, ubicacion_id, "Ubicación")
    for campo in ("nombre", "observaciones"):
        v = getattr(data, campo)
        if v is not None:
            setattr(u, campo, v)
    if data.sede_id is not None:
        u.sede_id = data.sede_id
    if data.tipo_ubicacion_id is not None:
        u.tipo_ubicacion_id = data.tipo_ubicacion_id
    if data.es_activa is not None:
        u.es_activa = data.es_activa
    db.flush()
    audit_op(db, "GEO", "Ubicacion", u.id, "EDITAR", f"Ubicación {u.nombre} actualizada")
    db.commit()
    return u