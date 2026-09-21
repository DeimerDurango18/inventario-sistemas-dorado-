"""Modelos de garantías, bajas e historial documental (actas, firmas y archivos)."""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Garantia(Base):
    __tablename__ = "garantias"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    activo_id: Mapped[int] = mapped_column(ForeignKey("activos.id"), nullable=False, index=True)
    proveedor_id: Mapped[int | None] = mapped_column(ForeignKey("proveedores.id"))
    fabricante: Mapped[str | None] = mapped_column(String(150))
    fecha_compra: Mapped[datetime | None] = mapped_column(DateTime)
    inicio: Mapped[datetime | None] = mapped_column(DateTime)
    fin: Mapped[datetime | None] = mapped_column(DateTime)
    condiciones: Mapped[str | None] = mapped_column(Text)
    documento: Mapped[str | None] = mapped_column(String(300))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    activo: Mapped["Activo"] = relationship()
    proveedor: Mapped["Proveedor | None"] = relationship()


class Baja(Base):
    __tablename__ = "bajas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    numero: Mapped[str] = mapped_column(String(30), unique=True, index=True, nullable=False)
    activo_id: Mapped[int] = mapped_column(ForeignKey("activos.id"), nullable=False)
    motivo_tipo: Mapped[str] = mapped_column(String(40), nullable=False)
    motivo_descripcion: Mapped[str | None] = mapped_column(Text)
    estado_fisico: Mapped[str | None] = mapped_column(String(300))
    fecha_solicitud: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    fecha_aprobacion: Mapped[datetime | None] = mapped_column(DateTime)
    estado: Mapped[str] = mapped_column(String(20), default="SOLICITADA")
    solicitante_id: Mapped[int | None] = mapped_column(ForeignKey("responsables.id"))
    aprobador_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"))
    usuario_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"))
    acta_id: Mapped[int | None] = mapped_column(ForeignKey("actas.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    activo: Mapped["Activo"] = relationship(lazy="joined")


class Acta(Base):
    __tablename__ = "actas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    numero: Mapped[str] = mapped_column(String(30), unique=True, index=True, nullable=False)
    tipo: Mapped[str] = mapped_column(String(40), nullable=False)
    fecha: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    activo_id: Mapped[int | None] = mapped_column(ForeignKey("activos.id"))
    movimiento_id: Mapped[int | None] = mapped_column(ForeignKey("movimientos.id"))
    operacion_tipo: Mapped[str | None] = mapped_column(String(40))
    operacion_id: Mapped[int | None] = mapped_column(Integer)
    ruta_pdf: Mapped[str | None] = mapped_column(String(300))
    observaciones: Mapped[str | None] = mapped_column(Text)
    usuario_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"))
    estado: Mapped[str] = mapped_column(String(20), default="GENERADA")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    activo: Mapped["Activo | None"] = relationship(lazy="joined")
    firmas: Mapped[list["ActaFirma"]] = relationship(back_populates="acta", lazy="selectin")


class ActaFirma(Base):
    __tablename__ = "acta_firmas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    acta_id: Mapped[int] = mapped_column(ForeignKey("actas.id"), nullable=False)
    rol_firmante: Mapped[str] = mapped_column(String(30), nullable=False)
    responsable_id: Mapped[int | None] = mapped_column(ForeignKey("responsables.id"))
    nombre: Mapped[str | None] = mapped_column(String(150))
    documento: Mapped[str | None] = mapped_column(String(30))
    fecha: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    ruta_firma: Mapped[str | None] = mapped_column(String(300))

    acta: Mapped["Acta"] = relationship(back_populates="firmas")


class Archivo(Base):
    __tablename__ = "archivos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    entidad_tipo: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    entidad_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    tipo_documento: Mapped[str] = mapped_column(String(40), nullable=False)
    nombre_original: Mapped[str] = mapped_column(String(255), nullable=False)
    ruta: Mapped[str] = mapped_column(String(500), nullable=False)
    mime: Mapped[str | None] = mapped_column(String(100))
    tamano: Mapped[int | None] = mapped_column(Integer)
    usuario_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())