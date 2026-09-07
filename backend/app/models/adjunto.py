from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func

from app.core.database import Base


class Adjunto(Base):
    """Archivo adjunto (foto/evidencia) vinculado a un equipo, mantenimiento o ticket."""

    __tablename__ = "adjuntos_equipos"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=True)
    tipo = Column(String(20), nullable=False)  # equipo | mantenimiento | ticket
    equipo_id = Column(Integer, ForeignKey("equipos.id"), nullable=True)
    registro_id = Column(Integer, nullable=True)  # mantenimiento (FK a mantenimientos.id)
    ticket_id = Column(Integer, ForeignKey("tickets_soporte.id"), nullable=True)

    archivo = Column(String(300), nullable=False)  # ruta relativa /storage/adjuntos/...
    descripcion = Column(String(150), nullable=True)
    creado_por = Column(String(150), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())