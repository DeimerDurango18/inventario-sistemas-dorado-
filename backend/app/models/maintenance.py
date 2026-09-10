from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class MaintenanceRecord(Base):
    __tablename__ = "mantenimientos"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=True)
    equipo_id = Column(Integer, ForeignKey("equipos.id"), nullable=False)
    punto_id = Column(Integer, ForeignKey("puntos_venta.id"), nullable=True)  # punto de venta vinculado
    tipo = Column(String(30), default="preventivo")  # preventivo | correctivo
    descripcion = Column(String(255), nullable=True)
    tecnico = Column(String(150), nullable=True)
    prioridad = Column(String(20), nullable=False, server_default="media")  # baja | media | alta | urgente
    estado = Column(String(30), default="programado")  # programado | en_proceso | finalizado
    fecha_programada = Column(DateTime(timezone=True), nullable=True)
    fecha_finalizado = Column(DateTime(timezone=True), nullable=True)
    foto = Column(String(300), nullable=True)  # ruta/URL de evidencia del mantenimiento
    piezas = Column(Text, nullable=True)  # lista de repuestos/piezas usadas (texto libre)
    periodicidad = Column(String(20), nullable=True)  # mensual | trimestral | semestral | anual
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    equipo = relationship("Equipment")
    punto = relationship("PuntoVenta", back_populates="mantenimientos")
