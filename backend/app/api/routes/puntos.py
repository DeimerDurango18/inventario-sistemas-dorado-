from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.audit import AuditLog
from app.models.equipment import Equipment
from app.models.maintenance import MaintenanceRecord
from app.models.ticket import Ticket
from app.models.user import User
from app.models.punto_venta import AtencionPunto, Instalacion, PuntoVenta
from app.schemas import (
    AtencionPuntoIn,
    AtencionPuntoUpdate,
    InstalacionIn,
    InstalacionUpdate,
    PuntoVentaIn,
    PuntoVentaUpdate,
)
from app.services.audit_service import log_change

router = APIRouter()

MODIFY_ROLES = require_roles("admin", "supervisor")

TIPOS = {"drogueria", "dispensario", "centro_costo", "cedis", "oficina"}
ESTADOS_PUNTO = {"activo", "inactivo"}
ESTADOS_INST = {"activa", "retirada"}
TIPOS_ATENCION = {"soporte", "instalacion", "mantenimiento"}


def _serialize_punto(p: PuntoVenta) -> dict:
    instalaciones = [_serialize_instalacion(i) for i in p.instalaciones]
    atenciones = [_serialize_atencion(a) for a in p.atenciones]
    mantenimientos = [_serialize_mantenimiento(m) for m in p.mantenimientos]
    return {
        "id": p.id,
        "nombre": p.nombre,
        "tipo": p.tipo,
        "ciudad": p.ciudad,
        "direccion": p.direccion,
        "telefono": p.telefono,
        "responsable": p.responsable,
        "estado": p.estado,
        "created_at": p.created_at.isoformat() if p.created_at else None,
        "equipos_instalados": len([i for i in p.instalaciones if i.estado == "activa"]),
        "instalaciones": instalaciones,
        "atenciones": atenciones,
        "mantenimientos": mantenimientos,
    }


def _serialize_mantenimiento(m: MaintenanceRecord) -> dict:
    return {
        "id": m.id,
        "equipo_id": m.equipo_id,
        "equipo_folio": m.equipo.folio if m.equipo else None,
        "equipo_marca": m.equipo.marca if m.equipo else None,
        "equipo_modelo": m.equipo.modelo if m.equipo else None,
        "tipo": m.tipo,
        "estado": m.estado,
        "fecha_programada": m.fecha_programada.isoformat() if m.fecha_programada else None,
        "fecha_realizada": m.fecha_finalizado.isoformat() if m.fecha_finalizado else None,
        "tecnico": m.tecnico,
        "descripcion": m.descripcion,
        "piezas": m.piezas,
        "periodicidad": m.periodicidad,
        "created_at": m.created_at.isoformat() if m.created_at else None,
    }


def _serialize_instalacion(i: Instalacion) -> dict:
    return {
        "id": i.id,
        "punto_id": i.punto_id,
        "equipo_id": i.equipo_id,
        "equipo_folio": i.equipo.folio if i.equipo else None,
        "equipo_marca": i.equipo.marca if i.equipo else None,
        "equipo_modelo": i.equipo.modelo if i.equipo else None,
        "serial": i.equipo.serie if i.equipo else None,
        "software": i.software,
        "fecha_instalacion": i.fecha_instalacion.isoformat() if i.fecha_instalacion else None,
        "estado": i.estado,
        "observaciones": i.observaciones,
        "created_at": i.created_at.isoformat() if i.created_at else None,
    }


def _serialize_atencion(a: AtencionPunto) -> dict:
    return {
        "id": a.id,
        "punto_id": a.punto_id,
        "ticket_id": a.ticket_id,
        "fecha": a.fecha.isoformat() if a.fecha else None,
        "tipo": a.tipo,
        "descripcion": a.descripcion,
        "tecnico": a.tecnico,
        "resultado": a.resultado,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }


def _get_punto(db: Session, punto_id: int, current_user: User) -> PuntoVenta:
    q = db.query(PuntoVenta).filter(PuntoVenta.id == punto_id)
    if current_user.empresa_id:
        q = q.filter(PuntoVenta.empresa_id == current_user.empresa_id)
    p = q.first()
    if not p:
        raise HTTPException(status_code=404, detail="Punto de venta no encontrado")
    return p


def _get_instalacion(db: Session, inst_id: int) -> Instalacion:
    i = db.query(Instalacion).filter(Instalacion.id == inst_id).first()
    if not i:
        raise HTTPException(status_code=404, detail="InstalaciÃ³n no encontrada")
    return i


# ---------- PUNTOS DE VENTA ----------


@router.get("")
def listar_puntos(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(PuntoVenta)
    if current_user.empresa_id:
        q = q.filter(PuntoVenta.empresa_id == current_user.empresa_id)
    puntos = q.order_by(PuntoVenta.nombre.asc()).all()
    return [_serialize_punto(p) for p in puntos]


@router.get("/{punto_id}")
def obtener_punto(punto_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return _serialize_punto(_get_punto(db, punto_id, current_user))


@router.post("", status_code=201)
def crear_punto(
    payload: PuntoVentaIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(MODIFY_ROLES),
):
    if payload.tipo not in TIPOS:
        raise HTTPException(status_code=400, detail="Tipo de punto invÃ¡lido")
    if payload.estado not in ESTADOS_PUNTO:
        raise HTTPException(status_code=400, detail="Estado de punto invÃ¡lido")
    eid = current_user.empresa_id
    p = PuntoVenta(**payload.model_dump(), empresa_id=eid)
    db.add(p)
    db.commit()
    db.refresh(p)
    return _serialize_punto(p)


@router.put("/{punto_id}")
def actualizar_punto(
    punto_id: int,
    payload: PuntoVentaUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(MODIFY_ROLES),
):
    p = _get_punto(db, punto_id, current_user)
    data = payload.model_dump(exclude_unset=True)
    if data.get("tipo") is not None and data["tipo"] not in TIPOS:
        raise HTTPException(status_code=400, detail="Tipo de punto invÃ¡lido")
    if data.get("estado") is not None and data["estado"] not in ESTADOS_PUNTO:
        raise HTTPException(status_code=400, detail="Estado de punto invÃ¡lido")
    old_values = {"nombre": p.nombre, "estado": p.estado, "tipo": p.tipo}
    for key, value in data.items():
        setattr(p, key, value)
    db.flush()
    log_change(
        db,
        user_id=current_user.id,
        empresa_id=current_user.empresa_id,
        entity_type="PUNTO_VENTA",
        entity_id=p.id,
        action="UPDATE",
        old_values=old_values,
        new_values=data,
    )
    db.commit()
    db.refresh(p)
    return _serialize_punto(p)


@router.delete("/{punto_id}")
def eliminar_punto(punto_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_roles("admin"))):
    p = _get_punto(db, punto_id, current_user)
    log_change(
        db,
        user_id=current_user.id,
        empresa_id=current_user.empresa_id,
        entity_type="PUNTO_VENTA",
        entity_id=p.id,
        action="DELETE",
        old_values={"nombre": p.nombre},
        new_values=None,
    )
    db.delete(p)
    db.commit()
    return {"message": "Punto de venta eliminado"}


# ---------- INSTALACIONES ----------


@router.post("/{punto_id}/instalaciones", status_code=201)
def crear_instalacion(
    punto_id: int,
    payload: InstalacionIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(MODIFY_ROLES),
):
    p = _get_punto(db, punto_id, current_user)
    if payload.estado not in ESTADOS_INST:
        raise HTTPException(status_code=400, detail="Estado de instalaciÃ³n invÃ¡lido")

    eid = current_user.empresa_id
    eq_q = db.query(Equipment).filter(Equipment.id == payload.equipo_id)
    if eid:
        eq_q = eq_q.filter(Equipment.empresa_id == eid)
    if not eq_q.first():
        raise HTTPException(status_code=404, detail="Equipo no encontrado")

    # Si el equipo ya tiene una instalaciÃ³n activa en el mismo punto, avisamos mejor que duplicar.
    duplicada = (
        db.query(Instalacion)
        .filter(
            Instalacion.equipo_id == payload.equipo_id,
            Instalacion.punto_id == punto_id,
            Instalacion.estado == "activa",
        )
        .first()
    )
    if duplicada:
        raise HTTPException(status_code=400, detail="Ese equipo ya tiene una instalaciÃ³n activa en este punto")

    fecha = payload.fecha_instalacion or datetime.now()
    i = Instalacion(
        empresa_id=eid,
        punto_id=punto_id,
        equipo_id=payload.equipo_id,
        software=payload.software,
        fecha_instalacion=fecha,
        estado=payload.estado,
        observaciones=payload.observaciones,
    )
    db.add(i)

    # Registrar tambiÃ©n una atenciÃ³n tipo instalaciÃ³n automÃ¡tica.
    db.add(
        AtencionPunto(
            empresa_id=eid,
            punto_id=punto_id,
            fecha=fecha,
            tipo="instalacion",
            descripcion=f"InstalaciÃ³n de equipo {payload.equipo_id}"
            + (f" Â· {payload.software}" if payload.software else ""),
            tecnico=current_user.nombre,
        )
    )
    db.commit()
    db.refresh(i)
    return _serialize_instalacion(i)


@router.get("/{punto_id}/instalaciones")
def listar_instalaciones(
    punto_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_punto(db, punto_id, current_user)
    q = db.query(Instalacion).filter(Instalacion.punto_id == punto_id)
    if current_user.empresa_id:
        q = q.filter(Instalacion.empresa_id == current_user.empresa_id)
    insts = q.order_by(Instalacion.id.desc()).all()
    return [_serialize_instalacion(i) for i in insts]


@router.put("/instalaciones/{inst_id}")
def actualizar_instalacion(
    inst_id: int,
    payload: InstalacionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(MODIFY_ROLES),
):
    i = _get_instalacion(db, inst_id)
    data = payload.model_dump(exclude_unset=True)
    if data.get("estado") is not None and data["estado"] not in ESTADOS_INST:
        raise HTTPException(status_code=400, detail="Estado de instalaciÃ³n invÃ¡lido")
    old_values = {"estado": i.estado, "software": i.software}
    for key, value in data.items():
        setattr(i, key, value)
    db.flush()
    log_change(
        db,
        user_id=current_user.id,
        empresa_id=current_user.empresa_id,
        entity_type="INSTALACION",
        entity_id=i.id,
        action="UPDATE",
        old_values=old_values,
        new_values=data,
    )
    db.commit()
    db.refresh(i)
    return _serialize_instalacion(i)


@router.delete("/instalaciones/{inst_id}")
def eliminar_instalacion(
    inst_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "supervisor")),
):
    i = _get_instalacion(db, inst_id)
    db.delete(i)
    db.commit()
    return {"message": "InstalaciÃ³n eliminada"}


# ---------- ATENCIONES ----------


@router.post("/{punto_id}/atenciones", status_code=201)
def crear_atencion(
    punto_id: int,
    payload: AtencionPuntoIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(MODIFY_ROLES),
):
    p = _get_punto(db, punto_id, current_user)
    if payload.tipo not in TIPOS_ATENCION:
        raise HTTPException(status_code=400, detail="Tipo de atenciÃ³n invÃ¡lido")
    if payload.ticket_id is not None:
        tk = db.query(Ticket).filter(Ticket.id == payload.ticket_id).first()
        if not tk:
            raise HTTPException(status_code=404, detail="Ticket no encontrado")
    eid = current_user.empresa_id
    a = AtencionPunto(
        empresa_id=eid,
        punto_id=punto_id,
        ticket_id=payload.ticket_id,
        fecha=payload.fecha or datetime.now(),
        tipo=payload.tipo,
        descripcion=payload.descripcion,
        tecnico=payload.tecnico or current_user.nombre,
        resultado=payload.resultado,
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    return _serialize_atencion(a)


@router.get("/{punto_id}/atenciones")
def listar_atenciones(
    punto_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _get_punto(db, punto_id, current_user)
    q = db.query(AtencionPunto).filter(AtencionPunto.punto_id == punto_id)
    if current_user.empresa_id:
        q = q.filter(AtencionPunto.empresa_id == current_user.empresa_id)
    ats = q.order_by(AtencionPunto.fecha.desc()).all()
    return [_serialize_atencion(a) for a in ats]


@router.put("/atenciones/{atencion_id}")
def actualizar_atencion(
    atencion_id: int,
    payload: AtencionPuntoUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(MODIFY_ROLES),
):
    a = db.query(AtencionPunto).filter(AtencionPunto.id == atencion_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="AtenciÃ³n no encontrada")
    data = payload.model_dump(exclude_unset=True)
    if data.get("tipo") is not None and data["tipo"] not in TIPOS_ATENCION:
        raise HTTPException(status_code=400, detail="Tipo de atenciÃ³n invÃ¡lido")
    if data.get("ticket_id") is not None:
        tk = db.query(Ticket).filter(Ticket.id == data["ticket_id"]).first()
        if not tk:
            raise HTTPException(status_code=404, detail="Ticket no encontrado")
    old_values = {"tipo": a.tipo, "resultado": a.resultado}
    for key, value in data.items():
        setattr(a, key, value)
    db.flush()
    log_change(
        db,
        user_id=current_user.id,
        empresa_id=current_user.empresa_id,
        entity_type="ATENCION_PUNTO",
        entity_id=a.id,
        action="UPDATE",
        old_values=old_values,
        new_values=data,
    )
    db.commit()
    db.refresh(a)
    return _serialize_atencion(a)


@router.delete("/atenciones/{atencion_id}")
def eliminar_atencion(
    atencion_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "supervisor")),
):
    a = db.query(AtencionPunto).filter(AtencionPunto.id == atencion_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="AtenciÃ³n no encontrada")
    db.delete(a)
    db.commit()
    return {"message": "AtenciÃ³n eliminada"}