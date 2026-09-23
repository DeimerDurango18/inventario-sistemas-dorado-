from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_permiso
from app.core.database import get_db
from app.models.user import Usuario
from app.schemas.geo import (
    CiudadCreate,
    CiudadRead,
    DepartamentoCreate,
    DepartamentoRead,
    PaisCreate,
    PaisRead,
    SedeCreate,
    SedeRead,
    SedeUpdate,
    TipoUbicacionCreate,
    TipoUbicacionRead,
    UbicacionCreate,
    UbicacionRead,
    UbicacionUpdate,
)
from app.services import geo_service

router = APIRouter(prefix="/geo", tags=["Geografía y sedes"])


@router.get("/paises", response_model=list[PaisRead])
def listar_paises(
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("ver_activos")),
):
    return geo_service.list_paises(db)


@router.post("/paises", response_model=PaisRead, status_code=201)
def crear_pais(
    data: PaisCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("gestionar_catalogos")),
):
    return geo_service.create_pais(db, data)


@router.get("/departamentos", response_model=list[DepartamentoRead])
def listar_departamentos(
    pais_id: int | None = None,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("ver_activos")),
):
    return geo_service.list_departamentos(db, pais_id)


@router.get("/ciudades", response_model=list[CiudadRead])
def listar_ciudades(
    departamento_id: int | None = None,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("ver_activos")),
):
    return geo_service.list_ciudades(db, departamento_id)


@router.post("/departamentos", response_model=DepartamentoRead, status_code=201)
def crear_departamento(
    data: DepartamentoCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("gestionar_catalogos")),
):
    return geo_service.create_departamento(db, data)


@router.post("/ciudades", response_model=CiudadRead, status_code=201)
def crear_ciudad(
    data: CiudadCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("gestionar_catalogos")),
):
    return geo_service.create_ciudad(db, data)


@router.get("/tipos-ubicacion", response_model=list[TipoUbicacionRead])
def listar_tipos_ubicacion(
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("ver_activos")),
):
    return geo_service.list_tipos_ubicacion(db)


@router.post("/tipos-ubicacion", response_model=TipoUbicacionRead, status_code=201)
def crear_tipo_ubicacion(
    data: TipoUbicacionCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("gestionar_catalogos")),
):
    return geo_service.create_tipo_ubicacion(db, data)


# ------------------------------------------------------------------ sedes
@router.get("/sedes", response_model=list[SedeRead])
def listar_sedes(
    incluir_inactivas: bool = False,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("ver_activos")),
):
    return geo_service.list_sedes(db, incluir_inactivas)


@router.post("/sedes", response_model=SedeRead, status_code=201)
def crear_sede(
    data: SedeCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("gestionar_catalogos")),
):
    return geo_service.create_sede(db, data)


@router.put("/sedes/{sede_id}", response_model=SedeRead)
def editar_sede(
    sede_id: int,
    data: SedeUpdate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("gestionar_catalogos")),
):
    return geo_service.update_sede(db, sede_id, data)


# ------------------------------------------------------------------ ubicaciones
@router.get("/ubicaciones", response_model=list[UbicacionRead])
def listar_ubicaciones(
    sede_id: int | None = None,
    incluir_inactivas: bool = False,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("ver_activos")),
):
    return geo_service.list_ubicaciones(db, sede_id, incluir_inactivas)


@router.post("/ubicaciones", response_model=UbicacionRead, status_code=201)
def crear_ubicacion(
    data: UbicacionCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("gestionar_catalogos")),
):
    return geo_service.create_ubicacion(db, data)


@router.put("/ubicaciones/{ubicacion_id}", response_model=UbicacionRead)
def editar_ubicacion(
    ubicacion_id: int,
    data: UbicacionUpdate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("gestionar_catalogos")),
):
    return geo_service.update_ubicacion(db, ubicacion_id, data)