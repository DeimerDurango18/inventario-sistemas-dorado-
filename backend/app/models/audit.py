from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.sql import func
from app.core.database import Base

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)

    entity_type = Column(String(50), nullable=False)  # 'EQUIPO' | 'MANTENIMIENTO'
    entity_id = Column(Integer, nullable=False)

    action = Column(String(20), nullable=False)  # 'CREATE' | 'UPDATE' | 'DELETE'
    changes = Column(Text, nullable=True)  # JSON string: {"field": {"old": "val", "new": "val"}}

    created_at = Column(DateTime(timezone=True), server_default=func.now())
