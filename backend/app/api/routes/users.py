from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_permiso
from app.core.database import get_db
from app.models.user import Usuario
from app.schemas.common import Paginated
from app.schemas.user import (
    AuditLogRead,
    PermisoRead,
    RolCreate,
    RolRead,
    RolUpdate,
    UsuarioCreate,
    UsuarioRead,
    UsuarioUpdate,
)
from app.services import auth_service

router = APIRouter(prefix="/usuarios", tags=["Usuarios y roles"])


@router.get("", response_model=Paginated[UsuarioRead])
def list_usuarios(
    q: str = "",
    activo: bool | None = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("gestionar_usuarios")),
):
    rows, total = auth_service.list_usuarios(db, q, activo, page, size)
    return Paginated(items=rows, total=total, page=page, page_size=size, pages=-(total // -size))


@router.post("", response_model=UsuarioRead, status_code=201)
def crear_usuario(
    data: UsuarioCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("gestionar_usuarios")),
):
    return auth_service.create_usuario(db, data)


@router.put("/{user_id}", response_model=UsuarioRead)
def editar_usuario(
    user_id: int,
    data: UsuarioUpdate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("gestionar_usuarios")),
):
    return auth_service.update_usuario(db, user_id, data)


@router.delete("/{user_id}", response_model=UsuarioRead)
def desactivar_usuario(
    user_id: int,
    db: Session = Depends(get_db),
    token_user: Usuario = Depends(require_permiso("gestionar_usuarios")),
):
    if user_id == token_user.id:
        from app.core.errors import ConflictError

        raise ConflictError("No puede desactivar su propio usuario.")
    return auth_service.deactivate_usuario(db, user_id)


# ------------------------------------------------------------------ roles/permisos
@router.get("/roles", response_model=list[RolRead])
def listar_roles(
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("gestionar_usuarios", "ver_activos")),
):
    return auth_service.list_roles(db)


@router.post("/roles", response_model=RolRead, status_code=201)
def crear_rol(
    data: RolCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("gestionar_usuarios")),
):
    return auth_service.create_rol(db, data)


@router.put("/roles/{rol_id}", response_model=RolRead)
def editar_rol(
    rol_id: int,
    data: RolUpdate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("gestionar_usuarios")),
):
    return auth_service.update_rol(db, rol_id, data)


@router.get("/permisos", response_model=list[PermisoRead])
def listar_permisos(
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("gestionar_usuarios", "ver_activos")),
):
    return auth_service.list_permisos(db)


@router.get("/auditoria", response_model=Paginated[AuditLogRead])
def listar_auditoria(
    modulo: str | None = None,
    entidad: str | None = None,
    page: int = Query(1, ge=1),
    size: int = Query(30, ge=1, le=200),
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("ver_auditoria")),
):
    rows, total = auth_service.list_auditoria(db, modulo, entidad, page, size)
    return Paginated(items=rows, total=total, page=page, page_size=size, pages=-(total // -size))