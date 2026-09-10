from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Numeric, Text, UniqueConstraint, Index, text as sa_text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class Acta(Base):
    """Encabezado del acta de salida/entrada de equipos (orden física que se imprime)."""

    __tablename__ = "actas"
    __table_args__ = (
        UniqueConstraint("numero", "empresa_id", name="uq_numero_empresa"),
        Index("uq_actas_numero_null", "numero", unique=True, mssql_where=sa_text("empresa_id IS NULL")),
        Index("uq_actas_numero_empresa2", "numero", "empresa_id", unique=True, mssql_where=sa_text("empresa_id IS NOT NULL")),
    )

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=True)
    numero = Column(String(30), index=True, nullable=False)  # Ej: SIS-1760
    tipo = Column(String(10), default="SALIDA")  # SALIDA | ENTRADA

    # Persona que entrega/despacha (autoriza el envío)
    entregado_por = Column(String(150), nullable=False)

    # Proyecto / cliente / centro de costo y responsable en destino
    proyecto = Column(String(200), nullable=True)
    responsable_destino = Column(String(150), nullable=True)

    # Lugar de destino
    ciudad_destino = Column(String(100), nullable=True)
    direccion_destino = Column(String(200), nullable=True)

    observaciones = Column(Text, nullable=True)
    valor_aprox = Column(Numeric(14, 2), nullable=True)
    cajas = Column(Integer, default=1)

    # Correo(s) de destino para enviar el PDF del acta al finalizar
    email_destino = Column(String(500), nullable=True)

    # Fotografias / evidencias de la salida o entrada (JSON list de rutas)
    fotos = Column(Text, nullable=True)

    # Firma del responsable que recibe el equipo en la sede (llenado al firmar)
    firmado_por = Column(String(150), nullable=True)
    documento_firma = Column(String(50), nullable=True)
    fecha_firma = Column(DateTime(timezone=True), nullable=True)

    pdf_path = Column(String(300), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    items = relationship("ActaItem", back_populates="acta", cascade="all, delete-orphan")


class ActaItem(Base):
    """Cada fila de la tabla DISPOSITIVO / MARCA / DETALLE / CANT / SERIAL del acta."""

    __tablename__ = "acta_items"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=True)
    acta_id = Column(Integer, ForeignKey("actas.id"), nullable=False)
    equipo_id = Column(Integer, ForeignKey("equipos.id"), nullable=True)

    dispositivo = Column(String(100), nullable=False)
    marca = Column(String(100), nullable=True)
    detalle = Column(String(150), nullable=True)
    cantidad = Column(Integer, default=1)
    serial = Column(String(100), nullable=True)

    acta = relationship("Acta", back_populates="items")
    equipo = relationship("Equipment")
