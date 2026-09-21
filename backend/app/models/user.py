"""Modelos de seguridad: usuarios, roles y permisos con granularidad por operación."""

from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Table, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

usuario_roles = Table(
    "usuario_roles",
    Base.metadata,
    Column("usuario_id", Integer, ForeignKey("usuarios.id"), primary_key=True),
    Column("rol_id", Integer, ForeignKey("roles.id"), primary_key=True),
)

rol_permisos = Table(
    "rol_permisos",
    Base.metadata,
    Column("rol_id", Integer, ForeignKey("roles.id"), primary_key=True),
    Column("permiso_id", Integer, ForeignKey("permisos.id"), primary_key=True),
)


class Rol(Base):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    codigo: Mapped[str] = mapped_column(String(30), unique=True, index=True, nullable=False)
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    descripcion: Mapped[str | None] = mapped_column(String(255))
    activo: Mapped[bool] = mapped_column(Boolean, default=True)

    permisos: Mapped[list["Permiso"]] = relationship(
        secondary=rol_permisos, back_populates="roles", lazy="selectin"
    )
    usuarios: Mapped[list["Usuario"]] = relationship(
        secondary=usuario_roles, back_populates="roles", lazy="selectin"
    )


class Permiso(Base):
    __tablename__ = "permisos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    codigo: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    nombre: Mapped[str] = mapped_column(String(120), nullable=False)
    modulo: Mapped[str | None] = mapped_column(String(60))

    roles: Mapped[list["Rol"]] = relationship(
        secondary=rol_permisos, back_populates="permisos", lazy="selectin"
    )


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(150), unique=True, index=True, nullable=False)
    password_hash: Mapped[str | None] = mapped_column(String(255))
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    documento: Mapped[str | None] = mapped_column(String(30), index=True)
    telefono: Mapped[str | None] = mapped_column(String(30))
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    last_login: Mapped[datetime | None] = mapped_column(DateTime)

    roles: Mapped[list["Rol"]] = relationship(
        secondary=usuario_roles, back_populates="usuarios", lazy="selectin"
    )


class Auditoria(Base):
    __tablename__ = "auditoria"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    usuario_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("usuarios.id"), index=True)
    fecha: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), index=True)
    accion: Mapped[str] = mapped_column(String(30), nullable=False)
    modulo: Mapped[str] = mapped_column(String(60), nullable=False)
    entidad_tipo: Mapped[str | None] = mapped_column(String(50), index=True)
    entidad_id: Mapped[int | None] = mapped_column(Integer, index=True)
    campo: Mapped[str | None] = mapped_column(String(100))
    valor_anterior: Mapped[str | None] = mapped_column(String(4000))
    valor_nuevo: Mapped[str | None] = mapped_column(String(4000))
    ip: Mapped[str | None] = mapped_column(String(50))
    user_agent: Mapped[str | None] = mapped_column(String(255))