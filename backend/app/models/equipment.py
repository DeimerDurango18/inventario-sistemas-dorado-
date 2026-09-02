from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Equipment(Base):
    __tablename__ = "equipos"

    id = Column(Integer, primary_key=True, index=True)
    folio = Column(String(50), unique=True, index=True, nullable=False)
    marca = Column(String(100), nullable=False)
    modelo = Column(String(100), nullable=False)
    serie = Column(String(100), nullable=True)
    estado = Column(String(50), default="disponible")
    ubicacion = Column(String(100), nullable=True)

    categoria_id = Column(Integer, ForeignKey("categorias.id"), nullable=True)
    ubicacion_id = Column(Integer, ForeignKey("ubicaciones.id"), nullable=True)
    valor_aprox = Column(Numeric(14, 2), nullable=True)
    observaciones = Column(String(255), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    movements = relationship("Movement", back_populates="equipo")
    categoria = relationship("Category")
    ubicacion_rel = relationship("Location")


class Movement(Base):
    __tablename__ = "movimientos"

    id = Column(Integer, primary_key=True, index=True)
    tipo = Column(String(20), nullable=False)
    folio_acta = Column(String(50), unique=True, index=True, nullable=False)
    persona = Column(String(150), nullable=True)
    motivo = Column(String(255), nullable=True)
    equipo_id = Column(Integer, ForeignKey("equipos.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    equipo = relationship("Equipment", back_populates="movements")
