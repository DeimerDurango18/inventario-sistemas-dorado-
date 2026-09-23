"""Modelos operativos: instalaciones en sitio y atenciones de punto."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Instalacion(Base):
    __tablename__ = "instalaciones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    numero: Mapped[str] = mapped_column(String(30), unique=True, index=True, nullable=False)
    fecha: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    tipo_servicio: Mapped[str] = mapped_column(String(40), default="INSTALACION")
    descripcion: Mapped[str | None] = mapped_column(Text)
    fecha_programada: Mapped[datetime | None] = mapped_column(DateTime)
    fecha_ejecucion: Mapped[datetime | None] = mapped_column(DateTime)
    tecnico: Mapped[str | None] = mapped_column(String(120))
    cliente: Mapped[str | None] = mapped_column(String(120))
    activo_id: Mapped[int | None] = mapped_column(ForeignKey("activos.id"))
    ubicacion_id: Mapped[int | None] = mapped_column(ForeignKey("ubicaciones.id"))
    estado: Mapped[str] = mapped_column(String(20), default="PROGRAMADA")
    usuario_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    activo: Mapped["Activo | None"] = relationship(lazy="joined")
    ubicacion: Mapped["Ubicacion | None"] = relationship(lazy="joined")


class AtencionPunto(Base):
    __tablename__ = "atenciones_punto"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    numero: Mapped[str] = mapped_column(String(30), unique=True, index=True, nullable=False)
    fecha: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    nombre_punto: Mapped[str] = mapped_column(String(150), nullable=False)
    categoria: Mapped[str | None] = mapped_column(String(80))
    contacto: Mapped[str | None] = mapped_column(String(150))
    telefono: Mapped[str | None] = mapped_column(String(30))
    descripcion_problema: Mapped[str | None] = mapped_column(Text)
    estado: Mapped[str] = mapped_column(String(20), default="ABIERTA")
    solucion: Mapped[str | None] = mapped_column(Text)
    fecha_resuelta: Mapped[datetime | None] = mapped_column(DateTime)
    usuario_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())