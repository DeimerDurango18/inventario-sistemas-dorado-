"""Servicio del módulo de stock: ítems agregados y movimientos de entrada/salida/ajuste.

Las entradas incrementan la existencia, las salidas la decrementan (nunca por
debajo de lo disponible) y los ajustes corrigen el stock a un valor real (conteo
físico). Las entradas y salidas generan su acta; los ajustes quedan en el ledger
con el valor previo y el nuevo para poder revertirse exactamente. El stock de los
ítems agregados puede desglosarse por ubicación (bodega/sede).
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.errors import ConflictError, NotFoundError, ValidationError
from app.models.asset import Activo
from app.models.catalog import EstadoActivo, Proveedor
from app.models.geo import Ubicacion
from app.models.stock import MovimientoStock, StockItem, StockItemUbicacion
from app.schemas.stock import (
    MovimientoStockCreate,
    StockItemCreate,
    StockItemUpdate,
)
from app.services import notifications
from app.services.asset_service import _crear_acta
from app.services.numbering import audit as audit_op, get_next_number

_APROBADORES = ["ADMINISTRADOR", "SUPERVISOR"]
_PREFIJOS = {"ENTRADA": "ENS", "SALIDA": "SIS", "AJUSTE": "AJS"}


def _get_or_404(db: Session, model, pk: int, nombre: str):
    m = db.get(model, pk)
    if not m:
        raise NotFoundError(nombre)
    return m


def _get_item(db: Session, item_id: int) -> StockItem:
    return _get_or_404(db, StockItem, item_id, "Ítem de stock")


def _get_mov(db: Session, mov_id: int) -> MovimientoStock:
    return _get_or_404(db, MovimientoStock, mov_id, "Movimiento de stock")


def _ubicacion_row(db: Session, item_id: int, ubicacion_id: int) -> StockItemUbicacion:
    row = db.scalar(
        select(StockItemUbicacion).where(
            StockItemUbicacion.item_id == item_id,
            StockItemUbicacion.ubicacion_id == ubicacion_id,
        )
    )
    if not row:
        row = StockItemUbicacion(item_id=item_id, ubicacion_id=ubicacion_id, cantidad=0)
        db.add(row)
        db.flush()
    return row


# ------------------------------------------------------------------ ítems
def list_items(db: Session, q: str = "", page: int = 1, size: int = 20):
    stmt = select(StockItem)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            StockItem.nombre.ilike(like)
            | StockItem.codigo.ilike(like)
            | StockItem.tipo.ilike(like)
        )
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = db.execute(
        stmt.order_by(StockItem.nombre).offset((page - 1) * size).limit(size)
    ).unique().scalars().all()
    return rows, total


def create_item(db: Session, data: StockItemCreate) -> StockItem:
    if data.codigo:
        dup = db.scalar(select(StockItem).where(StockItem.codigo == data.codigo))
        if dup:
            raise ConflictError("Ya existe un ítem con ese código.")
    item = StockItem(**data.model_dump())
    db.add(item)
    db.flush()
    audit_op(db, "STOCK", "StockItem", item.id, "CREAR", f"Ítem {item.nombre} creado")
    db.commit()
    db.refresh(item)
    return item


def update_item(db: Session, item_id: int, data: StockItemUpdate) -> StockItem:
    item = _get_item(db, item_id)
    if data.codigo and data.codigo != item.codigo:
        dup = db.scalar(select(StockItem).where(StockItem.codigo == data.codigo))
        if dup:
            raise ConflictError("Ya existe un ítem con ese código.")
    for campo in ("nombre", "tipo", "codigo", "marca_id", "modelo_id", "categoria_id", "stock_minimo", "valor_unitario", "activo"):
        v = getattr(data, campo)
        if v is not None:
            setattr(item, campo, v)
    db.flush()
    audit_op(db, "STOCK", "StockItem", item.id, "EDITAR", f"Ítem {item.nombre} actualizado")
    db.commit()
    db.refresh(item)
    return item


def sincronizar_items(db: Session) -> int:
    """Crea ítems agregados a partir de la ficha de activos existente (marca/modelo/tipo).

    Solo crea combinaciones nuevas; las existencias iniciales parten de los activos
    que actualmente están en bodega.
    """
    bodega = db.scalar(select(EstadoActivo).where(EstadoActivo.codigo == "BODEGA"))
    agregados: dict[tuple, dict] = {}
    for activo in db.scalars(select(Activo)).all():
        clave = (activo.tipo, activo.marca_id, activo.modelo_id)
        info = agregados.setdefault(
            clave,
            {"tipo": activo.tipo, "marca_id": activo.marca_id, "modelo_id": activo.modelo_id, "en_bodega": 0},
        )
        if bodega and activo.estado_id == bodega.id and activo.cantidad_stock:
            info["en_bodega"] += activo.cantidad_stock

    creados = 0
    for info in agregados.values():
        condiciones = [StockItem.tipo == info["tipo"]]
        condiciones.append(
            StockItem.marca_id.is_(None) if info["marca_id"] is None else StockItem.marca_id == info["marca_id"]
        )
        condiciones.append(
            StockItem.modelo_id.is_(None) if info["modelo_id"] is None else StockItem.modelo_id == info["modelo_id"]
        )
        existe = db.scalar(select(StockItem).where(*condiciones))
        if existe:
            if info["en_bodega"]:
                existe.cantidad_stock += info["en_bodega"]
            continue
        item = StockItem(
            nombre=info["tipo"].capitalize(),
            tipo=info["tipo"],
            marca_id=info["marca_id"],
            modelo_id=info["modelo_id"],
            cantidad_stock=info["en_bodega"],
        )
        db.add(item)
        creados += 1
    db.flush()
    if creados:
        audit_op(db, "STOCK", "StockItem", 0, "SINCRONIZAR", f"Se crearon {creados} ítems desde los activos")
    db.commit()
    return creados


# ------------------------------------------------------------------ movimientos de stock
def list_movimientos(db: Session, tipo: str = "", item_id: int | None = None, activo_id: int | None = None, page: int = 1, size: int = 20):
    stmt = select(MovimientoStock)
    if tipo:
        stmt = stmt.where(MovimientoStock.tipo == tipo.upper())
    if item_id:
        stmt = stmt.where(MovimientoStock.item_id == item_id)
    if activo_id:
        stmt = stmt.where(MovimientoStock.activo_id == activo_id)
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = db.execute(
        stmt.order_by(MovimientoStock.fecha.desc()).offset((page - 1) * size).limit(size)
    ).unique().scalars().all()
    return rows, total


def registrar_movimiento(db: Session, data: MovimientoStockCreate, actor_id: int) -> MovimientoStock:
    tipo = (data.tipo or "").upper()
    if tipo not in _PREFIJOS:
        raise ValidationError("El tipo debe ser ENTRADA, SALIDA o AJUSTE.")
    ref_tipo = (data.referencia_tipo or "ITEM").upper()
    if ref_tipo not in ("ITEM", "ACTIVO"):
        raise ValidationError("La referencia debe ser ITEM o ACTIVO.")

    if data.ubicacion_id:
        ubicacion = _get_or_404(db, Ubicacion, data.ubicacion_id, "Ubicación")
    else:
        ubicacion = None

    if ref_tipo == "ITEM":
        item = _get_item(db, data.item_id)
        if not item.activo:
            raise ConflictError("El ítem está inactivo.")
        ref_id_para_acta = None
        nombre = item.nombre
    else:
        activo = _get_or_404(db, Activo, data.activo_id, "Activo")
        ref_id_para_acta = activo.id
        nombre = activo.codigo

    stock_actual = item.cantidad_stock if ref_tipo == "ITEM" else activo.cantidad_stock
    cantidad_mov = data.cantidad
    stock_anterior: int | None = None
    nuevo_stock: int | None = None
    genera_acta = True

    if tipo == "ENTRADA":
        if ref_tipo == "ITEM":
            item.cantidad_stock += cantidad_mov
            if ubicacion:
                _ubicacion_row(db, item.id, ubicacion.id).cantidad += cantidad_mov
        else:
            activo.cantidad_stock += cantidad_mov

    elif tipo == "SALIDA":
        if stock_actual < cantidad_mov:
            raise ConflictError(
                f"Stock insuficiente: hay {stock_actual} unidad(es) y se intentan sacar {cantidad_mov}."
            )
        if ref_tipo == "ITEM":
            if ubicacion:
                row = _ubicacion_row(db, item.id, ubicacion.id)
                if row.cantidad < cantidad_mov:
                    raise ConflictError(
                        f"En {ubicacion.nombre} hay {row.cantidad} unidad(es) y se intentan sacar {cantidad_mov}."
                    )
                row.cantidad -= cantidad_mov
            item.cantidad_stock -= cantidad_mov
        else:
            activo.cantidad_stock -= cantidad_mov

    else:  # AJUSTE por conteo físico
        if data.nuevo_stock is None:
            raise ValidationError("Para un ajuste debes indicar la nueva existencia (nuevo_stock).")
        nuevo_stock = data.nuevo_stock
        if ref_tipo == "ITEM":
            if ubicacion:
                row = _ubicacion_row(db, item.id, ubicacion.id)
                stock_anterior = row.cantidad
                item.cantidad_stock = max(0, item.cantidad_stock + (nuevo_stock - stock_anterior))
                row.cantidad = nuevo_stock
            else:
                if item.ubicaciones:
                    raise ValidationError(
                        "El ítem tiene existencias desglosadas por ubicación: registra el ajuste indicando la ubicación del conteo."
                    )
                stock_anterior = item.cantidad_stock
                item.cantidad_stock = nuevo_stock
        else:
            stock_anterior = activo.cantidad_stock
            activo.cantidad_stock = nuevo_stock
        cantidad_mov = nuevo_stock
        genera_acta = False

    if data.proveedor_id:
        _get_or_404(db, Proveedor, data.proveedor_id, "Proveedor")

    numero = get_next_number(db, _PREFIJOS[tipo], MovimientoStock)
    mov = MovimientoStock(
        numero=numero,
        tipo=tipo,
        referencia_tipo=ref_tipo,
        item_id=data.item_id if ref_tipo == "ITEM" else None,
        activo_id=data.activo_id if ref_tipo == "ACTIVO" else None,
        cantidad=cantidad_mov,
        fecha=data.fecha or datetime.now(timezone.utc),
        proveedor_id=data.proveedor_id,
        documento=data.documento,
        destino=data.destino,
        valor=data.valor,
        ubicacion_id=data.ubicacion_id,
        nuevo_stock=nuevo_stock,
        stock_anterior=stock_anterior,
        motivo=data.motivo,
        observaciones=data.observaciones,
        usuario_id=actor_id,
        estado="REGISTRADO",
    )
    db.add(mov)
    db.flush()

    if genera_acta:
        acta = _crear_acta(
            db,
            tipo="STOCK",
            operacion_tipo=tipo,
            operacion_id=mov.id,
            activo_id=ref_id_para_acta,
            actor_id=actor_id,
            obs=data.observaciones,
            operacion_obj=mov,
            prefix=_PREFIJOS[tipo],
        )
        mov.acta_id = acta.id
        db.flush()

    verbo = {"ENTRADA": "Entrada", "SALIDA": "Salida", "AJUSTE": "Ajuste"}[tipo]
    destino_txt = data.destino or (ubicacion.nombre if ubicacion else ("bodega" if tipo == "ENTRADA" else "Destino no especificado"))
    if tipo == "AJUSTE":
        mensaje = f"Ajuste de {nombre}: stock {stock_anterior} → {nuevo_stock}."
    elif tipo == "ENTRADA":
        mensaje = f"Entrada de {cantidad_mov} x {nombre} hacia {destino_txt}."
    else:
        mensaje = f"Salida de {cantidad_mov} x {nombre} hacia {destino_txt}."
    notifications.crear_notificacion(
        db,
        tipo="STOCK",
        titulo=f"{verbo} de stock {numero}",
        mensaje=mensaje,
        entidad_tipo="MovimientoStock",
        entidad_id=mov.id,
        roles_destino=_APROBADORES,
    )
    audit_op(
        db,
        "STOCK",
        "MovimientoStock",
        mov.id,
        "CREAR",
        f"{verbo} {numero} · {cantidad_mov} x {nombre}",
    )
    db.commit()
    return _get_mov(db, mov.id)


def anular_movimiento(db: Session, mov_id: int, motivo: str, actor_id: int) -> MovimientoStock:
    mov = _get_mov(db, mov_id)
    if mov.estado == "ANULADO":
        raise ConflictError("El movimiento de stock ya fue anulado.")

    if mov.tipo == "AJUSTE":
        if mov.nuevo_stock is None or mov.stock_anterior is None:
            raise ConflictError("El ajuste no tiene valores de reversión.")
        delta = mov.nuevo_stock - mov.stock_anterior
        if mov.referencia_tipo == "ITEM":
            item = _get_item(db, mov.item_id)
            item.cantidad_stock = max(0, item.cantidad_stock - delta)
            if mov.ubicacion_id:
                row = _ubicacion_row(db, item.id, mov.ubicacion_id)
                row.cantidad = max(0, row.cantidad - delta)
        else:
            activo = _get_or_404(db, Activo, mov.activo_id, "Activo")
            activo.cantidad_stock = max(0, activo.cantidad_stock - delta)

    elif mov.tipo == "ENTRADA":
        if mov.referencia_tipo == "ITEM":
            item = _get_item(db, mov.item_id)
            if item.cantidad_stock < mov.cantidad:
                raise ConflictError("No se puede anular: la existencia actual es menor a la entrada registrada.")
            item.cantidad_stock -= mov.cantidad
            if mov.ubicacion_id:
                row = _ubicacion_row(db, item.id, mov.ubicacion_id)
                if row.cantidad < mov.cantidad:
                    raise ConflictError("No se puede anular: la existencia de la ubicación es menor a la entrada registrada.")
                row.cantidad -= mov.cantidad
        else:
            activo = _get_or_404(db, Activo, mov.activo_id, "Activo")
            if activo.cantidad_stock < mov.cantidad:
                raise ConflictError("No se puede anular: la existencia del activo es menor a la entrada registrada.")
            activo.cantidad_stock -= mov.cantidad

    else:  # SALIDA
        if mov.referencia_tipo == "ITEM":
            item = _get_item(db, mov.item_id)
            item.cantidad_stock += mov.cantidad
            if mov.ubicacion_id:
                _ubicacion_row(db, item.id, mov.ubicacion_id).cantidad += mov.cantidad
        else:
            activo = _get_or_404(db, Activo, mov.activo_id, "Activo")
            activo.cantidad_stock += mov.cantidad

    mov.estado = "ANULADO"
    mov.anulado_motivo = motivo
    mov.anulado_usuario_id = actor_id
    mov.anulado_fecha = datetime.now(timezone.utc)
    db.flush()
    audit_op(db, "STOCK", "MovimientoStock", mov.id, "ANULAR", f"{mov.numero} anulado: {motivo}")
    db.commit()
    return _get_mov(db, mov_id)


def resumen(db: Session):
    items_activos = db.scalar(
        select(func.count()).select_from(StockItem).where(StockItem.activo == True)  # noqa: E712
    ) or 0
    unidades_totales = db.scalar(
        select(func.coalesce(func.sum(StockItem.cantidad_stock), 0)).where(StockItem.activo == True)  # noqa: E712
    ) or 0
    valor_stock = db.scalar(
        select(
            func.coalesce(
                func.sum(StockItem.cantidad_stock * func.coalesce(StockItem.valor_unitario, 0)), 0
            )
        ).where(StockItem.activo == True)  # noqa: E712
    ) or 0
    stock_bajo = db.execute(
        select(StockItem)
        .where(StockItem.activo == True, StockItem.cantidad_stock <= StockItem.stock_minimo)  # noqa: E712
        .order_by(StockItem.cantidad_stock)
    ).unique().scalars().all()
    bodega = db.scalar(select(EstadoActivo).where(EstadoActivo.codigo == "BODEGA"))
    activos_en_bodega = (
        db.scalar(select(func.count()).select_from(Activo).where(Activo.estado_id == bodega.id))
        if bodega
        else 0
    )
    por_sede = db.execute(
        select(Ubicacion.id, Ubicacion.nombre, func.coalesce(func.sum(StockItemUbicacion.cantidad), 0))
        .join(StockItemUbicacion, StockItemUbicacion.ubicacion_id == Ubicacion.id)
        .group_by(Ubicacion.id, Ubicacion.nombre)
        .order_by(func.sum(StockItemUbicacion.cantidad).desc())
    ).all()
    return {
        "items_activos": items_activos,
        "unidades_totales": int(unidades_totales),
        "valor_stock": float(valor_stock),
        "stock_bajo": list(stock_bajo),
        "activos_en_bodega": activos_en_bodega,
        "por_sede": [
            {"ubicacion_id": u_id, "nombre": nombre, "unidades": int(uni)}
            for u_id, nombre, uni in por_sede
        ],
    }