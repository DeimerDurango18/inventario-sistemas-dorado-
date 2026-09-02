from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.maintenance import MaintenanceRecord
from app.models.equipment import Equipment
from app.schemas import MaintenanceIn

router = APIRouter()


@router.get("")
def listar(db: Session = Depends(get_db)):
    registros = db.query(MaintenanceRecord).order_by(MaintenanceRecord.id.desc()).all()
    resultado = []
    for r in registros:
        resultado.append(
            {
                "id": r.id,
                "equipo_id": r.equipo_id,
                "equipo_folio": r.equipo.folio if r.equipo else None,
                "tipo": r.tipo,
                "descripcion": r.descripcion,
                "tecnico": r.tecnico,
                "costo": float(r.costo) if r.costo is not None else None,
                "estado": r.estado,
                "fecha_programada": r.fecha_programada,
                "fecha_finalizado": r.fecha_finalizado,
            }
        )
    return resultado


@router.post("")
def crear(payload: MaintenanceIn, db: Session = Depends(get_db)):
    equipo = db.query(Equipment).filter(Equipment.id == payload.equipo_id).first()
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")

    registro = MaintenanceRecord(**payload.model_dump())
    if registro.estado == "en_proceso":
        equipo.estado = "reparacion"

    db.add(registro)
    db.commit()
    db.refresh(registro)
    return registro


@router.patch("/{registro_id}/estado")
def cambiar_estado(registro_id: int, estado: str, db: Session = Depends(get_db)):
    registro = db.query(MaintenanceRecord).filter(MaintenanceRecord.id == registro_id).first()
    if not registro:
        raise HTTPException(status_code=404, detail="Registro no encontrado")

    registro.estado = estado
    if estado == "finalizado":
        registro.fecha_finalizado = datetime.now(timezone.utc)
        if registro.equipo:
            registro.equipo.estado = "disponible"
    elif estado == "en_proceso" and registro.equipo:
        registro.equipo.estado = "reparacion"

    db.commit()
    db.refresh(registro)
    return registro
