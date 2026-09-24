from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from app.schemas.asset import ActivoRead
from app.schemas.catalog import CategoriaRead, MarcaRead, ModeloRead, ProveedorRead
from app.schemas.common import ORMModel
from app.schemas.geo import UbicacionRead
from app.schemas.user import UsuarioRead


# ------------------------------------------------------------------ ítems agregados
class StockItemCreate(BaseModel):
    nombre: str
    tipo: str = "EQUIPO"
    codigo: Optional[str] = None
    marca_id: Optional[int] = None
    modelo_id: Optional[int] = None
    categoria_id: Optional[int] = None
    stock_minimo: int = Field(0, ge=0)
    valor_unitario: Optional[float] = None


class StockItemUpdate(BaseModel):
    nombre: Optional[str] = None
    tipo: Optional[str] = None
    codigo: Optional[str] = None
    marca_id: Optional[int] = None
    modelo_id: Optional[int] = None
    categoria_id: Optional[int] = None
    stock_minimo: Optional[int] = None
    valor_unitario: Optional[float] = None
    activo: Optional[bool] = None


class StockUbicacionRead(ORMModel):
    id: int
    ubicacion_id: int
    cantidad: int

    ubicacion: Optional[UbicacionRead] = None


class StockItemRead(ORMModel):
    id: int
    nombre: str
    tipo: str
    codigo: Optional[str] = None
    marca_id: Optional[int] = None
    modelo_id: Optional[int] = None
    categoria_id: Optional[int] = None
    cantidad_stock: int
    stock_minimo: int
    valor_unitario: Optional[float] = None
    valor_total: float = 0.0
    activo: bool
    created_at: datetime

    marca: Optional[MarcaRead] = None
    modelo: Optional[ModeloRead] = None
    categoria: Optional[CategoriaRead] = None
    ubicaciones: Optional[list[StockUbicacionRead]] = []


# ------------------------------------------------------------------ movimientos entrada/salida
class MovimientoStockCreate(BaseModel):
    tipo: str  # ENTRADA | SALIDA | AJUSTE
    referencia_tipo: str = "ITEM"  # ITEM | ACTIVO
    item_id: Optional[int] = None
    activo_id: Optional[int] = None
    cantidad: int = Field(1, ge=1)
    seriales: Optional[List[str]] = None
    ubicacion_id: Optional[int] = None  # bodega/sede de la operación
    nuevo_stock: Optional[int] = Field(None, ge=0)  # requerido en AJUSTE
    proveedor_id: Optional[int] = None
    documento: Optional[str] = None
    destino: Optional[str] = None
    valor: Optional[float] = None
    motivo: Optional[str] = None
    observaciones: Optional[str] = None
    fecha: Optional[datetime] = None


class MovimientoStockAnular(BaseModel):
    motivo: str = Field(min_length=1)


class MovimientoStockRead(ORMModel):
    id: int
    numero: str
    tipo: str
    referencia_tipo: str
    item_id: Optional[int] = None
    activo_id: Optional[int] = None
    cantidad: int
    seriales: Optional[List[str]] = None
    fecha: datetime
    proveedor_id: Optional[int] = None
    documento: Optional[str] = None
    destino: Optional[str] = None
    valor: Optional[float] = None
    ubicacion_id: Optional[int] = None
    nuevo_stock: Optional[int] = None
    stock_anterior: Optional[int] = None
    motivo: Optional[str] = None
    observaciones: Optional[str] = None
    usuario_id: int
    estado: str
    anulado_motivo: Optional[str] = None
    anulado_usuario_id: Optional[int] = None
    anulado_fecha: Optional[datetime] = None
    acta_id: Optional[int] = None
    created_at: datetime

    item: Optional[StockItemRead] = None
    activo: Optional[ActivoRead] = None
    proveedor: Optional[ProveedorRead] = None
    ubicacion: Optional[UbicacionRead] = None
    usuario: Optional[UsuarioRead] = None


class StockResumenSede(BaseModel):
    ubicacion_id: int
    nombre: str
    unidades: int


# ------------------------------------------------------------------ resumen
class StockResumen(BaseModel):
    items_activos: int
    unidades_totales: int
    valor_stock: float
    stock_bajo: list[StockItemRead]
    activos_en_bodega: int
    por_sede: list[StockResumenSede] = []