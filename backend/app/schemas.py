from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class EmpresaIn(BaseModel):
    nombre: str
    nit: Optional[str] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    logo_path: Optional[str] = None


class EmpresaUpdate(BaseModel):
    nombre: Optional[str] = None
    nit: Optional[str] = None
    telefono: Optional[str] = None
    direccion: Optional[str] = None
    logo_path: Optional[str] = None
    activo: Optional[bool] = None


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
    password: Optional[str] = None
    rol: str = "operativo"
    activo: bool = True


class UserUpdate(BaseModel):
    nombre: Optional[str] = None
    correo: Optional[str] = None
    password: Optional[str] = None
    rol: Optional[str] = None
    activo: Optional[bool] = None


class LoginIn(BaseModel):
    correo: str
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class MaintenanceIn(BaseModel):
    equipo_id: int
    punto_id: Optional[int] = None  # punto de venta vinculado
    tipo: str = "preventivo"
    descripcion: Optional[str] = None
    tecnico: Optional[str] = None
    costo: Optional[float] = None
    estado: str = "programado"
    fecha_programada: Optional[datetime] = None
    fecha_finalizado: Optional[datetime] = None
    piezas: Optional[str] = None
    periodicidad: Optional[str] = None  # mensual | trimestral | semestral | anual


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


class ActaFirmaIn(BaseModel):
    """Registro de la firma del responsable que recibe los equipos en la sede."""
    nombre: str
    documento: Optional[str] = None


class EquipmentIn(BaseModel):
    folio: Optional[str] = None  # Si no se envía, se genera automáticamente (EQ-####)
    marca: str
    modelo: str
    serie: Optional[str] = None
    estado: str = "disponible"
    ubicacion: Optional[str] = None
    categoria_id: Optional[int] = None
    ubicacion_id: Optional[int] = None
    valor_aprox: Optional[float] = None
    observaciones: Optional[str] = None
    foto: Optional[str] = None


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
    foto: Optional[str] = None


class BulkEquipmentItem(BaseModel):
    marca: str
    modelo: str
    serie: Optional[str] = None
    estado: Optional[str] = None
    categoria: Optional[str] = None
    ubicacion: Optional[str] = None
    valor_aprox: Optional[float] = None
    observaciones: Optional[str] = None


class BulkEditEquipos(BaseModel):
    ids: List[int]
    estado: Optional[str] = None
    ubicacion_id: Optional[int] = None
    ubicacion: Optional[str] = None
    categoria_id: Optional[int] = None


class BajaEquipoIn(BaseModel):
    tipo_baja: str = "baja"  # baja | venta
    motivo: Optional[str] = None
    precio_venta: Optional[float] = None


class PrestamoIn(BaseModel):
    prestamo_a: str
    motivo: Optional[str] = None
    fecha_fin: Optional[datetime] = None


class TicketIn(BaseModel):
    titulo: str
    descripcion: Optional[str] = None
    prioridad: str = "media"  # baja | media | alta
    estado: str = "abierto"  # abierto | en_visita | resuelto | cerrado
    tecnico: Optional[str] = None
    equipo_id: Optional[int] = None
    ubicacion_id: Optional[int] = None


class TicketUpdate(BaseModel):
    titulo: Optional[str] = None
    descripcion: Optional[str] = None
    prioridad: Optional[str] = None
    estado: Optional[str] = None
    tecnico: Optional[str] = None
    equipo_id: Optional[int] = None
    ubicacion_id: Optional[int] = None


class AdjuntoIn(BaseModel):
    tipo: str  # equipo | mantenimiento | ticket
    equipo_id: Optional[int] = None
    registro_id: Optional[int] = None
    ticket_id: Optional[int] = None
    descripcion: Optional[str] = None


class PuntoVentaIn(BaseModel):
    nombre: str
    tipo: str = "drogueria"  # drogueria | dispensario | centro_costo | cedis | oficina
    ciudad: Optional[str] = None
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    responsable: Optional[str] = None
    estado: str = "activo"  # activo | inactivo


class PuntoVentaUpdate(BaseModel):
    nombre: Optional[str] = None
    tipo: Optional[str] = None
    ciudad: Optional[str] = None
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    responsable: Optional[str] = None
    estado: Optional[str] = None


class InstalacionIn(BaseModel):
    punto_id: Optional[int] = None  # el punto viene de la URL
    equipo_id: int
    software: Optional[str] = None
    fecha_instalacion: Optional[datetime] = None
    estado: str = "activa"  # activa | retirada
    observaciones: Optional[str] = None


class InstalacionUpdate(BaseModel):
    software: Optional[str] = None
    fecha_instalacion: Optional[datetime] = None
    estado: Optional[str] = None  # activa | retirada
    observaciones: Optional[str] = None


class AtencionPuntoIn(BaseModel):
    punto_id: Optional[int] = None  # el punto viene de la URL
    ticket_id: Optional[int] = None
    fecha: Optional[datetime] = None
    tipo: str = "soporte"  # soporte | instalacion | mantenimiento
    descripcion: Optional[str] = None
    tecnico: Optional[str] = None
    resultado: Optional[str] = None


class AtencionPuntoUpdate(BaseModel):
    ticket_id: Optional[int] = None
    fecha: Optional[datetime] = None
    tipo: Optional[str] = None
    descripcion: Optional[str] = None
    tecnico: Optional[str] = None
    resultado: Optional[str] = None

