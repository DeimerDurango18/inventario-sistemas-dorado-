from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_permiso
from app.core.database import get_db
from app.models.user import Usuario
from app.schemas.catalog import (
    AtributoDefCreate,
    AtributoDefRead,
    CategoriaCreate,
    CategoriaRead,
    EstadoActivoCreate,
    EstadoActivoRead,
    EstadoActivoUpdate,
    MarcaCreate,
    MarcaRead,
    ModeloCreate,
    ModeloRead,
    ModeloUpdate,
    ProveedorCreate,
    ProveedorRead,
    ProveedorUpdate,
    SubcategoriaCreate,
    SubcategoriaRead,
)
from app.schemas.common import Paginated
from app.services import catalog_service

router = APIRouter(prefix="/catalogo", tags=["Catálogos"])


# ------------------------------------------------------------------ categorías
@router.get("/categorias", response_model=Paginated[CategoriaRead])
def listar_categorias(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=500),
    incluir_inactivas: bool = False,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("ver_activos")),
):
    rows, total = catalog_service.list_categorias(db, page, size, incluir_inactivas)
    pages = -(total // -size) if size else 0
    return Paginated(items=rows, total=total, page=page, page_size=size, pages=pages)


@router.get("/categorias/todas", response_model=list[CategoriaRead])
def categorias_todas(
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("ver_activos")),
):
    rows, _ = catalog_service.list_categorias(db, 1, 10000, incluir_inactivas=True)
    return rows


@router.post("/categorias", response_model=CategoriaRead, status_code=201)
def crear_categoria(
    data: CategoriaCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("gestionar_catalogos")),
):
    return catalog_service.create_categoria(db, data)


@router.delete("/categorias/{cat_id}", response_model=CategoriaRead)
def desactivar_categoria(
    cat_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("gestionar_catalogos")),
):
    return catalog_service.deactivate_categoria(db, cat_id)


@router.get("/subcategorias", response_model=list[SubcategoriaRead])
def listar_subcategorias(
    categoria_id: int | None = None,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("ver_activos")),
):
    return catalog_service.list_subcategorias(db, categoria_id)


@router.post("/subcategorias", response_model=SubcategoriaRead, status_code=201)
def crear_subcategoria(
    data: SubcategoriaCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("gestionar_catalogos")),
):
    return catalog_service.create_subcategoria(db, data)


# ------------------------------------------------------------------ marcas / modelos
@router.get("/marcas", response_model=Paginated[MarcaRead])
def listar_marcas(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=500),
    incluir_inactivas: bool = False,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("ver_activos")),
):
    rows, total = catalog_service.list_marcas(db, page, size, incluir_inactivas)
    return Paginated(items=rows, total=total, page=page, page_size=size, pages=-(total // -size))


@router.post("/marcas", response_model=MarcaRead, status_code=201)
def crear_marca(
    data: MarcaCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("gestionar_catalogos")),
):
    return catalog_service.create_marca(db, data)


@router.delete("/marcas/{marca_id}", response_model=MarcaRead)
def desactivar_marca(
    marca_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("gestionar_catalogos")),
):
    return catalog_service.deactivate_marca(db, marca_id)


@router.get("/modelos", response_model=list[ModeloRead])
def listar_modelos(
    marca_id: int | None = None,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("ver_activos")),
):
    return catalog_service.list_modelos(db, marca_id)


@router.post("/modelos", response_model=ModeloRead, status_code=201)
def crear_modelo(
    data: ModeloCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("gestionar_catalogos")),
):
    return catalog_service.create_modelo(db, data)


@router.put("/modelos/{modelo_id}", response_model=ModeloRead)
def editar_modelo(
    modelo_id: int,
    data: ModeloUpdate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("gestionar_catalogos")),
):
    return catalog_service.update_modelo(db, modelo_id, data)


# ------------------------------------------------------------------ proveedores
@router.get("/proveedores", response_model=Paginated[ProveedorRead])
def listar_proveedores(
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=500),
    incluir_inactivos: bool = False,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("ver_activos")),
):
    rows, total = catalog_service.list_proveedores(db, page, size, incluir_inactivos)
    return Paginated(items=rows, total=total, page=page, page_size=size, pages=-(total // -size))


@router.post("/proveedores", response_model=ProveedorRead, status_code=201)
def crear_proveedor(
    data: ProveedorCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("gestionar_catalogos")),
):
    return catalog_service.create_proveedor(db, data)


@router.put("/proveedores/{prov_id}", response_model=ProveedorRead)
def editar_proveedor(
    prov_id: int,
    data: ProveedorUpdate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("gestionar_catalogos")),
):
    return catalog_service.update_proveedor(db, prov_id, data)


@router.delete("/proveedores/{prov_id}", response_model=ProveedorRead)
def desactivar_proveedor(
    prov_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("gestionar_catalogos")),
):
    return catalog_service.deactivate_proveedor(db, prov_id)


# ------------------------------------------------------------------ estados y atributos
@router.get("/estados", response_model=list[EstadoActivoRead])
def listar_estados(
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("ver_activos")),
):
    return catalog_service.list_estados(db)


@router.post("/estados", response_model=EstadoActivoRead, status_code=201)
def crear_estado(
    data: EstadoActivoCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("gestionar_catalogos")),
):
    return catalog_service.create_estado(db, data)


@router.put("/estados/{estado_id}", response_model=EstadoActivoRead)
def editar_estado(
    estado_id: int,
    data: EstadoActivoUpdate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("gestionar_catalogos")),
):
    return catalog_service.update_estado(db, estado_id, data)


@router.get("/atributos", response_model=list[AtributoDefRead])
def listar_atributos(
    subcategoria_id: int | None = None,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("ver_activos")),
):
    return catalog_service.list_atributos(db, subcategoria_id)


@router.post("/atributos", response_model=AtributoDefRead, status_code=201)
def crear_atributo(
    data: AtributoDefCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("gestionar_catalogos")),
):
    return catalog_service.create_atributo(db, data)