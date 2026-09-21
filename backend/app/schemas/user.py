from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel

from app.schemas.common import ORMModel


class PermisoRead(ORMModel):
    id: int
    codigo: str
    nombre: str
    modulo: Optional[str] = None


class RolRead(ORMModel):
    id: int
    codigo: str
    nombre: str
    descripcion: Optional[str] = None
    activo: bool
    permisos: List[PermisoRead] = []


class RolCreate(BaseModel):
    codigo: str
    nombre: str
    descripcion: Optional[str] = None
    permiso_ids: List[int] = []


class RolUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    activo: Optional[bool] = None
    permiso_ids: Optional[List[int]] = None


class UsuarioBase(BaseModel):
    username: str
    correo: Optional[str] = None
    nombre: str
    documento: Optional[str] = None
    telefono: Optional[str] = None


class UsuarioCreate(UsuarioBase):
    password: str
    rol_ids: List[int] = []


class UsuarioUpdate(BaseModel):
    correo: Optional[str] = None
    nombre: Optional[str] = None
    documento: Optional[str] = None
    telefono: Optional[str] = None
    activo: Optional[bool] = None
    password: Optional[str] = None
    rol_ids: Optional[List[int]] = None


class UsuarioRead(ORMModel):
    id: int
    username: str
    correo: Optional[str] = None
    nombre: str
    documento: Optional[str] = None
    telefono: Optional[str] = None
    activo: bool
    created_at: datetime
    last_login: Optional[datetime] = None
    roles: List[RolRead] = []


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UsuarioRead


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    new_password2: str


class AuditLogRead(ORMModel):
    id: int
    usuario_id: Optional[int] = None
    fecha: datetime
    accion: str
    modulo: str
    entidad_tipo: Optional[str] = None
    entidad_id: Optional[int] = None
    campo: Optional[str] = None
    valor_anterior: Optional[str] = None
    valor_nuevo: Optional[str] = None
    ip: Optional[str] = None