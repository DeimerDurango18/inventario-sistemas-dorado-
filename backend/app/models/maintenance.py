"""Modelos de mantenimiento: preventivo/correctivo, repuestos, costos y programaciones recurrentes."""

from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Mantenimiento(Base):
    __tablename__ = "mantenimientos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    numero: Mapped[str] = mapped_column(String(30), unique=True, index=True, nullable=False)
    activo_id: Mapped[int] = mapped_column(ForeignKey("activos.id"), nullable=False, index=True)
    tipo: Mapped[str] = mapped_column(String(30), nullable=False)
    fecha_programada: Mapped[datetime | None] = mapped_column(DateTime)
    fecha_ejecucion: Mapped[datetime | None] = mapped_column(DateTime)
    tecnico_id: Mapped[int | None] = mapped_column(ForeignKey("responsables.id"))
    diagnostico: Mapped[str | None] = mapped_column(Text)
    actividades: Mapped[str | None] = mapped_column(Text)
    resultado: Mapped[str | None] = mapped_column(String(500))
    costo: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))
    proveedor_id: Mapped[int | None] = mapped_column(ForeignKey("proveedores.id"))
    estado: Mapped[str] = mapped_column(String(20), default="PROGRAMADO")
    proxima_fecha: Mapped[datetime | None] = mapped_column(DateTime)
    observaciones: Mapped[str | None] = mapped_column(Text)
    usuario_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"))
    acta_id: Mapped[int | None] = mapped_column(ForeignKey("actas.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    activo: Mapped["Activo"] = relationship(lazy="joined")
    tecnico: Mapped["Responsable | None"] = relationship(lazy="joined")
    proveedor: Mapped["Proveedor | None"] = relationship(lazy="joined")
    repuestos: Mapped[list["MantenimientoRepuesto"]] = relationship(
        back_populates="mantenimiento", lazy="selectin"
    )


class MantenimientoRepuesto(Base):
    __tablename__ = "mantenimiento_repuestos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    mantenimiento_id: Mapped[int] = mapped_column(ForeignKey("mantenimientos.id"), nullable=False)
    nombre: Mapped[str] = mapped_column(String(150), nullable=False)
    cantidad: Mapped[int] = mapped_column(Integer, default=1)
    costo_unitario: Mapped[Decimal | None] = mapped_column(Numeric(14, 2))

    mantenimiento: Mapped["Mantenimiento"] = relationship(back_populates="repuestos")


class MantenimientoProgramacion(Base):
    __tablename__ = "mantenimiento_programaciones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    activo_id: Mapped[int] = mapped_column(ForeignKey("activos.id"), nullable=False)
    periodicidad_meses: Mapped[int] = mapped_column(Integer, default=6)
    ultimo_ejecutado: Mapped[datetime | None] = mapped_column(DateTime)
    proxima_fecha: Mapped[datetime | None] = mapped_column(DateTime)
    activo_flag: Mapped[bool] = mapped_column(Boolean, default=True, name="activo")

    activo: Mapped["Activo"] = relationship()