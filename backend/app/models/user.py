from sqlalchemy import Boolean, Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func

from app.core.database import Base


class User(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=True)
    nombre = Column(String(150), nullable=False)
    correo = Column(String(150), unique=True, nullable=False)
    # El hash bcrypt de la contraseña se guarda directamente en `password`.
    # Se asigna con hash_password() en los servicios/routers (app.core.security).
    password = Column(String(255), nullable=True)
    rol = Column(String(30), default="operativo")  # admin | supervisor | operativo
    activo = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
