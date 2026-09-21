"""Modelo central de movimientos: traza cada operación sobre un activo (nunca se borra físicamente)."""

from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Movimiento(Base):
    __tablename__ = "movimientos"
    __table_args__ = (
        Index("ix_movimientos_activo_fecha", "activo_id", "fecha"),
        Index("ix_movimientos_tipo", "tipo"),
        Index("ix_movimientos_numero", "numero", unique=True),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    numero: Mapped[str] = mapped_column(String(30), nullable=False)
    tipo: Mapped[str] = mapped_column(String(30), nullable=False)
    fecha: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    activo_id: Mapped[int] = mapped_column(ForeignKey("activos.id"), nullable=False)
    origen_ubicacion_id: Mapped[int | None] = mapped_column(ForeignKey("ubicaciones.id"))
    destino_ubicacion_id: Mapped[int | None] = mapped_column(ForeignKey("ubicaciones.id"))
    responsable_anterior_id: Mapped[int | None] = mapped_column(ForeignKey("responsables.id"))
    responsable_nuevo_id: Mapped[int | None] = mapped_column(ForeignKey("responsables.id"))
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False)

    motivo: Mapped[str | None] = mapped_column(String(255))
    observaciones: Mapped[str | None] = mapped_column(String(1000))

    estado: Mapped[str] = mapped_column(String(20), default="REGISTRADO")
    anulado_motivo: Mapped[str | None] = mapped_column(String(255))
    anulado_usuario_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"))
    anulado_fecha: Mapped[datetime | None] = mapped_column(DateTime)

    acta_id: Mapped[int | None] = mapped_column(ForeignKey("actas.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    activo: Mapped["Activo"] = relationship(lazy="joined")
    origen_ubicacion: Mapped["Ubicacion | None"] = relationship(
        foreign_keys=[origen_ubicacion_id], lazy="joined"
    )
    destino_ubicacion: Mapped["Ubicacion | None"] = relationship(
        foreign_keys=[destino_ubicacion_id], lazy="joined"
    )
    responsable_anterior: Mapped["Responsable | None"] = relationship(
        foreign_keys=[responsable_anterior_id], lazy="joined"
    )
    responsable_nuevo: Mapped["Responsable | None"] = relationship(
        foreign_keys=[responsable_nuevo_id], lazy="joined"
    )
    usuario: Mapped["Usuario"] = relationship(foreign_keys=[usuario_id], lazy="joined")