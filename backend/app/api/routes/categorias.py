from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_roles
from app.models.catalog import Category
from app.models.equipment import Equipment
from app.schemas import CategoryIn

router = APIRouter()

MODIFY_ROLES = require_roles("admin", "supervisor")


@router.get("")
def listar(db: Session = Depends(get_db)):
    return db.query(Category).order_by(Category.nombre).all()


@router.post("")
def crear(
    payload: CategoryIn,
    db: Session = Depends(get_db),
    _=Depends(MODIFY_ROLES),
):
    if db.query(Category).filter(Category.nombre == payload.nombre).first():
        raise HTTPException(status_code=400, detail="La categoría ya existe")
    categoria = Category(**payload.model_dump())
    db.add(categoria)
    db.commit()
    db.refresh(categoria)
    return categoria


@router.put("/{categoria_id}")
def actualizar(
    categoria_id: int,
    payload: CategoryIn,
    db: Session = Depends(get_db),
    _=Depends(MODIFY_ROLES),
):
    categoria = db.query(Category).filter(Category.id == categoria_id).first()
    if not categoria:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    otro = (
        db.query(Category)
        .filter(Category.nombre == payload.nombre, Category.id != categoria_id)
        .first()
    )
    if otro:
        raise HTTPException(status_code=400, detail="Ya existe una categoría con ese nombre")
    for key, value in payload.model_dump().items():
        setattr(categoria, key, value)
    db.commit()
    db.refresh(categoria)
    return categoria


@router.delete("/{categoria_id}")
def eliminar(
    categoria_id: int,
    db: Session = Depends(get_db),
    _=Depends(MODIFY_ROLES),
):
    categoria = db.query(Category).filter(Category.id == categoria_id).first()
    if not categoria:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    if db.query(Equipment).filter(Equipment.categoria_id == categoria_id).count():
        raise HTTPException(
            status_code=400,
            detail="No se puede eliminar: hay equipos asignados a esta categoría",
        )
    db.delete(categoria)
    db.commit()
    return {"ok": True}
