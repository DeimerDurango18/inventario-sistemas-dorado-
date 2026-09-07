from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.equipment import Equipment
from app.models.ticket import Ticket
from app.models.user import User
from app.schemas import TicketIn, TicketUpdate
from app.services.audit_service import log_change

router = APIRouter()

MODIFY_ROLES = require_roles("admin", "supervisor")

ESTADOS = {"abierto", "en_visita", "resuelto", "cerrado"}
PRIORIDADES = {"baja", "media", "alta"}


def _serialize(t: Ticket) -> dict:
    equipo = t.equipo
    return {
        "id": t.id,
        "titulo": t.titulo,
        "descripcion": t.descripcion,
        "prioridad": t.prioridad,
        "estado": t.estado,
        "tecnico": t.tecnico,
        "equipo_id": t.equipo_id,
        "equipo_folio": f"{equipo.folio} - {equipo.marca} {equipo.modelo}" if equipo else None,
        "ubicacion_id": t.ubicacion_id,
        "ubicacion_nombre": t.ubicacion.nombre if t.ubicacion else None,
        "fecha_visita": t.fecha_visita.isoformat() if t.fecha_visita else None,
        "fecha_resolucion": t.fecha_resolucion.isoformat() if t.fecha_resolucion else None,
        "creado_por": t.creado_por,
        "created_at": t.created_at.isoformat() if t.created_at else None,
    }


@router.get("")
def listar(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Ticket)
    if current_user.empresa_id:
        query = query.filter(Ticket.empresa_id == current_user.empresa_id)
    tickets = query.order_by(Ticket.id.desc()).all()
    return [_serialize(t) for t in tickets]


@router.get("/{ticket_id}")
def obtener(ticket_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    t = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")
    return _serialize(t)


@router.post("", status_code=201)
def crear(payload: TicketIn, db: Session = Depends(get_db), current_user: User = Depends(MODIFY_ROLES)):
    if payload.estado not in ESTADOS:
        raise HTTPException(status_code=400, detail=f"Estado inválido. Usa: {', '.join(sorted(ESTADOS))}")
    if payload.prioridad not in PRIORIDADES:
        raise HTTPException(status_code=400, detail=f"Prioridad inválida. Usa: {', '.join(sorted(PRIORIDADES))}")

    eid = current_user.empresa_id
    if payload.equipo_id:
        eq = db.query(Equipment).filter(Equipment.id == payload.equipo_id)
        if eid:
            eq = eq.filter(Equipment.empresa_id == eid)
        if not eq.first():
            raise HTTPException(status_code=404, detail="Equipo no encontrado")

    hoy = datetime.now(timezone.utc)
    t = Ticket(
        empresa_id=eid,
        titulo=payload.titulo,
        descripcion=payload.descripcion,
        prioridad=payload.prioridad,
        estado=payload.estado,
        tecnico=payload.tecnico,
        equipo_id=payload.equipo_id,
        ubicacion_id=payload.ubicacion_id,
        fecha_visita=hoy if payload.estado == "en_visita" else None,
        creado_por=current_user.nombre,
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return _serialize(t)


@router.put("/{ticket_id}")
def actualizar(
    ticket_id: int,
    payload: TicketUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(MODIFY_ROLES),
):
    t = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    old_values = {
        "titulo": t.titulo,
        "descripcion": t.descripcion,
        "prioridad": t.prioridad,
        "estado": t.estado,
        "tecnico": t.tecnico,
        "equipo_id": t.equipo_id,
        "ubicacion_id": t.ubicacion_id,
    }

    data = payload.model_dump(exclude_unset=True)
    if data.get("estado") is not None and data["estado"] not in ESTADOS:
        raise HTTPException(status_code=400, detail=f"Estado inválido. Usa: {', '.join(sorted(ESTADOS))}")

    for key, value in data.items():
        setattr(t, key, value)

    if payload.estado == "en_visita" and not t.fecha_visita:
        t.fecha_visita = datetime.now(timezone.utc)
    if payload.estado in ("resuelto", "cerrado") and not t.fecha_resolucion:
        t.fecha_resolucion = datetime.now(timezone.utc)

    db.flush()
    log_change(
        db,
        user_id=current_user.id,
        empresa_id=current_user.empresa_id,
        entity_type="TICKET",
        entity_id=t.id,
        action="UPDATE",
        old_values=old_values,
        new_values=data,
    )
    db.commit()
    db.refresh(t)
    return _serialize(t)


@router.delete("/{ticket_id}")
def eliminar(ticket_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_roles("admin"))):
    t = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")
    log_change(
        db,
        user_id=current_user.id,
        empresa_id=current_user.empresa_id,
        entity_type="TICKET",
        entity_id=t.id,
        action="DELETE",
        old_values={"titulo": t.titulo},
        new_values=None,
    )
    db.delete(t)
    db.commit()
    return {"message": "Ticket eliminado"}