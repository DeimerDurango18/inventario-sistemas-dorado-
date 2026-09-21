from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel

from app.schemas.common import ORMModel


class PaisRead(ORMModel):
    id: int
    nombre: str


class DepartamentoRead(ORMModel):
    id: int
    pais_id: int
    nombre: str


class CiudadCreate(BaseModel):
    nombre: str
    departamento_id: int


class CiudadRead(ORMModel):
    id: int
    departamento_id: int
    nombre: str
    departamento: Optional[DepartamentoRead] = None


class TipoUbicacionCreate(BaseModel):
    codigo: str
    nombre: str


class TipoUbicacionRead(ORMModel):
    id: int
    codigo: str
    nombre: str
    activo: bool


class SedeCreate(BaseModel):
    codigo: str
    nombre: str
    ciudad_id: int
    tipo_ubicacion_id: Optional[int] = None
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    responsable: Optional[str] = None
    ced_id: Optional[int] = None
    observaciones: Optional[str] = None


class SedeUpdate(BaseModel):
    nombre: Optional[str] = None
    ciudad_id: Optional[int] = None
    tipo_ubicacion_id: Optional[int] = None
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    responsable: Optional[str] = None
    estado: Optional[str] = None
    ced_id: Optional[int] = None
    observaciones: Optional[str] = None


class SedeRead(ORMModel):
    id: int
    codigo: str
    nombre: str
    ciudad_id: int
    tipo_ubicacion_id: Optional[int] = None
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    responsable: Optional[str] = None
    estado: str
    ced_id: Optional[int] = None
    observaciones: Optional[str] = None

    ciudad: Optional[CiudadRead] = None
    tipo_ubicacion: Optional[TipoUbicacionRead] = None


class UbicacionCreate(BaseModel):
    nombre: str
    sede_id: Optional[int] = None
    tipo_ubicacion_id: Optional[int] = None
    observaciones: Optional[str] = None


class UbicacionUpdate(BaseModel):
    nombre: Optional[str] = None
    sede_id: Optional[int] = None
    tipo_ubicacion_id: Optional[int] = None
    observaciones: Optional[str] = None
    es_activa: Optional[bool] = None


class UbicacionRead(ORMModel):
    id: int
    nombre: str
    sede_id: Optional[int] = None
    tipo_ubicacion_id: Optional[int] = None
    es_activa: bool
    observaciones: Optional[str] = None

    sede: Optional[SedeRead] = None
    tipo_ubicacion: Optional[TipoUbicacionRead] = None


class DashboardKPI(BaseModel):
    total_activos: int
    activos_activos: int
    por_estado: dict[str, int]
    garantias_proximas: int
    garantias_vencidas: int
    mantenimientos_programados: int
    movimientos_mes: int
    prestamos_activos: int
    bajas_solicitadas: int


class PorCategoria(BaseModel):
    nombre: str
    cantidad: int


class PorSede(BaseModel):
    sede: str
    cantidad: int


class TrendItem(BaseModel):
    fecha: str
    cantidad: int