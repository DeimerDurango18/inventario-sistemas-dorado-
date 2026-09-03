from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import hash_password, require_roles
from app.models.user import User
from app.schemas import UserIn, UserUpdate

router = APIRouter()

ADMIN_ONLY = require_roles("admin")


def _serialize_user(u: User) -> dict:
    return {
        "id": u.id,
        "nombre": u.nombre,
        "correo": u.correo,
        "rol": u.rol,
        "activo": u.activo,
        "has_password": bool(u.password),
    }


@router.get("")
def listar(db: Session = Depends(get_db), _=Depends(ADMIN_ONLY)):
    usuarios = db.query(User).order_by(User.nombre).all()
    return [_serialize_user(u) for u in usuarios]


@router.post("")
def crear(payload: UserIn, db: Session = Depends(get_db), _=Depends(ADMIN_ONLY)):
    if db.query(User).filter(User.correo == payload.correo.lower().strip()).first():
        raise HTTPException(status_code=400, detail="Ya existe un usuario con ese correo")

    data = payload.model_dump()
    data["correo"] = data["correo"].lower().strip()
    if not data.get("password"):
        raise HTTPException(status_code=400, detail="La contraseña es obligatoria")
    data["password"] = hash_password(data["password"])

    usuario = User(**data)
    db.add(usuario)
    db.commit()
    db.refresh(usuario)
    return _serialize_user(usuario)


@router.patch("/{usuario_id}")
def actualizar(
    usuario_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    _=Depends(ADMIN_ONLY),
):
    usuario = db.query(User).filter(User.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    update_data = payload.model_dump(exclude_unset=True)
    if "password" in update_data:
        if not update_data["password"]:
            update_data.pop("password")
        else:
            update_data["password"] = hash_password(update_data["password"])
    if "correo" in update_data:
        update_data["correo"] = update_data["correo"].lower().strip()

    for key, value in update_data.items():
        setattr(usuario, key, value)

    db.commit()
    db.refresh(usuario)
    return _serialize_user(usuario)


@router.delete("/{usuario_id}")
def eliminar(
    usuario_id: int,
    db: Session = Depends(get_db),
    _=Depends(ADMIN_ONLY),
):
    usuario = db.query(User).filter(User.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if usuario.rol == "admin":
        admins = db.query(User).filter(User.rol == "admin", User.activo == True).count()
        if admins <= 1:
            raise HTTPException(status_code=400, detail="No se puede eliminar al único administrador activo")
    db.delete(usuario)
    db.commit()
    return {"ok": True}
