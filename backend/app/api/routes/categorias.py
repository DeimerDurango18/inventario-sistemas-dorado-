from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.catalog import Category
from app.schemas import CategoryIn

router = APIRouter()


@router.get("")
def listar(db: Session = Depends(get_db)):
    return db.query(Category).order_by(Category.nombre).all()


@router.post("")
def crear(payload: CategoryIn, db: Session = Depends(get_db)):
    if db.query(Category).filter(Category.nombre == payload.nombre).first():
        raise HTTPException(status_code=400, detail="La categoría ya existe")
    categoria = Category(**payload.model_dump())
    db.add(categoria)
    db.commit()
    db.refresh(categoria)
    return categoria


@router.delete("/{categoria_id}")
def eliminar(categoria_id: int, db: Session = Depends(get_db)):
    categoria = db.query(Category).filter(Category.id == categoria_id).first()
    if not categoria:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    db.delete(categoria)
    db.commit()
    return {"ok": True}
