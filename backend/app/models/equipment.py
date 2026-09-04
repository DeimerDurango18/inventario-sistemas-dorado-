from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Numeric, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Equipment(Base):
    __tablename__ = "equipos"
    __table_args__ = (
        UniqueConstraint("folio", "empresa_id", name="uq_folio_empresa"),
    )

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=True)
    folio = Column(String(50), index=True, nullable=False)
    marca = Column(String(100), nullable=False)
    modelo = Column(String(100), nullable=False)
    serie = Column(String(100), nullable=True)
    estado = Column(String(50), default="disponible")

    categoria_id = Column(Integer, ForeignKey("categorias.id"), nullable=True)
    ubicacion_id = Column(Integer, ForeignKey("ubicaciones.id"), nullable=True)
    valor_aprox = Column(Numeric(14, 2), nullable=True)
    observaciones = Column(String(255), nullable=True)
    foto = Column(String(300), nullable=True)  # ruta/URL de la fotografía del equipo

    # FASE 10: préstamos y bajas/ventas
    prestamo_a = Column(String(150), nullable=True)
    prestamo_desde = Column(DateTime(timezone=True), nullable=True)
    prestamo_hasta = Column(DateTime(timezone=True), nullable=True)
    baja_motivo = Column(String(255), nullable=True)
    precio_venta = Column(Numeric(14, 2), nullable=True)
    fecha_baja = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    movements = relationship("Movement", back_populates="equipo", cascade="all, delete-orphan")
    categoria = relationship("Category")
    ubicacion_rel = relationship("Location")


class Movement(Base):
    __tablename__ = "movimientos"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=True)
    tipo = Column(String(20), nullable=False)  # ENTRADA | SALIDA | CAMBIO_ESTADO | MANTENIMIENTO
    folio_acta = Column(String(50), nullable=True)  # ya no es único: puede haber varios por acta/equipo
    persona = Column(String(150), nullable=True)
    motivo = Column(String(255), nullable=True)
    estado_anterior = Column(String(50), nullable=True)
    estado_nuevo = Column(String(50), nullable=True)
    equipo_id = Column(Integer, ForeignKey("equipos.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    equipo = relationship("Equipment", back_populates="movements")
