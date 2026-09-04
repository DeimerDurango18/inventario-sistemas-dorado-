from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.catalog import Location
from app.models.equipment import Equipment
from app.models.user import User
from app.schemas import LocationIn

router = APIRouter()

MODIFY_ROLES = require_roles("admin", "supervisor")


@router.get("")
def listar(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Location)
    if current_user.empresa_id:
        query = query.filter(Location.empresa_id == current_user.empresa_id)
    return query.order_by(Location.nombre).all()


@router.post("")
def crear(
    payload: LocationIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(MODIFY_ROLES),
):
    dup = db.query(Location).filter(Location.nombre == payload.nombre)
    if current_user.empresa_id:
        dup = dup.filter(Location.empresa_id == current_user.empresa_id)
    if dup.first():
        raise HTTPException(status_code=400, detail="La ubicación ya existe")
    ubicacion = Location(**payload.model_dump(), empresa_id=current_user.empresa_id)
    db.add(ubicacion)
    db.commit()
    db.refresh(ubicacion)
    return ubicacion


@router.put("/{ubicacion_id}")
def actualizar(
    ubicacion_id: int,
    payload: LocationIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(MODIFY_ROLES),
):
    query = db.query(Location).filter(Location.id == ubicacion_id)
    if current_user.empresa_id:
        query = query.filter(Location.empresa_id == current_user.empresa_id)
    ubicacion = query.first()
    if not ubicacion:
        raise HTTPException(status_code=404, detail="Ubicación no encontrada")
    dup = db.query(Location).filter(Location.nombre == payload.nombre, Location.id != ubicacion_id)
    if current_user.empresa_id:
        dup = dup.filter(Location.empresa_id == current_user.empresa_id)
    if dup.first():
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
    current_user: User = Depends(MODIFY_ROLES),
):
    query = db.query(Location).filter(Location.id == ubicacion_id)
    if current_user.empresa_id:
        query = query.filter(Location.empresa_id == current_user.empresa_id)
    ubicacion = query.first()
    if not ubicacion:
        raise HTTPException(status_code=404, detail="Ubicación no encontrada")
    eq_query = db.query(Equipment).filter(Equipment.ubicacion_id == ubicacion_id)
    if current_user.empresa_id:
        eq_query = eq_query.filter(Equipment.empresa_id == current_user.empresa_id)
    if eq_query.count():
        raise HTTPException(
            status_code=400,
            detail="No se puede eliminar: hay equipos asignados a esta ubicación",
        )
    db.delete(ubicacion)
    db.commit()
    return {"ok": True}
