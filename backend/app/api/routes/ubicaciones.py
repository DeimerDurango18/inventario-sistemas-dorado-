from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.catalog import Location
from app.schemas import LocationIn

router = APIRouter()


@router.get("")
def listar(db: Session = Depends(get_db)):
    return db.query(Location).order_by(Location.nombre).all()


@router.post("")
def crear(payload: LocationIn, db: Session = Depends(get_db)):
    if db.query(Location).filter(Location.nombre == payload.nombre).first():
        raise HTTPException(status_code=400, detail="La ubicación ya existe")
    ubicacion = Location(**payload.model_dump())
    db.add(ubicacion)
    db.commit()
    db.refresh(ubicacion)
    return ubicacion


@router.delete("/{ubicacion_id}")
def eliminar(ubicacion_id: int, db: Session = Depends(get_db)):
    ubicacion = db.query(Location).filter(Location.id == ubicacion_id).first()
    if not ubicacion:
        raise HTTPException(status_code=404, detail="Ubicación no encontrada")
    db.delete(ubicacion)
    db.commit()
    return {"ok": True}
