from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func

from app.core.database import Base


class Category(Base):
    __tablename__ = "categorias"
    __table_args__ = (
        UniqueConstraint("nombre", "empresa_id", name="uq_categoria_nombre_empresa"),
    )

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=True)
    nombre = Column(String(100), nullable=False)
    descripcion = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Location(Base):
    __tablename__ = "ubicaciones"
    __table_args__ = (
        UniqueConstraint("nombre", "empresa_id", name="uq_ubicacion_nombre_empresa"),
    )

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=True)
    nombre = Column(String(100), nullable=False)
    ciudad = Column(String(100), nullable=True)
    direccion = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
