from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.models.user import User
from app.schemas import LoginIn, TokenOut, UserIn

router = APIRouter()


def _serialize_user(u: User) -> dict:
    return {
        "id": u.id,
        "nombre": u.nombre,
        "correo": u.correo,
        "rol": u.rol,
        "activo": u.activo,
        "empresa_id": u.empresa_id,
    }


@router.post("/register", response_model=TokenOut)
def register(payload: UserIn, db: Session = Depends(get_db)):
    """Registro público. El primer usuario en registrarse se convierte en admin."""
    correo = payload.correo.lower().strip()
    if db.query(User).filter(User.correo == correo).first():
        raise HTTPException(status_code=400, detail="Ya existe un usuario con ese correo")
    if not payload.password or len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 6 caracteres")

    total = db.query(User).count()
    rol = "admin" if total == 0 else payload.rol or "operativo"
    usuario = User(
        nombre=payload.nombre,
        correo=correo,
        password=hash_password(payload.password),
        rol=rol,
        activo=True,
    )
    db.add(usuario)
    db.commit()
    db.refresh(usuario)

    token = create_access_token(usuario.id, usuario.rol)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": _serialize_user(usuario),
    }


@router.post("/login", response_model=TokenOut)
def login(payload: LoginIn, db: Session = Depends(get_db)):
    usuario = db.query(User).filter(User.correo == payload.correo.lower().strip()).first()
    if not usuario or not usuario.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not verify_password(payload.password, usuario.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if usuario.activo is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="El usuario está inactivo. Contacta al administrador.",
        )

    token = create_access_token(usuario.id, usuario.rol)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": _serialize_user(usuario),
    }


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return _serialize_user(current_user)
