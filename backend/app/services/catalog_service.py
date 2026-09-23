from __future__ import annotations

from typing import Any, Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.errors import ConflictError, NotFoundError
from app.models.catalog import (
    AtributoDefinicion,
    Categoria,
    EstadoActivo,
    Marca,
    Modelo,
    Proveedor,
    Subcategoria,
)
from app.schemas.catalog import (
    AtributoDefCreate,
    CategoriaCreate,
    EstadoActivoCreate,
    EstadoActivoUpdate,
    MarcaCreate,
    ModeloCreate,
    ModeloUpdate,
    ProveedorCreate,
    ProveedorUpdate,
    SubcategoriaCreate,
)
from app.services.numbering import audit as audit_log


def _paginate(db: Session, model, page: int, size: int, order_col):
    total = db.scalar(select(func.count()).select_from(model))
    rows = db.scalars(select(model).order_by(order_col).offset((page - 1) * size).limit(size)).all()
    return rows, total


def _get_or_404(db: Session, model, pk: int, nombre: str):
    m = db.get(model, pk)
    if not m:
        raise NotFoundError(nombre)
    return m


# ------------------------------------------------------------------ categorías
def list_categorias(db: Session, page: int = 1, size: int = 50, incluir_inactivas: bool = False):
    stmt = select(Categoria).options(selectinload(Categoria.subcategorias))
    if not incluir_inactivas:
        stmt = stmt.where(Categoria.activo == True)  # noqa: E712
    total = db.scalar(select(func.count()).select_from(Categoria))
    rows = db.scalars(stmt.order_by(Categoria.nombre).offset((page - 1) * size).limit(size)).all()
    return rows, total


def create_categoria(db: Session, data: CategoriaCreate) -> Categoria:
    dup = db.scalar(select(Categoria).where(Categoria.nombre.ilike(data.nombre)))
    if dup:
        raise ConflictError("Ya existe una categoría con ese nombre.")
    cat = Categoria(nombre=data.nombre)
    db.add(cat)
    db.flush()
    for nombre in data.subcategorias:
        if not nombre or not nombre.strip():
            continue
        sub = Subcategoria(categoria_id=cat.id, nombre=nombre.strip())
        db.add(sub)
    db.flush()
    audit_log(db, "CATALOGOS", "Categoria", cat.id, "CREAR", f"Categoría {data.nombre} creada")
    db.commit()
    db.refresh(cat)
    return cat


def deactivate_categoria(db: Session, cat_id: int) -> Categoria:
    cat = _get_or_404(db, Categoria, cat_id, "Categoría")
    cat.activo = False
    db.flush()
    audit_log(db, "CATALOGOS", "Categoria", cat.id, "ANULAR", f"Categoría {cat.nombre} desactivada")
    db.commit()
    db.refresh(cat)
    return cat


def list_subcategorias(db: Session, categoria_id: Optional[int] = None):
    stmt = select(Subcategoria)
    if categoria_id:
        stmt = stmt.where(Subcategoria.categoria_id == categoria_id)
    return db.scalars(stmt.order_by(Subcategoria.nombre)).all()


def create_subcategoria(db: Session, data: SubcategoriaCreate) -> Subcategoria:
    _get_or_404(db, Categoria, data.categoria_id, "Categoría")
    dup = db.scalar(
        select(Subcategoria).where(
            Subcategoria.categoria_id == data.categoria_id,
            Subcategoria.nombre.ilike(data.nombre),
        )
    )
    if dup:
        raise ConflictError("Ya existe esa subcategoría en la categoría.")
    sub = Subcategoria(categoria_id=data.categoria_id, nombre=data.nombre)
    db.add(sub)
    db.flush()
    audit_log(db, "CATALOGOS", "Subcategoria", sub.id, "CREAR", f"Subcategoría {data.nombre} creada")
    db.commit()
    db.refresh(sub)
    return sub


# ------------------------------------------------------------------ marcas
def list_marcas(db: Session, page: int = 1, size: int = 50, incluir_inactivas: bool = False):
    stmt = select(Marca)
    if not incluir_inactivas:
        stmt = stmt.where(Marca.activo == True)  # noqa: E712
    total = db.scalar(select(func.count()).select_from(Marca))
    rows = db.scalars(stmt.order_by(Marca.nombre).offset((page - 1) * size).limit(size)).all()
    return rows, total


def create_marca(db: Session, data: MarcaCreate) -> Marca:
    dup = db.scalar(select(Marca).where(Marca.nombre.ilike(data.nombre)))
    if dup:
        raise ConflictError("Ya existe esa marca.")
    m = Marca(nombre=data.nombre)
    db.add(m)
    db.flush()
    audit_log(db, "CATALOGOS", "Marca", m.id, "CREAR", f"Marca {data.nombre} creada")
    db.commit()
    db.refresh(m)
    return m


def deactivate_marca(db: Session, marca_id: int) -> Marca:
    m = _get_or_404(db, Marca, marca_id, "Marca")
    m.activo = False
    db.flush()
    audit_log(db, "CATALOGOS", "Marca", m.id, "ANULAR", f"Marca {m.nombre} desactivada")
    db.commit()
    db.refresh(m)
    return m


# ------------------------------------------------------------------ modelos
def list_modelos(db: Session, marca_id: Optional[int] = None, incluir_inactivas: bool = False):
    stmt = select(Modelo).options(selectinload(Modelo.marca))
    if marca_id:
        stmt = stmt.where(Modelo.marca_id == marca_id)
    if not incluir_inactivas:
        stmt = stmt.where(Modelo.activo == True)  # noqa: E712
    return db.scalars(stmt.order_by(Modelo.nombre)).all()


def create_modelo(db: Session, data: ModeloCreate) -> Modelo:
    _get_or_404(db, Marca, data.marca_id, "Marca")
    dup = db.scalar(
        select(Modelo).where(Modelo.marca_id == data.marca_id, Modelo.nombre.ilike(data.nombre))
    )
    if dup:
        raise ConflictError("Ya existe ese modelo para la marca.")
    m = Modelo(marca_id=data.marca_id, nombre=data.nombre)
    db.add(m)
    db.flush()
    audit_log(db, "CATALOGOS", "Modelo", m.id, "CREAR", f"Modelo {data.nombre} creado")
    db.commit()
    db.refresh(m)
    return m


def update_modelo(db: Session, modelo_id: int, data: ModeloUpdate) -> Modelo:
    m = _get_or_404(db, Modelo, modelo_id, "Modelo")
    if data.marca_id is not None:
        _get_or_404(db, Marca, data.marca_id, "Marca")
        m.marca_id = data.marca_id
    if data.nombre is not None:
        m.nombre = data.nombre
    if data.activo is not None:
        m.activo = data.activo
    db.flush()
    audit_log(db, "CATALOGOS", "Modelo", m.id, "EDITAR", f"Modelo {m.nombre} actualizado")
    db.commit()
    db.refresh(m)
    return m


# ------------------------------------------------------------------ proveedores
def list_proveedores(db: Session, page: int = 1, size: int = 50, incluir_inactivas: bool = False):
    stmt = select(Proveedor)
    if not incluir_inactivas:
        stmt = stmt.where(Proveedor.activo == True)  # noqa: E712
    total = db.scalar(select(func.count()).select_from(Proveedor))
    rows = db.scalars(stmt.order_by(Proveedor.nombre).offset((page - 1) * size).limit(size)).all()
    return rows, total


def create_proveedor(db: Session, data: ProveedorCreate) -> Proveedor:
    dup = db.scalar(select(Proveedor).where(Proveedor.nombre.ilike(data.nombre)))
    if dup:
        raise ConflictError("Ya existe un proveedor con ese nombre.")
    p = Proveedor(**data.model_dump())
    db.add(p)
    db.flush()
    audit_log(db, "CATALOGOS", "Proveedor", p.id, "CREAR", f"Proveedor {data.nombre} creado")
    db.commit()
    db.refresh(p)
    return p


def update_proveedor(db: Session, prov_id: int, data: ProveedorUpdate) -> Proveedor:
    p = _get_or_404(db, Proveedor, prov_id, "Proveedor")
    for campo in ("nit", "nombre", "contacto", "telefono", "correo", "direccion", "ciudad_id", "activo"):
        v = getattr(data, campo)
        if v is not None:
            setattr(p, campo, v)
    db.flush()
    audit_log(db, "CATALOGOS", "Proveedor", p.id, "EDITAR", f"Proveedor {p.nombre} actualizado")
    db.commit()
    db.refresh(p)
    return p


def deactivate_proveedor(db: Session, proveedor_id: int) -> Proveedor:
    p = _get_or_404(db, Proveedor, proveedor_id, "Proveedor")
    p.activo = False
    db.flush()
    audit_log(db, "CATALOGOS", "Proveedor", p.id, "ANULAR", f"Proveedor {p.nombre} desactivado")
    db.commit()
    db.refresh(p)
    return p


# ------------------------------------------------------------------ estados
def list_estados(db: Session, incluir_inactivos: bool = False) -> list[EstadoActivo]:
    stmt = select(EstadoActivo)
    if not incluir_inactivos:
        stmt = stmt.where(EstadoActivo.activo == True)  # noqa: E712
    return db.scalars(stmt.order_by(EstadoActivo.id)).all()


def create_estado(db: Session, data: EstadoActivoCreate) -> EstadoActivo:
    dup = db.scalar(select(EstadoActivo).where(EstadoActivo.codigo == data.codigo))
    if dup:
        raise ConflictError("Ya existe un estado con ese código.")
    e = EstadoActivo(**data.model_dump())
    db.add(e)
    db.flush()
    audit_log(db, "CATALOGOS", "EstadoActivo", e.id, "CREAR", f"Estado {data.codigo} creado")
    db.commit()
    db.refresh(e)
    return e


def update_estado(db: Session, estado_id: int, data: EstadoActivoUpdate) -> EstadoActivo:
    e = _get_or_404(db, EstadoActivo, estado_id, "Estado")
    if data.nombre is not None:
        e.nombre = data.nombre
    if data.color is not None:
        e.color = data.color
    if data.activo is not None:
        e.activo = data.activo
    db.flush()
    audit_log(db, "CATALOGOS", "EstadoActivo", e.id, "EDITAR", f"Estado {e.codigo} actualizado")
    db.commit()
    db.refresh(e)
    return e


# ------------------------------------------------------------------ atributos
def list_atributos(db: Session, subcategoria_id: int | None = None) -> list[AtributoDefinicion]:
    stmt = select(AtributoDefinicion).where(AtributoDefinicion.activo == True)  # noqa: E712
    if subcategoria_id:
        stmt = stmt.where(AtributoDefinicion.subcategoria_id == subcategoria_id)
    return db.scalars(stmt.order_by(AtributoDefinicion.nombre)).all()


def create_atributo(db: Session, data: AtributoDefCreate) -> AtributoDefinicion:
    _get_or_404(db, Subcategoria, data.subcategoria_id, "Subcategoría")
    a = AtributoDefinicion(**data.model_dump())
    db.add(a)
    db.flush()
    audit_log(db, "CATALOGOS", "AtributoDefinicion", a.id, "CREAR", f"Atributo {data.nombre} creado")
    db.commit()
    db.refresh(a)
    return a