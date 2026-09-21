from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_permiso
from app.core.database import get_db
from app.models.user import Usuario
from app.schemas.asset import (
    ActaRead,
    ActivoCreate,
    ActivoRead,
    ActivoUpdate,
    BajaCreate,
    BajaRead,
    GarantiaCreate,
    GarantiaRead,
    MantenimientoCerrar,
    MantenimientoCreate,
    MantenimientoRead,
    MovimientoAnular,
    MovimientoCreate,
    MovimientoRead,
    PrestamoCreate,
    PrestamoRead,
    ResponsableCreate,
    ResponsableRead,
    ResponsableUpdate,
)
from app.schemas.common import Paginated
from app.services import asset_service

router = APIRouter(prefix="/activos", tags=["Activos"])


# ------------------------------------------------------------------ responsables
@router.get("/responsables", response_model=list[ResponsableRead])
def listar_responsables(
    q: str = "",
    activo: bool | None = None,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("ver_activos")),
):
    return asset_service.list_responsables(db, q, activo)


@router.post("/responsables", response_model=ResponsableRead, status_code=201)
def crear_responsable(
    data: ResponsableCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("crear_activos")),
):
    return asset_service.create_responsable(db, data)


@router.put("/responsables/{rid}", response_model=ResponsableRead)
def editar_responsable(
    rid: int,
    data: ResponsableUpdate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("editar_activos")),
):
    return asset_service.update_responsable(db, rid, data)


# ------------------------------------------------------------------ activos (lista)
@router.get("", response_model=Paginated[ActivoRead])
def listar_activos(
    q: str = "",
    categoria_id: int | None = None,
    estado_id: int | None = None,
    ubicacion_id: int | None = None,
    sede_id: int | None = None,
    marca_id: int | None = None,
    tipo: str | None = None,
    responsable_id: int | None = None,
    incluir_inactivos: bool = False,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=200),
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("ver_activos")),
):
    rows, total = asset_service.list_activos(
        db, q, categoria_id, estado_id, ubicacion_id, sede_id, marca_id, tipo, responsable_id,
        incluir_inactivos, page, size,
    )
    return Paginated(items=rows, total=total, page=page, page_size=size, pages=-(total // -size))


@router.post("", response_model=ActivoRead, status_code=201)
def crear_activo(
    data: ActivoCreate,
    db: Session = Depends(get_db),
    actor: Usuario = Depends(require_permiso("crear_activos")),
):
    return asset_service.create_activo(db, data, actor.id)


# ------------------------------------------------------------------ movimientos
@router.get("/movimientos", response_model=Paginated[MovimientoRead])
def listar_movimientos(
    activo_id: int | None = None,
    tipo: str | None = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=200),
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("ver_activos")),
):
    rows, total = asset_service.list_movimientos(db, activo_id, tipo, page, size)
    return Paginated(items=rows, total=total, page=page, page_size=size, pages=-(total // -size))


@router.put("/movimientos/{mov_id}/anular", response_model=MovimientoRead)
def anular_movimiento(
    mov_id: int,
    data: MovimientoAnular,
    db: Session = Depends(get_db),
    actor: Usuario = Depends(require_permiso("aprobar_movimientos")),
):
    return asset_service.anular_movimiento(db, mov_id, data.motivo, actor.id)


@router.get("/movimientos/actas", response_model=Paginated[ActaRead])
def listar_actas(
    activo_id: int | None = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=200),
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("ver_activos")),
):
    rows, total = asset_service.list_actas(db, activo_id, page, size)
    return Paginated(items=rows, total=total, page=page, page_size=size, pages=-(total // -size))


# ------------------------------------------------------------------ préstamos
@router.get("/prestamos", response_model=list[PrestamoRead])
def listar_prestamos(
    estado: str | None = None,
    activo_id: int | None = None,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("ver_activos")),
):
    return asset_service.list_prestamos(db, estado, activo_id)


@router.put("/prestamos/{prestamo_id}/aprobar", response_model=PrestamoRead)
def aprobar_prestamo(
    prestamo_id: int,
    db: Session = Depends(get_db),
    actor: Usuario = Depends(require_permiso("aprobar_movimientos")),
):
    return asset_service.aprobar_prestamo(db, prestamo_id, actor.id)


@router.put("/prestamos/{prestamo_id}/devolver", response_model=PrestamoRead)
def devolver_prestamo(
    prestamo_id: int,
    db: Session = Depends(get_db),
    actor: Usuario = Depends(require_permiso("crear_movimientos")),
):
    return asset_service.devolver_prestamo(db, prestamo_id, actor.id)


# ------------------------------------------------------------------ mantenimientos
@router.get("/mantenimientos", response_model=list[MantenimientoRead])
def listar_mantenimientos(
    estado: str | None = None,
    activo_id: int | None = None,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("ver_activos")),
):
    return asset_service.list_mantenimientos(db, estado, activo_id)


@router.put("/mantenimientos/{mant_id}/cerrar", response_model=MantenimientoRead)
def cerrar_mantenimiento(
    mant_id: int,
    data: MantenimientoCerrar,
    db: Session = Depends(get_db),
    actor: Usuario = Depends(require_permiso("registrar_mantenimiento")),
):
    return asset_service.cerrar_mantenimiento(db, mant_id, actor.id, data.resultado, data.observaciones, data.costo)


# ------------------------------------------------------------------ garantías
@router.get("/garantias", response_model=list[GarantiaRead])
def listar_garantias(
    activo_id: int | None = None,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("ver_activos")),
):
    return asset_service.list_garantias(db, activo_id)


# ------------------------------------------------------------------ bajas
@router.get("/bajas", response_model=list[BajaRead])
def listar_bajas(
    estado: str | None = None,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("ver_activos")),
):
    return asset_service.list_bajas(db, estado)


@router.put("/bajas/{baja_id}/aprobar", response_model=BajaRead)
def aprobar_baja(
    baja_id: int,
    db: Session = Depends(get_db),
    actor: Usuario = Depends(require_permiso("aprobar_movimientos")),
):
    return asset_service.aprobar_baja(db, baja_id, actor.id)


# ------------------------------------------------------------------ consulta por código
@router.get("/consulta/{codigo}", response_model=ActivoRead)
def consultar_por_codigo(
    codigo: str,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("ver_activos")),
):
    return asset_service.get_activo_by_codigo(db, codigo)


# ------------------------------------------------------------------ activo individual y operaciones
@router.get("/{activo_id}", response_model=ActivoRead)
def detalle_activo(
    activo_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("ver_activos")),
):
    return asset_service.get_activo(db, activo_id)


@router.put("/{activo_id}", response_model=ActivoRead)
def editar_activo(
    activo_id: int,
    data: ActivoUpdate,
    db: Session = Depends(get_db),
    actor: Usuario = Depends(require_permiso("editar_activos")),
):
    return asset_service.update_activo(db, activo_id, data, actor.id)


@router.get("/{activo_id}/qr")
def qr_activo(
    activo_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("ver_activos")),
):
    activo = asset_service.get_activo(db, activo_id)
    return Response(content=asset_service.get_qr_bytes(db, activo), media_type="image/png")


@router.post("/{activo_id}/movimientos", response_model=MovimientoRead, status_code=201)
def registrar_movimiento(
    activo_id: int,
    data: MovimientoCreate,
    db: Session = Depends(get_db),
    actor: Usuario = Depends(require_permiso("crear_movimientos")),
):
    return asset_service.registrar_movimiento(db, activo_id, data, actor.id)


@router.post("/{activo_id}/prestamos", response_model=PrestamoRead, status_code=201)
def crear_prestamo(
    activo_id: int,
    data: PrestamoCreate,
    db: Session = Depends(get_db),
    actor: Usuario = Depends(require_permiso("crear_movimientos")),
):
    return asset_service.crear_prestamo(db, activo_id, data, actor.id)


@router.post("/{activo_id}/mantenimientos", response_model=MantenimientoRead, status_code=201)
def crear_mantenimiento(
    activo_id: int,
    data: MantenimientoCreate,
    db: Session = Depends(get_db),
    actor: Usuario = Depends(require_permiso("registrar_mantenimiento")),
):
    return asset_service.crear_mantenimiento(db, activo_id, data, actor.id)


@router.post("/{activo_id}/garantias", response_model=GarantiaRead, status_code=201)
def crear_garantia(
    activo_id: int,
    data: GarantiaCreate,
    db: Session = Depends(get_db),
    actor: Usuario = Depends(require_permiso("crear_activos")),
):
    return asset_service.crear_garantia(db, activo_id, data, actor.id)


@router.post("/{activo_id}/bajas", response_model=BajaRead, status_code=201)
def registrar_baja(
    activo_id: int,
    data: BajaCreate,
    db: Session = Depends(get_db),
    actor: Usuario = Depends(require_permiso("crear_movimientos")),
):
    return asset_service.registrar_baja(db, activo_id, data, actor.id)