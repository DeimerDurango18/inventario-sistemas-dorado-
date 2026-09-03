from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_roles
from app.models.catalog import Location
from app.models.equipment import Equipment
from app.schemas import LocationIn

router = APIRouter()

MODIFY_ROLES = require_roles("admin", "supervisor")


@router.get("")
def listar(db: Session = Depends(get_db)):
    return db.query(Location).order_by(Location.nombre).all()


@router.post("")
def crear(
    payload: LocationIn,
    db: Session = Depends(get_db),
    _=Depends(MODIFY_ROLES),
):
    if db.query(Location).filter(Location.nombre == payload.nombre).first():
        raise HTTPException(status_code=400, detail="La ubicación ya existe")
    ubicacion = Location(**payload.model_dump())
    db.add(ubicacion)
    db.commit()
    db.refresh(ubicacion)
    return ubicacion


@router.put("/{ubicacion_id}")
def actualizar(
    ubicacion_id: int,
    payload: LocationIn,
    db: Session = Depends(get_db),
    _=Depends(MODIFY_ROLES),
):
    ubicacion = db.query(Location).filter(Location.id == ubicacion_id).first()
    if not ubicacion:
        raise HTTPException(status_code=404, detail="Ubicación no encontrada")
    otro = (
        db.query(Location)
        .filter(Location.nombre == payload.nombre, Location.id != ubicacion_id)
        .first()
    )
    if otro:
        raise HTTPException(status_code=400, detail="Ya existe una ubicación con ese nombre")
    for key, value in payload.model_dump().items():
        setattr(ubicacion, key, value)
    db.commit()
    db.refresh(ubicacion)
    return ubicacion


@router.delete("/{ubicacion_id}")
def eliminar(
    ubicacion_id: int,
    db: Session = Depends(get_db),
    _=Depends(MODIFY_ROLES),
):
    ubicacion = db.query(Location).filter(Location.id == ubicacion_id).first()
    if not ubicacion:
        raise HTTPException(status_code=404, detail="Ubicación no encontrada")
    if db.query(Equipment).filter(Equipment.ubicacion_id == ubicacion_id).count():
        raise HTTPException(
            status_code=400,
            detail="No se puede eliminar: hay equipos asignados a esta ubicación",
        )
    db.delete(ubicacion)
    db.commit()
    return {"ok": True}
