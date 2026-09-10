"""Rutas de las Actas de Mantenimiento grupal.

Permite registrar en una sola acta todos los equipos revisados en una visita
(por ejemplo a una farmacia), guardando el serial y nombre/descripción de cada uno.
"""

from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.core.config import COMPANY
from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.acta_mantenimiento import ActaMantenimiento, ActaMantenimientoItem
from app.models.user import User
from app.schemas import ActaMantenimientoIn
from app.services.pdf_acta_mantenimiento_grupal import generar_acta_mantenimiento_grupal_pdf

router = APIRouter()
MODIFY_ROLES = require_roles("admin", "supervisor")

PDF_DIR = Path(__file__).resolve().parents[3] / "storage" / "actas_mantenimiento"
PDF_DIR.mkdir(parents=True, exist_ok=True)


def _numero_acta_mt(db: Session) -> str:
    from sqlalchemy import func
    from app.models.acta_mantenimiento import ActaMantenimiento as M
    max_id = db.query(func.max(M.id)).scalar() or 0
    return f"MTG-{max_id + 1:04d}"


def _serialize(acta: ActaMantenimiento) -> dict:
    return {
        "id": acta.id,
        "numero": acta.numero,
        "cliente": acta.cliente,
        "fecha": acta.fecha.isoformat() if acta.fecha else None,
        "tecnico": acta.tecnico,
        "observaciones": acta.observaciones,
        "prioridad": acta.prioridad,
        "cantidad_equipos": len(acta.items),
        "pdf_url": f"/api/actas-mantenimiento/{acta.id}/pdf",
        "created_at": acta.created_at.isoformat() if acta.created_at else None,
    }


@router.get("")
def listar(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(ActaMantenimiento).order_by(ActaMantenimiento.id.desc())
    if current_user.empresa_id:
        query = query.filter(ActaMantenimiento.empresa_id == current_user.empresa_id)
    return [_serialize(a) for a in query.all()]


@router.get("/{acta_id}")
def detalle(acta_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    acta = db.query(ActaMantenimiento).filter(ActaMantenimiento.id == acta_id).first()
    if not acta:
        raise HTTPException(status_code=404, detail="Acta de mantenimiento no encontrada")
    data = _serialize(acta)
    data["items"] = [
        {"id": it.id, "nombre_equipo": it.nombre_equipo, "serie": it.serie, "observaciones": it.observaciones, "equipo_id": it.equipo_id}
        for it in acta.items
    ]
    return data


@router.post("")
def crear(
    payload: ActaMantenimientoIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(MODIFY_ROLES),
):
    if not payload.items:
        raise HTTPException(status_code=400, detail="El acta debe contener al menos un equipo")

    eid = current_user.empresa_id
    numero = _numero_acta_mt(db)

    acta = ActaMantenimiento(
        empresa_id=eid,
        numero=numero,
        cliente=payload.cliente,
        tecnico=payload.tecnico,
        observaciones=payload.observaciones,
        prioridad=payload.prioridad,
    )
    db.add(acta)
    db.flush()

    for item in payload.items:
        db.add(ActaMantenimientoItem(
            acta_id=acta.id,
            nombre_equipo=item.nombre_equipo,
            serie=item.serie,
            observaciones=item.observaciones,
            equipo_id=item.equipo_id,
        ))

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Conflicto de consecutivo del acta. Presiona nuevamente 'Generar acta'.")
    db.refresh(acta)

    # Generar PDF inmediatamente
    items_full = db.query(ActaMantenimientoItem).filter(ActaMantenimientoItem.acta_id == acta.id).all()
    pdf_path = PDF_DIR / f"acta_mantenimiento_{acta.id}.pdf"
    generar_acta_mantenimiento_grupal_pdf(acta, items_full, COMPANY, pdf_path)
    acta.pdf_path = str(pdf_path)
    db.commit()

    data = _serialize(acta)
    data["items"] = [{"nombre_equipo": it.nombre_equipo, "serie": it.serie, "observaciones": it.observaciones} for it in items_full]
    return data


@router.get("/{acta_id}/pdf")
def descargar_pdf(acta_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    acta = db.query(ActaMantenimiento).filter(ActaMantenimiento.id == acta_id).first()
    if not acta:
        raise HTTPException(status_code=404, detail="Acta no encontrada")
    items = db.query(ActaMantenimientoItem).filter(ActaMantenimientoItem.acta_id == acta.id).all()
    pdf_path = PDF_DIR / f"acta_mantenimiento_{acta.id}.pdf"
    generar_acta_mantenimiento_grupal_pdf(acta, items, COMPANY, pdf_path)
    return FileResponse(str(pdf_path), media_type="application/pdf", filename=f"acta_mantenimiento_{acta.id}.pdf")


@router.get("/{acta_id}/verify")
def verificar(acta_id: int, db: Session = Depends(get_db)):
    acta = db.query(ActaMantenimiento).filter(ActaMantenimiento.id == acta_id).first()
    if not acta:
        raise HTTPException(status_code=404, detail="Acta no encontrada")
    items = db.query(ActaMantenimientoItem).filter(ActaMantenimientoItem.acta_id == acta.id).all()
    return {
        "estado": "Autentico",
        "numero": acta.numero,
        "cliente": acta.cliente,
        "tecnico": acta.tecnico,
        "fecha": acta.fecha.isoformat() if acta.fecha else None,
        "cantidad_equipos": len(items),
        "items": [{"nombre": it.nombre_equipo, "serie": it.serie} for it in items],
    }
