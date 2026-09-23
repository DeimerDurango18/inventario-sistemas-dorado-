from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import require_permiso
from app.core.database import get_db
from app.models.user import Usuario
from app.schemas.common import Paginated
from app.schemas.operations import AtencionCreate, AtencionRead, AtencionUpdate, InstalacionCreate, InstalacionRead, InstalacionUpdate
from app.services import operations_service

router = APIRouter(tags=["Operativo"])


# ------------------------------------------------------------------ instalaciones
@router.get("/instalaciones", response_model=Paginated[InstalacionRead])
def listar_instalaciones(
    estado: str | None = None,
    page: int = Query(1, ge=1),
    size: int = Query(30, ge=1, le=100),
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("ver_activos")),
):
    rows, total = operations_service.list_instalaciones(db, estado, page, size)
    return Paginated(items=rows, total=total, page=page, page_size=size, pages=-(total // -size))


@router.post("/instalaciones", response_model=InstalacionRead, status_code=201)
def crear_instalacion(
    data: InstalacionCreate,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_permiso("crear_movimientos")),
):
    return operations_service.crear_instalacion(db, data, user.id)


@router.put("/instalaciones/{instalacion_id}", response_model=InstalacionRead)
def actualizar_instalacion(
    instalacion_id: int,
    data: InstalacionUpdate,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_permiso("crear_movimientos")),
):
    return operations_service.actualizar_instalacion(db, instalacion_id, data, user.id)


# ------------------------------------------------------------------ atenciones de punto
@router.get("/atenciones-punto", response_model=Paginated[AtencionRead])
def listar_atenciones(
    estado: str | None = None,
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("ver_activos")),
):
    rows, total = operations_service.list_atenciones(db, estado, page, size)
    return Paginated(items=rows, total=total, page=page, page_size=size, pages=-(total // -size))


@router.post("/atenciones-punto", response_model=AtencionRead, status_code=201)
def crear_atencion(
    data: AtencionCreate,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_permiso("crear_movimientos")),
):
    return operations_service.crear_atencion(db, data, user.id)


@router.put("/atenciones-punto/{atencion_id}", response_model=AtencionRead)
def actualizar_atencion(
    atencion_id: int,
    data: AtencionUpdate,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_permiso("crear_movimientos")),
):
    return operations_service.actualizar_atencion(db, atencion_id, data, user.id)