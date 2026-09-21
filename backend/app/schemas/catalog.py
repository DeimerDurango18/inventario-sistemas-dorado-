from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel

from app.schemas.common import ORMModel


class CategoriaCreate(BaseModel):
    nombre: str


class CategoriaRead(ORMModel):
    id: int
    nombre: str
    activo: bool
    subcategorias: List["SubcategoriaRead"] = []


class SubcategoriaCreate(BaseModel):
    categoria_id: int
    nombre: str


class SubcategoriaRead(ORMModel):
    id: int
    categoria_id: int
    nombre: str
    activo: bool


class MarcaCreate(BaseModel):
    nombre: str


class MarcaRead(ORMModel):
    id: int
    nombre: str
    activo: bool


class ModeloCreate(BaseModel):
    marca_id: int
    nombre: str


class ModeloUpdate(BaseModel):
    marca_id: Optional[int] = None
    nombre: Optional[str] = None
    activo: Optional[bool] = None


class ModeloRead(ORMModel):
    id: int
    marca_id: int
    nombre: str
    activo: bool
    marca: Optional[MarcaRead] = None


class ProveedorCreate(BaseModel):
    nit: Optional[str] = None
    nombre: str
    contacto: Optional[str] = None
    telefono: Optional[str] = None
    correo: Optional[str] = None
    direccion: Optional[str] = None
    ciudad_id: Optional[int] = None


class ProveedorUpdate(BaseModel):
    nit: Optional[str] = None
    nombre: Optional[str] = None
    contacto: Optional[str] = None
    telefono: Optional[str] = None
    correo: Optional[str] = None
    direccion: Optional[str] = None
    ciudad_id: Optional[int] = None
    activo: Optional[bool] = None


class ProveedorRead(ORMModel):
    id: int
    nit: Optional[str] = None
    nombre: str
    contacto: Optional[str] = None
    telefono: Optional[str] = None
    correo: Optional[str] = None
    direccion: Optional[str] = None
    ciudad_id: Optional[int] = None
    activo: bool


class EstadoActivoCreate(BaseModel):
    codigo: str
    nombre: str
    color: str = "#6c757d"


class EstadoActivoUpdate(BaseModel):
    nombre: Optional[str] = None
    color: Optional[str] = None
    activo: Optional[bool] = None


class EstadoActivoRead(ORMModel):
    id: int
    codigo: str
    nombre: str
    color: str
    activo: bool


class AtributoDefCreate(BaseModel):
    subcategoria_id: int
    nombre: str
    tipo_dato: str = "texto"
    requerido: bool = False


class AtributoDefRead(ORMModel):
    id: int
    subcategoria_id: int
    nombre: str
    tipo_dato: str
    requerido: bool
    activo: bool


CategoriaRead.model_rebuild()