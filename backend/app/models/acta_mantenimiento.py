from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Index, text as sa_text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class ActaMantenimiento(Base):
    """Acta de mantenimiento grupal: registra un lote de equipos revisados,
    cada uno con su número de serie y nombre/descripción del equipo."""

    __tablename__ = "actas_mantenimiento"
    __table_args__ = (
        Index("uq_actasm_numero_null", "numero", unique=True, mssql_where=sa_text("empresa_id IS NULL")),
        Index("uq_actasm_numero_empresa", "numero", "empresa_id", unique=True, mssql_where=sa_text("empresa_id IS NOT NULL")),
    )

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=True)
    numero = Column(String(30), index=True, nullable=False)
    cliente = Column(String(200), nullable=True)
    fecha = Column(DateTime(timezone=True), server_default=func.now())
    tecnico = Column(String(150), nullable=True)
    descripcion = Column(Text, nullable=True)
    observaciones = Column(Text, nullable=True)
    prioridad = Column(String(20), nullable=False, server_default="media")  # baja | media | alta | urgente
    pdf_path = Column(String(300), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    items = relationship("ActaMantenimientoItem", back_populates="acta", cascade="all, delete-orphan")


class ActaMantenimientoItem(Base):
    """Un equipo dentro del acta de mantenimiento grupal."""

    __tablename__ = "actas_mantenimiento_items"

    id = Column(Integer, primary_key=True, index=True)
    acta_id = Column(Integer, ForeignKey("actas_mantenimiento.id"), nullable=False)
    nombre_equipo = Column(String(200), nullable=False)  # nombre/descripción del equipo
    serie = Column(String(100), nullable=True)  # número de serie de ese equipo
    observaciones = Column(Text, nullable=True)
    equipo_id = Column(Integer, ForeignKey("equipos.id"), nullable=True)  # vínculo opcional

    acta = relationship("ActaMantenimiento", back_populates="items")