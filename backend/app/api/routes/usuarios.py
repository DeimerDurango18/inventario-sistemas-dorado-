from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import hash_password, require_roles
from app.models.user import User
from app.schemas import UserIn, UserUpdate

router = APIRouter()

ADMIN_ONLY = require_roles("admin")
VALID_ROLES = {"admin", "supervisor", "operativo"}


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
def listar(db: Session = Depends(get_db), current_user: User = Depends(ADMIN_ONLY)):
    query = db.query(User)
    if current_user.empresa_id:
        query = query.filter(User.empresa_id == current_user.empresa_id)
    usuarios = query.order_by(User.nombre).all()
    return [_serialize_user(u) for u in usuarios]


@router.post("")
def crear(payload: UserIn, db: Session = Depends(get_db), current_user: User = Depends(ADMIN_ONLY)):
    if db.query(User).filter(User.correo == payload.correo.lower().strip()).first():
        raise HTTPException(status_code=400, detail="Ya existe un usuario con ese correo")

    data = payload.model_dump()
    data["correo"] = data["correo"].lower().strip()
    if not data.get("password"):
        raise HTTPException(status_code=400, detail="La contraseña es obligatoria")
    if len(data["password"]) < 6:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 6 caracteres")
    if data.get("rol") not in VALID_ROLES:
        raise HTTPException(status_code=400, detail="El rol indicado no es válido")
    data["password"] = hash_password(data["password"])
    data["empresa_id"] = current_user.empresa_id

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
    current_user: User = Depends(ADMIN_ONLY),
):
    usuario = db.query(User).filter(User.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if current_user.empresa_id and usuario.empresa_id != current_user.empresa_id:
        raise HTTPException(status_code=403, detail="Sin acceso a este usuario")

    update_data = payload.model_dump(exclude_unset=True)
    if "rol" in update_data and update_data["rol"] not in VALID_ROLES:
        raise HTTPException(status_code=400, detail="El rol indicado no es válido")
    if "password" in update_data:
        if not update_data["password"]:
            update_data.pop("password")
        else:
            update_data["password"] = hash_password(update_data["password"])
    if "correo" in update_data:
        update_data["correo"] = update_data["correo"].lower().strip()
        existente = db.query(User).filter(User.correo == update_data["correo"], User.id != usuario_id).first()
        if existente:
            raise HTTPException(status_code=400, detail="Ya existe un usuario con ese correo")

    # Evita dejar la instalación sin un administrador activo, incluso al
    # desactivar o degradar una cuenta en vez de eliminarla.
    deja_de_ser_admin = usuario.rol == "admin" and (
        update_data.get("rol") not in (None, "admin") or update_data.get("activo") is False
    )
    if deja_de_ser_admin:
        admins = db.query(User).filter(User.rol == "admin", User.activo == True, User.id != usuario_id).count()
        if admins == 0:
            raise HTTPException(status_code=400, detail="No se puede desactivar ni cambiar el rol del único administrador activo")

    for key, value in update_data.items():
        setattr(usuario, key, value)

    db.commit()
    db.refresh(usuario)
    return _serialize_user(usuario)


@router.delete("/{usuario_id}")
def eliminar(
    usuario_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(ADMIN_ONLY),
):
    usuario = db.query(User).filter(User.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if current_user.empresa_id and usuario.empresa_id != current_user.empresa_id:
        raise HTTPException(status_code=403, detail="Sin acceso a este usuario")
    if usuario.id == current_user.id:
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propia cuenta")
    if usuario.rol == "admin":
        admins = db.query(User).filter(User.rol == "admin", User.activo == True).count()
        if admins <= 1:
            raise HTTPException(status_code=400, detail="No se puede eliminar al único administrador activo")
    db.delete(usuario)
    db.commit()
    return {"ok": True}
