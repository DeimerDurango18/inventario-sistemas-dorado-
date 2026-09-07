from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Ticket(Base):
    """Registro interno de casos de soporte (incidencia -> visita -> resuelto)."""

    __tablename__ = "tickets_soporte"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=True)
    equipo_id = Column(Integer, ForeignKey("equipos.id"), nullable=True)
    ubicacion_id = Column(Integer, ForeignKey("ubicaciones.id"), nullable=True)

    titulo = Column(String(150), nullable=False)
    descripcion = Column(Text, nullable=True)
    prioridad = Column(String(20), default="media")  # baja | media | alta
    estado = Column(String(20), default="abierto")  # abierto | en_visita | resuelto | cerrado
    tecnico = Column(String(150), nullable=True)

    fecha_visita = Column(DateTime(timezone=True), nullable=True)
    fecha_resolucion = Column(DateTime(timezone=True), nullable=True)
    creado_por = Column(String(150), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    equipo = relationship("Equipment")
    ubicacion = relationship("Location")