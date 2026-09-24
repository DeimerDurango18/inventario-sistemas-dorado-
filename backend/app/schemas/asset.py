from __future__ import annotations

from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.catalog import (
    CategoriaRead,
    EstadoActivoRead,
    MarcaRead,
    ModeloRead,
    ProveedorRead,
    SubcategoriaRead,
)
from app.schemas.common import ORMModel
from app.schemas.geo import UbicacionRead


# ------------------------------------------------------------------ responsables
class ResponsableCreate(BaseModel):
    documento: Optional[str] = None
    nombre: str
    cargo: Optional[str] = None
    telefono: Optional[str] = None
    correo: Optional[str] = None
    sede_id: Optional[int] = None


class ResponsableUpdate(BaseModel):
    documento: Optional[str] = None
    nombre: Optional[str] = None
    cargo: Optional[str] = None
    telefono: Optional[str] = None
    correo: Optional[str] = None
    sede_id: Optional[int] = None
    activo: Optional[bool] = None


class ResponsableRead(ORMModel):
    id: int
    documento: Optional[str] = None
    nombre: str
    cargo: Optional[str] = None
    telefono: Optional[str] = None
    correo: Optional[str] = None
    sede_id: Optional[int] = None
    activo: bool


# ------------------------------------------------------------------ activos
class ActivoAtributoValue(BaseModel):
    atributo_definicion_id: int
    valor: str


class ActivoAtributoValueRead(ORMModel):
    id: int
    atributo_definicion_id: int
    valor: str


class ActivoCreate(BaseModel):
    tipo: str
    categoria_id: Optional[int] = None
    subcategoria_id: Optional[int] = None
    marca_id: Optional[int] = None
    modelo_id: Optional[int] = None
    proveedor_id: Optional[int] = None
    codigo_inventario: Optional[str] = None
    placa: Optional[str] = None
    serial: Optional[str] = None
    estado_id: Optional[int] = None
    fecha_adquisicion: Optional[datetime] = None
    fecha_ingreso: Optional[datetime] = None
    factura_numero: Optional[str] = None
    valor_adquisicion: Optional[float] = None
    garantia_meses: Optional[int] = None
    fecha_fin_garantia: Optional[datetime] = None
    responsable_id: Optional[int] = None
    ubicacion_id: Optional[int] = None
    observaciones: Optional[str] = None
    foto: Optional[str] = None
    atributos: List[ActivoAtributoValue] = []


class ActivoUpdate(BaseModel):
    tipo: Optional[str] = None
    categoria_id: Optional[int] = None
    subcategoria_id: Optional[int] = None
    marca_id: Optional[int] = None
    modelo_id: Optional[int] = None
    proveedor_id: Optional[int] = None
    codigo_inventario: Optional[str] = None
    placa: Optional[str] = None
    serial: Optional[str] = None
    estado_id: Optional[int] = None
    fecha_adquisicion: Optional[datetime] = None
    fecha_ingreso: Optional[datetime] = None
    factura_numero: Optional[str] = None
    valor_adquisicion: Optional[float] = None
    garantia_meses: Optional[int] = None
    fecha_fin_garantia: Optional[datetime] = None
    responsable_id: Optional[int] = None
    ubicacion_id: Optional[int] = None
    observaciones: Optional[str] = None
    foto: Optional[str] = None
    activo: Optional[bool] = None
    atributos: Optional[List[ActivoAtributoValue]] = None


class ActivoRead(ORMModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    codigo: str
    tipo: str
    codigo_inventario: Optional[str] = None
    placa: Optional[str] = None
    serial: Optional[str] = None
    qr_hash: Optional[str] = None
    marca_id: Optional[int] = None
    modelo_id: Optional[int] = None
    categoria_id: Optional[int] = None
    subcategoria_id: Optional[int] = None
    estado_id: int
    fecha_adquisicion: Optional[datetime] = None
    fecha_ingreso: Optional[datetime] = None
    proveedor_id: Optional[int] = None
    factura_numero: Optional[str] = None
    valor_adquisicion: Optional[float] = None
    garantia_meses: Optional[int] = None
    fecha_fin_garantia: Optional[datetime] = None
    responsable_id: Optional[int] = None
    ubicacion_id: Optional[int] = None
    observaciones: Optional[str] = None
    foto: Optional[str] = None
    activo: bool

    marca: Optional[MarcaRead] = None
    modelo: Optional[ModeloRead] = None
    categoria: Optional[CategoriaRead] = None
    subcategoria: Optional[SubcategoriaRead] = None
    estado: Optional[EstadoActivoRead] = None
    responsable: Optional[ResponsableRead] = None
    ubicacion: Optional[UbicacionRead] = None
    proveedor: Optional[ProveedorRead] = None
    atributos_valores: Optional[List[ActivoAtributoValueRead]] = None


class ConsultaPublicaRead(BaseModel):
    existente: bool
    codigo: str
    tipo: str
    estado: str
    estado_color: Optional[str] = None
    marca: Optional[str] = None
    modelo: Optional[str] = None
    serial: Optional[str] = None
    ubicacion: Optional[str] = None
    sede: Optional[str] = None
    responsable: Optional[str] = None
    fecha_fin_garantia: Optional[datetime] = None
    observaciones: Optional[str] = None


# ------------------------------------------------------------------ movimientos
class MovimientoCreate(BaseModel):
    tipo: str  # ASIGNACION | TRASLADO | DEVOLUCION | AJUSTE
    destino_ubicacion_id: Optional[int] = None
    responsable_nuevo_id: Optional[int] = None
    motivo: Optional[str] = None
    observaciones: Optional[str] = None
    fecha: Optional[datetime] = None


class MovimientoRead(ORMModel):
    id: int
    numero: str
    tipo: str
    fecha: datetime
    activo_id: int
    origen_ubicacion_id: Optional[int] = None
    destino_ubicacion_id: Optional[int] = None
    responsable_anterior_id: Optional[int] = None
    responsable_nuevo_id: Optional[int] = None
    usuario_id: int
    motivo: Optional[str] = None
    observaciones: Optional[str] = None
    estado: str
    anulado_motivo: Optional[str] = None
    acta_id: Optional[int] = None
    created_at: datetime

    activo: Optional[ActivoRead] = None
    origen_ubicacion: Optional[UbicacionRead] = None
    destino_ubicacion: Optional[UbicacionRead] = None
    responsable_anterior: Optional[ResponsableRead] = None
    responsable_nuevo: Optional[ResponsableRead] = None


class MovimientoAnular(BaseModel):
    motivo: str


# ------------------------------------------------------------------ préstamos
class PrestamoCreate(BaseModel):
    solicitante_id: Optional[int] = None
    responsable_id: Optional[int] = None
    cantidad: int = Field(1, ge=1)
    seriales: Optional[List[str]] = None
    fecha_prestamo: Optional[datetime] = None
    fecha_prevista_devolucion: Optional[datetime] = None
    motivo: Optional[str] = None
    observaciones: Optional[str] = None


class PrestamoRead(ORMModel):
    id: int
    numero: str
    activo_id: int
    solicitante_id: Optional[int] = None
    responsable_id: Optional[int] = None
    cantidad: int = 1
    seriales: Optional[List[str]] = None
    fecha_prestamo: Optional[datetime] = None
    fecha_prevista_devolucion: Optional[datetime] = None
    fecha_devolucion_real: Optional[datetime] = None
    estado: str
    motivo: Optional[str] = None
    observaciones: Optional[str] = None
    acta_id: Optional[int] = None
    created_at: datetime

    activo: Optional[ActivoRead] = None
    solicitante: Optional[ResponsableRead] = None
    responsable: Optional[ResponsableRead] = None


# ------------------------------------------------------------------ mantenimientos
class MantenimientoCreate(BaseModel):
    tipo: str  # PREVENTIVO | CORRECTIVO | PREDICTIVO
    cantidad: int = Field(1, ge=1)
    seriales: Optional[List[str]] = None
    fecha_programada: Optional[datetime] = None
    tecnico_id: Optional[int] = None
    diagnostico: Optional[str] = None
    actividades: Optional[str] = None
    costo: Optional[float] = None
    proveedor_id: Optional[int] = None
    estado: Optional[str] = "PROGRAMADO"
    proposito: Optional[str] = None


class MantenimientoCerrar(BaseModel):
    resultado: Optional[str] = None
    observaciones: Optional[str] = None
    costo: Optional[float] = None
    proxima_fecha: Optional[datetime] = None


class MantenimientoRead(ORMModel):
    id: int
    numero: str
    activo_id: int
    tipo: str
    cantidad: int = 1
    seriales: Optional[List[str]] = None
    fecha_programada: Optional[datetime] = None
    fecha_ejecucion: Optional[datetime] = None
    tecnico_id: Optional[int] = None
    diagnostico: Optional[str] = None
    actividades: Optional[str] = None
    resultado: Optional[str] = None
    costo: Optional[float] = None
    proveedor_id: Optional[int] = None
    estado: str
    proposito: Optional[str] = None
    proxima_fecha: Optional[datetime] = None
    observaciones: Optional[str] = None
    acta_id: Optional[int] = None
    created_at: datetime

    activo: Optional[ActivoRead] = None
    tecnico: Optional[ResponsableRead] = None
    proveedor: Optional[ProveedorRead] = None


# ------------------------------------------------------------------ garantías
class GarantiaCreate(BaseModel):
    proveedor_id: Optional[int] = None
    fabricante: Optional[str] = None
    fecha_compra: Optional[datetime] = None
    inicio: Optional[datetime] = None
    fin: Optional[datetime] = None
    condiciones: Optional[str] = None
    documento: Optional[str] = None


class GarantiaRead(ORMModel):
    id: int
    activo_id: int
    proveedor_id: Optional[int] = None
    fabricante: Optional[str] = None
    fecha_compra: Optional[datetime] = None
    inicio: Optional[datetime] = None
    fin: Optional[datetime] = None
    condiciones: Optional[str] = None
    documento: Optional[str] = None
    created_at: datetime

    activo: Optional[ActivoRead] = None
    proveedor: Optional[ProveedorRead] = None


# ------------------------------------------------------------------ bajas
class BajaCreate(BaseModel):
    motivo_tipo: str  # DONACION | OBSOLETA | DANADA | VENTA | PERDIDA
    cantidad: int = Field(1, ge=1)
    seriales: Optional[List[str]] = None
    motivo_descripcion: Optional[str] = None
    estado_fisico: Optional[str] = None


class BajaRead(ORMModel):
    id: int
    numero: str
    activo_id: int
    cantidad: int = 1
    seriales: Optional[List[str]] = None
    motivo_tipo: str
    motivo_descripcion: Optional[str] = None
    estado_fisico: Optional[str] = None
    fecha_solicitud: datetime
    fecha_aprobacion: Optional[datetime] = None
    estado: str
    solicitante_id: Optional[int] = None
    aprobador_id: Optional[int] = None
    acta_id: Optional[int] = None
    created_at: datetime

    activo: Optional[ActivoRead] = None


# ------------------------------------------------------------------ actas
class ActaRead(ORMModel):
    id: int
    numero: str
    tipo: str
    fecha: datetime
    activo_id: Optional[int] = None
    movimiento_id: Optional[int] = None
    operacion_tipo: Optional[str] = None
    operacion_id: Optional[int] = None
    ruta_pdf: Optional[str] = None
    observaciones: Optional[str] = None
    usuario_id: Optional[int] = None
    estado: str
    created_at: datetime

    activo: Optional[ActivoRead] = None