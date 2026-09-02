from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.schemas import UserIn

router = APIRouter()


@router.get("")
def listar(db: Session = Depends(get_db)):
    return db.query(User).order_by(User.nombre).all()


@router.post("")
def crear(payload: UserIn, db: Session = Depends(get_db)):
    if db.query(User).filter(User.correo == payload.correo).first():
        raise HTTPException(status_code=400, detail="Ya existe un usuario con ese correo")
    usuario = User(**payload.model_dump())
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return usuario


@router.patch("/{usuario_id}")
def actualizar(usuario_id: int, payload: UserIn, db: Session = Depends(get_db)):
    usuario = db.query(User).filter(User.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    for key, value in payload.model_dump().items():
        setattr(usuario, key, value)
    db.commit()
    db.refresh(usuario)
    return usuario


@router.delete("/{usuario_id}")
def eliminar(usuario_id: int, db: Session = Depends(get_db)):
    usuario = db.query(User).filter(User.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    db.delete(usuario)
    db.commit()
    return {"ok": True}
