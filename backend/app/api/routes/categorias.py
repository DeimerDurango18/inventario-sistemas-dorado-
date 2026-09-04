from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.catalog import Category
from app.models.equipment import Equipment
from app.models.user import User
from app.schemas import CategoryIn

router = APIRouter()

MODIFY_ROLES = require_roles("admin", "supervisor")


@router.get("")
def listar(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Category)
    if current_user.empresa_id:
        query = query.filter(Category.empresa_id == current_user.empresa_id)
    return query.order_by(Category.nombre).all()


@router.post("")
def crear(
    payload: CategoryIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(MODIFY_ROLES),
):
    dup = db.query(Category).filter(Category.nombre == payload.nombre)
    if current_user.empresa_id:
        dup = dup.filter(Category.empresa_id == current_user.empresa_id)
    if dup.first():
        raise HTTPException(status_code=400, detail="La categoría ya existe")
    categoria = Category(**payload.model_dump(), empresa_id=current_user.empresa_id)
    db.add(categoria)
    db.commit()
    db.refresh(categoria)
    return categoria


@router.put("/{categoria_id}")
def actualizar(
    categoria_id: int,
    payload: CategoryIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(MODIFY_ROLES),
):
    query = db.query(Category).filter(Category.id == categoria_id)
    if current_user.empresa_id:
        query = query.filter(Category.empresa_id == current_user.empresa_id)
    categoria = query.first()
    if not categoria:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    dup = db.query(Category).filter(Category.nombre == payload.nombre, Category.id != categoria_id)
    if current_user.empresa_id:
        dup = dup.filter(Category.empresa_id == current_user.empresa_id)
    if dup.first():
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
    current_user: User = Depends(MODIFY_ROLES),
):
    query = db.query(Category).filter(Category.id == categoria_id)
    if current_user.empresa_id:
        query = query.filter(Category.empresa_id == current_user.empresa_id)
    categoria = query.first()
    if not categoria:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    eq_query = db.query(Equipment).filter(Equipment.categoria_id == categoria_id)
    if current_user.empresa_id:
        eq_query = eq_query.filter(Equipment.empresa_id == current_user.empresa_id)
    if eq_query.count():
        raise HTTPException(
            status_code=400,
            detail="No se puede eliminar: hay equipos asignados a esta categoría",
        )
    db.delete(categoria)
    db.commit()
    return {"ok": True}
