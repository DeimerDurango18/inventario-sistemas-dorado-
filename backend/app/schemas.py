from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class CategoryIn(BaseModel):
    nombre: str
    descripcion: Optional[str] = None


class LocationIn(BaseModel):
    nombre: str
    ciudad: Optional[str] = None
    direccion: Optional[str] = None


class UserIn(BaseModel):
    nombre: str
    correo: str
    rol: str = "operativo"
    activo: bool = True


class MaintenanceIn(BaseModel):
    equipo_id: int
    tipo: str = "preventivo"
    descripcion: Optional[str] = None
    tecnico: Optional[str] = None
    costo: Optional[float] = None
    estado: str = "programado"
    fecha_programada: Optional[datetime] = None


class ActaItemIn(BaseModel):
    dispositivo: str
    marca: Optional[str] = None
    detalle: Optional[str] = None
    cantidad: int = 1
    serial: Optional[str] = None
    equipo_id: Optional[int] = None


class ActaIn(BaseModel):
    tipo: str = "SALIDA"  # SALIDA | ENTRADA
    entregado_por: str
    proyecto: Optional[str] = None
    responsable_destino: Optional[str] = None
    ciudad_destino: Optional[str] = None
    direccion_destino: Optional[str] = None
    observaciones: Optional[str] = None
    valor_aprox: Optional[float] = None
    cajas: int = 1
    items: List[ActaItemIn]


class EquipmentIn(BaseModel):
    folio: str
    marca: str
    modelo: str
    serie: Optional[str] = None
    estado: str = "disponible"
    ubicacion: Optional[str] = None
    categoria_id: Optional[int] = None
    ubicacion_id: Optional[int] = None
    valor_aprox: Optional[float] = None
    observaciones: Optional[str] = None


class EquipmentUpdate(BaseModel):
    folio: Optional[str] = None
    marca: Optional[str] = None
    modelo: Optional[str] = None
    serie: Optional[str] = None
    estado: Optional[str] = None
    ubicacion: Optional[str] = None
    categoria_id: Optional[int] = None
    ubicacion_id: Optional[int] = None
    valor_aprox: Optional[float] = None
    observaciones: Optional[str] = None

