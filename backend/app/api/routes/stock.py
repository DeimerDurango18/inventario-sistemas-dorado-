from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import require_permiso
from app.core.database import get_db
from app.models.user import Usuario
from app.schemas.common import Paginated
from app.schemas.stock import (
    MovimientoStockAnular,
    MovimientoStockCreate,
    MovimientoStockRead,
    StockItemCreate,
    StockItemRead,
    StockItemUpdate,
    StockResumen,
)
from app.services import stock_service

router = APIRouter(prefix="/stock", tags=["Stock"])


# ------------------------------------------------------------------ ítems
@router.get("/items", response_model=Paginated[StockItemRead])
def listar_items(
    q: str = "",
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=200),
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("ver_activos")),
):
    rows, total = stock_service.list_items(db, q, page, size)
    return Paginated(items=rows, total=total, page=page, page_size=size, pages=-(total // -size))


@router.get("/items/todos", response_model=list[StockItemRead])
def listar_items_todos(
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("ver_activos")),
):
    rows, _ = stock_service.list_items(db, "", 1, 1000)
    return rows


@router.post("/items", response_model=StockItemRead, status_code=201)
def crear_item(
    data: StockItemCreate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("crear_activos")),
):
    return stock_service.create_item(db, data)


@router.put("/items/{item_id}", response_model=StockItemRead)
def editar_item(
    item_id: int,
    data: StockItemUpdate,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("editar_activos")),
):
    return stock_service.update_item(db, item_id, data)


@router.post("/items/sincronizar")
def sincronizar_items(
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("editar_activos")),
):
    creados = stock_service.sincronizar_items(db)
    return {"creados": creados}


@router.get("/items/{item_id}/movimientos", response_model=Paginated[MovimientoStockRead])
def historial_item(
    item_id: int,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=200),
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("ver_activos")),
):
    rows, total = stock_service.list_movimientos(db, "", item_id, None, page, size)
    return Paginated(items=rows, total=total, page=page, page_size=size, pages=-(total // -size))


# ------------------------------------------------------------------ movimientos de stock
@router.get("/movimientos", response_model=Paginated[MovimientoStockRead])
def listar_movimientos(
    tipo: str = "",
    item_id: int | None = None,
    activo_id: int | None = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=200),
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("ver_activos")),
):
    rows, total = stock_service.list_movimientos(db, tipo, item_id, activo_id, page, size)
    return Paginated(items=rows, total=total, page=page, page_size=size, pages=-(total // -size))


@router.post("/movimientos", response_model=MovimientoStockRead, status_code=201)
def registrar_movimiento(
    data: MovimientoStockCreate,
    db: Session = Depends(get_db),
    actor: Usuario = Depends(require_permiso("crear_movimientos")),
):
    return stock_service.registrar_movimiento(db, data, actor.id)


@router.put("/movimientos/{mov_id}/anular", response_model=MovimientoStockRead)
def anular_movimiento(
    mov_id: int,
    data: MovimientoStockAnular,
    db: Session = Depends(get_db),
    actor: Usuario = Depends(require_permiso("aprobar_movimientos")),
):
    return stock_service.anular_movimiento(db, mov_id, data.motivo, actor.id)


# ------------------------------------------------------------------ resumen
@router.get("/resumen", response_model=StockResumen)
def resumen_stock(
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("ver_activos")),
):
    return stock_service.resumen(db)