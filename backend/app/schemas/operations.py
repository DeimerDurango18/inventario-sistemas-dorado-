from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.schemas.asset import ActivoRead
from app.schemas.common import ORMModel
from app.schemas.geo import UbicacionRead


# ------------------------------------------------------------------ instalaciones
class InstalacionCreate(BaseModel):
    tipo_servicio: str = "INSTALACION"
    descripcion: Optional[str] = None
    fecha_programada: Optional[datetime] = None
    tecnico: Optional[str] = None
    cliente: Optional[str] = None
    activo_id: Optional[int] = None
    ubicacion_id: Optional[int] = None
    estado: str = "PROGRAMADA"


class InstalacionUpdate(BaseModel):
    tipo_servicio: Optional[str] = None
    descripcion: Optional[str] = None
    fecha_programada: Optional[datetime] = None
    tecnico: Optional[str] = None
    cliente: Optional[str] = None
    activo_id: Optional[int] = None
    ubicacion_id: Optional[int] = None
    estado: Optional[str] = None


class InstalacionRead(ORMModel):
    id: int
    numero: str
    fecha: datetime
    tipo_servicio: str
    descripcion: Optional[str] = None
    fecha_programada: Optional[datetime] = None
    fecha_ejecucion: Optional[datetime] = None
    tecnico: Optional[str] = None
    cliente: Optional[str] = None
    activo_id: Optional[int] = None
    ubicacion_id: Optional[int] = None
    estado: str
    created_at: datetime

    activo: Optional[ActivoRead] = None
    ubicacion: Optional[UbicacionRead] = None


# ------------------------------------------------------------------ atenciones de punto
class AtencionCreate(BaseModel):
    nombre_punto: str
    categoria: Optional[str] = None
    contacto: Optional[str] = None
    telefono: Optional[str] = None
    descripcion_problema: Optional[str] = None


class AtencionUpdate(BaseModel):
    nombre_punto: Optional[str] = None
    categoria: Optional[str] = None
    contacto: Optional[str] = None
    telefono: Optional[str] = None
    descripcion_problema: Optional[str] = None
    estado: Optional[str] = None
    solucion: Optional[str] = None


class AtencionRead(ORMModel):
    id: int
    numero: str
    fecha: datetime
    nombre_punto: str
    categoria: Optional[str] = None
    contacto: Optional[str] = None
    telefono: Optional[str] = None
    descripcion_problema: Optional[str] = None
    estado: str
    solucion: Optional[str] = None
    fecha_resuelta: Optional[datetime] = None
    created_at: datetime