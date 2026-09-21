from __future__ import annotations

from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.errors import ConflictError, NotFoundError
from app.core.security import hash_password
from app.models.user import Auditoria, Permiso, Rol, Usuario
from app.schemas.user import LoginRequest, RolCreate, RolUpdate, UsuarioCreate, UsuarioUpdate
from app.services.numbering import audit as audit_op


def _joined_roles_usuario():
    return selectinload(Usuario.roles).selectinload(Rol.permisos)


def get_usuario_by_username(db: Session, username: str) -> Optional[Usuario]:
    return db.scalar(
        select(Usuario).where(Usuario.username == username).options(_joined_roles_usuario())
    )


def get_usuario_by_id(db: Session, user_id: int) -> Optional[Usuario]:
    return db.scalar(select(Usuario).where(Usuario.id == user_id).options(_joined_roles_usuario()))


def list_usuarios(db: Session, q: str = "", activo: bool | None = None, page: int = 1, size: int = 20):
    stmt = select(Usuario).options(_joined_roles_usuario())
    if q:
        like = f"%{q}%"
        stmt = stmt.where(Usuario.nombre.ilike(like) | Usuario.username.ilike(like))
    if activo is not None:
        stmt = stmt.where(Usuario.activo == activo)
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = db.scalars(stmt.order_by(Usuario.id).offset((page - 1) * size).limit(size)).all()
    return rows, total


def create_usuario(db: Session, data: UsuarioCreate) -> Usuario:
    if get_usuario_by_username(db, data.username):
        raise ConflictError("El nombre de usuario ya existe.")
    if data.correo:
        dup = db.scalar(select(Usuario).where(Usuario.email == data.correo))
        if dup:
            raise ConflictError("El correo ya está registrado.")
    user = Usuario(
        username=data.username,
        email=data.correo or f"{data.username}@etiticos.local",
        password_hash=hash_password(data.password),
        nombre=data.nombre,
        documento=data.documento,
        telefono=data.telefono,
    )
    if data.rol_ids:
        user.roles = list(db.scalars(select(Rol).where(Rol.id.in_(data.rol_ids))).all())
    db.add(user)
    db.flush()
    audit_op(db, "USUARIOS", "Usuario", user.id, "CREAR", f"Usuario {data.username} creado")
    db.commit()
    return get_usuario_by_id(db, user.id)


def update_usuario(db: Session, user_id: int, data: UsuarioUpdate) -> Usuario:
    user = db.get(Usuario, user_id)
    if not user:
        raise NotFoundError("Usuario")
    if data.nombre is not None:
        user.nombre = data.nombre
    if data.correo not in (None, ""):
        dup = db.scalar(select(Usuario).where(Usuario.email == data.correo, Usuario.id != user_id))
        if dup:
            raise ConflictError("El correo ya está registrado.")
        user.email = data.correo
    if data.documento is not None:
        user.documento = data.documento
    if data.telefono is not None:
        user.telefono = data.telefono
    if data.activo is not None:
        user.activo = data.activo
    if data.password:
        user.password_hash = hash_password(data.password)
    if data.rol_ids is not None:
        user.roles = list(db.scalars(select(Rol).where(Rol.id.in_(data.rol_ids))).all())
    db.flush()
    audit_op(db, "USUARIOS", "Usuario", user.id, "EDITAR", f"Usuario {user.username} actualizado")
    db.commit()
    return get_usuario_by_id(db, user.id)


def deactivate_usuario(db: Session, user_id: int) -> Usuario:
    user = db.get(Usuario, user_id)
    if not user:
        raise NotFoundError("Usuario")
    user.activo = False
    db.flush()
    audit_op(db, "USUARIOS", "Usuario", user.id, "ANULAR", f"Usuario {user.username} desactivado")
    db.commit()
    return get_usuario_by_id(db, user.id)


def change_password(db: Session, user: Usuario, current: str, new: str) -> None:
    from app.core.security import verify_password

    if not verify_password(current, user.password_hash or ""):
        raise NotFoundError("La contraseña actual no es correcta.")
    user.password_hash = hash_password(new)
    db.flush()
    audit_op(db, "USUARIOS", "Usuario", user.id, "EDITAR", "Contraseña cambiada")
    db.commit()


def list_roles(db: Session) -> list[Rol]:
    return db.scalars(
        select(Rol).options(selectinload(Rol.permisos)).order_by(Rol.id)
    ).all()


def create_rol(db: Session, data: RolCreate) -> Rol:
    dup = db.scalar(select(Rol).where(Rol.codigo == data.codigo))
    if dup:
        raise ConflictError("Ya existe un rol con ese código.")
    rol = Rol(codigo=data.codigo, nombre=data.nombre, descripcion=data.descripcion)
    if data.permiso_ids:
        rol.permisos = db.scalars(select(Permiso).where(Permiso.id.in_(data.permiso_ids))).all()
    db.add(rol)
    db.flush()
    audit_op(db, "PERMISOS", "Rol", rol.id, "CREAR", f"Rol {data.codigo} creado")
    db.commit()
    return rol


def update_rol(db: Session, rol_id: int, data: RolUpdate) -> Rol:
    rol = db.get(Rol, rol_id)
    if not rol:
        raise NotFoundError("Rol")
    if data.nombre is not None:
        rol.nombre = data.nombre
    if data.descripcion is not None:
        rol.descripcion = data.descripcion
    if data.activo is not None:
        rol.activo = data.activo
    if data.permiso_ids is not None:
        rol.permisos = db.scalars(select(Permiso).where(Permiso.id.in_(data.permiso_ids))).all()
    db.flush()
    audit_op(db, "PERMISOS", "Rol", rol.id, "EDITAR", f"Rol {rol.codigo} actualizado")
    db.commit()
    return rol


def list_permisos(db: Session) -> list[Permiso]:
    return db.scalars(select(Permiso).order_by(Permiso.modulo, Permiso.id)).all()


def list_auditoria(db: Session, modulo: str | None = None, entidad_tipo: str | None = None, page: int = 1, size: int = 30):
    stmt = select(Auditoria)
    if modulo:
        stmt = stmt.where(Auditoria.modulo == modulo)
    if entidad_tipo:
        stmt = stmt.where(Auditoria.entidad_tipo == entidad_tipo)
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = db.scalars(stmt.order_by(Auditoria.fecha.desc()).offset((page - 1) * size).limit(size)).all()
    return rows, total