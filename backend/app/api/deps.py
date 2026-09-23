from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.core.database import get_db
from app.core.errors import ForbiddenError, UnauthorizedError
from app.core.security import create_access_token, decode_access_token, verify_password
from app.models.user import Rol, Usuario
from app.schemas.user import TokenResponse, UsuarioRead
from app.services.numbering import set_current_user

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def _joined(user_id: int):
    return select(Usuario).where(Usuario.id == user_id).options(selectinload(Usuario.roles).selectinload(Rol.permisos))


def get_usuario_con_roles(db: Session, user_id: int) -> Optional[Usuario]:
    return db.scalar(_joined(user_id))


def authenticate(db: Session, username: str, password: str) -> Usuario:
    user = db.scalar(select(Usuario).where(Usuario.username == username))
    if not user or not user.activo:
        raise UnauthorizedError("Credenciales inválidas o usuario inactivo.")
    if not verify_password(password, user.password_hash or ""):
        raise UnauthorizedError("Credenciales inválidas.")
    user.last_login = datetime.now(timezone.utc).replace(tzinfo=None)
    db.commit()
    return user


def collect_permisos(roles: list[Rol]) -> set[str]:
    perms: set[str] = set()
    for rol in roles:
        if rol.activo:
            for p in rol.permisos:
                perms.add(p.codigo)
    return perms


def build_token_response(user: Usuario) -> TokenResponse:
    token = create_access_token(
        subject=str(user.id),
        claims={"username": user.username},
    )
    return TokenResponse(
        access_token=token,
        user=UsuarioRead.model_validate(user),
    )


def get_current_user(
    db: Session = Depends(get_db), token: Optional[str] = Depends(oauth2_scheme)
) -> Usuario:
    if not token:
        raise UnauthorizedError("Sesión requerida.")
    payload = decode_access_token(token)
    if not payload:
        raise UnauthorizedError("Sesión inválida o expirada.")
    try:
        user_id = int(payload.get("sub", 0))
    except (TypeError, ValueError):
        raise UnauthorizedError("Sesión inválida.")
    user = db.scalar(_joined(user_id))
    if not user or not user.activo:
        raise UnauthorizedError("Usuario inactivo o inexistente.")
    set_current_user(user)
    return user


def get_current_actor(
    db: Session = Depends(get_db), token: Optional[str] = Depends(oauth2_scheme)
) -> Optional[Usuario]:
    if not token:
        return None
    try:
        return get_current_user(db, token)
    except UnauthorizedError:
        return None


def require_permiso(*codigos: str):
    def inner(user: Usuario = Depends(get_current_user)) -> Usuario:
        user_perms = collect_permisos(user.roles)
        if not any(c in user_perms for c in codigos):
            raise ForbiddenError()
        return user

    return inner