"""Modelos transversales: notificaciones, tickets y parámetros de configuración."""

from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Notificacion(Base):
    __tablename__ = "notificaciones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tipo: Mapped[str] = mapped_column(String(40), nullable=False)
    titulo: Mapped[str] = mapped_column(String(200), nullable=False)
    mensaje: Mapped[str | None] = mapped_column(Text)
    entidad_tipo: Mapped[str | None] = mapped_column(String(40))
    entidad_id: Mapped[int | None] = mapped_column(Integer)
    leida: Mapped[bool] = mapped_column(Boolean, default=False)
    usuario_destino_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"))
    fecha_evento: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    usuario_destino: Mapped["Usuario | None"] = relationship()


class Ticket(Base):
    __tablename__ = "tickets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    numero: Mapped[str] = mapped_column(String(30), unique=True, index=True, nullable=False)
    fecha: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    sede_id: Mapped[int | None] = mapped_column(ForeignKey("sedes.id"))
    solicitante: Mapped[str | None] = mapped_column(String(150))
    categoria: Mapped[str | None] = mapped_column(String(80))
    prioridad: Mapped[str] = mapped_column(String(20), default="MEDIA")
    descripcion: Mapped[str | None] = mapped_column(Text)
    tecnico_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"))
    estado: Mapped[str] = mapped_column(String(20), default="ABIERTO")
    fecha_solucion: Mapped[datetime | None] = mapped_column(DateTime)
    solucion: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class Parametro(Base):
    __tablename__ = "configuracion"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    clave: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    valor: Mapped[str | None] = mapped_column(Text)
    descripcion: Mapped[str | None] = mapped_column(String(255))
    grupo: Mapped[str | None] = mapped_column(String(60))