from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class PuntoVenta(Base):
    """Punto de venta / centro de operacion (drogueria, dispensario, centro de costo, cedis, oficina)."""

    __tablename__ = "puntos_venta"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=True)
    nombre = Column(String(200), nullable=False)
    tipo = Column(String(30), default="drogueria")  # drogueria | dispensario | centro_costo | cedis | oficina
    ciudad = Column(String(150), nullable=True)
    direccion = Column(String(300), nullable=True)
    telefono = Column(String(50), nullable=True)
    responsable = Column(String(150), nullable=True)
    estado = Column(String(20), default="activo")  # activo | inactivo
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    instalaciones = relationship(
        "Instalacion",
        back_populates="punto",
        cascade="all, delete-orphan",
    )
    atenciones = relationship(
        "AtencionPunto",
        back_populates="punto",
        cascade="all, delete-orphan",
    )
    mantenimientos = relationship(
        "MaintenanceRecord",
        back_populates="punto",
    )


class Instalacion(Base):
    """Equipo (y/o software) instalado en un punto de venta."""

    __tablename__ = "instalaciones"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=True)
    punto_id = Column(Integer, ForeignKey("puntos_venta.id"), nullable=False)
    equipo_id = Column(Integer, ForeignKey("equipos.id"), nullable=False)
    software = Column(String(300), nullable=True)  # software/aplicativo instalado
    fecha_instalacion = Column(DateTime(timezone=True), nullable=True)
    estado = Column(String(20), default="activa")  # activa | retirada
    observaciones = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    punto = relationship("PuntoVenta", back_populates="instalaciones")
    equipo = relationship("Equipment")


class AtencionPunto(Base):
    """Historial de atenciones de soporte realizadas en un punto."""

    __tablename__ = "atenciones_punto"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=True)
    punto_id = Column(Integer, ForeignKey("puntos_venta.id"), nullable=False)
    ticket_id = Column(Integer, ForeignKey("tickets_soporte.id"), nullable=True)
    fecha = Column(DateTime(timezone=True), server_default=func.now())
    tipo = Column(String(30), default="soporte")  # soporte | instalacion | mantenimiento
    descripcion = Column(Text, nullable=True)
    tecnico = Column(String(150), nullable=True)
    resultado = Column(String(300), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    punto = relationship("PuntoVenta", back_populates="atenciones")
    ticket = relationship("Ticket")
