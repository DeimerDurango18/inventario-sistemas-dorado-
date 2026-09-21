"""Modelos de préstamos y sus accesorios entregados/devueltos."""

from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Prestamo(Base):
    __tablename__ = "prestamos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    numero: Mapped[str] = mapped_column(String(30), unique=True, index=True, nullable=False)
    activo_id: Mapped[int] = mapped_column(ForeignKey("activos.id"), nullable=False)
    solicitante_id: Mapped[int | None] = mapped_column(ForeignKey("responsables.id"))
    responsable_id: Mapped[int | None] = mapped_column(ForeignKey("responsables.id"))
    fecha_prestamo: Mapped[datetime | None] = mapped_column(DateTime)
    fecha_prevista_devolucion: Mapped[datetime | None] = mapped_column(DateTime)
    fecha_devolucion_real: Mapped[datetime | None] = mapped_column(DateTime)
    estado: Mapped[str] = mapped_column(String(20), default="SOLICITADO")
    motivo: Mapped[str | None] = mapped_column(String(255))
    observaciones: Mapped[str | None] = mapped_column(String(1000))
    usuario_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"))
    acta_id: Mapped[int | None] = mapped_column(ForeignKey("actas.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    activo: Mapped["Activo"] = relationship(lazy="joined")
    solicitante: Mapped["Responsable | None"] = relationship(
        foreign_keys=[solicitante_id], lazy="joined"
    )
    responsable: Mapped["Responsable | None"] = relationship(
        foreign_keys=[responsable_id], lazy="joined"
    )
    accesorios: Mapped[list["PrestamoAccesorio"]] = relationship(back_populates="prestamo", lazy="selectin")


class PrestamoAccesorio(Base):
    __tablename__ = "prestamo_accesorios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    prestamo_id: Mapped[int] = mapped_column(ForeignKey("prestamos.id"), nullable=False)
    nombre: Mapped[str] = mapped_column(String(120), nullable=False)
    entregado: Mapped[bool] = mapped_column(Boolean, default=True)
    devuelto: Mapped[bool] = mapped_column(Boolean, default=False)

    prestamo: Mapped["Prestamo"] = relationship(back_populates="accesorios")