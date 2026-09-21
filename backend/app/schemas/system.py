from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.schemas.common import ORMModel


class NotificacionRead(ORMModel):
    id: int
    tipo: str
    titulo: str
    mensaje: Optional[str] = None
    entidad_tipo: Optional[str] = None
    entidad_id: Optional[int] = None
    leida: bool
    fecha_evento: Optional[datetime] = None
    created_at: datetime


class TicketCreate(BaseModel):
    sede_id: Optional[int] = None
    solicitante: Optional[str] = None
    categoria: Optional[str] = None
    prioridad: str = "MEDIA"
    descripcion: Optional[str] = None


class TicketRead(ORMModel):
    id: int
    numero: str
    fecha: datetime
    sede_id: Optional[int] = None
    solicitante: Optional[str] = None
    categoria: Optional[str] = None
    prioridad: str
    descripcion: Optional[str] = None
    tecnico_id: Optional[int] = None
    estado: str
    fecha_solucion: Optional[datetime] = None
    solucion: Optional[str] = None
    created_at: datetime


class ParametroRead(ORMModel):
    id: int
    clave: str
    valor: Optional[str] = None
    descripcion: Optional[str] = None
    grupo: Optional[str] = None