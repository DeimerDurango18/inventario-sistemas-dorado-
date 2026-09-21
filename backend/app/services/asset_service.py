from __future__ import annotations

import hashlib
import io
from datetime import date, datetime, timezone
from typing import Optional

import qrcode
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.errors import ConflictError, NotFoundError, ValidationError
from app.models.asset import Activo, ActivoAtributo, Responsable
from app.models.catalog import EstadoActivo, Proveedor
from app.models.documental import Acta, Baja, Garantia
from app.models.geo import Ubicacion
from app.models.loan import Prestamo
from app.models.maintenance import Mantenimiento
from app.models.movement import Movimiento
from app.schemas.asset import (
    ActivoAtributoValue,
    ActivoCreate,
    ActivoUpdate,
    BajaCreate,
    GarantiaCreate,
    MantenimientoCreate,
    MovimientoCreate,
    PrestamoCreate,
    ResponsableCreate,
    ResponsableUpdate,
)
from app.services.numbering import audit as audit_op, get_next_number

_EST_CLAVE = {
    "DISPONIBLE": "DISPONIBLE",
    "EN_USO": "EN_USO",
    "BODEGA": "BODEGA",
    "PRESTAMO": "PRESTAMO",
    "MANTENIMIENTO": "MANTENIMIENTO",
    "BAJA": "BAJA",
}


def _estado(db: Session, codigo: str) -> Optional[EstadoActivo]:
    return db.scalar(select(EstadoActivo).where(EstadoActivo.codigo == codigo, EstadoActivo.activo == True))  # noqa: E712


def _estado_o(db: Session, codigo: str, fallback: EstadoActivo) -> EstadoActivo:
    e = _estado(db, codigo)
    return e or fallback


def _get_or_404(db: Session, model, pk: int, nombre: str):
    m = db.get(model, pk)
    if not m:
        raise NotFoundError(nombre)
    return m


# ------------------------------------------------------------------ responsables
def list_responsables(db: Session, q: str = "", activo: bool | None = None):
    stmt = select(Responsable).order_by(Responsable.nombre)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(Responsable.nombre.ilike(like) | Responsable.documento.ilike(like))
    if activo is not None:
        stmt = stmt.where(Responsable.activo == activo)
    return db.scalars(stmt).all()


def create_responsable(db: Session, data: ResponsableCreate) -> Responsable:
    r = Responsable(**data.model_dump())
    db.add(r)
    db.flush()
    audit_op(db, "ACTIVOS", "Responsable", r.id, "CREAR", f"Responsable {data.nombre} creado")
    db.commit()
    db.refresh(r)
    return r


def update_responsable(db: Session, responsable_id: int, data: ResponsableUpdate) -> Responsable:
    r = _get_or_404(db, Responsable, responsable_id, "Responsable")
    for campo in ("documento", "nombre", "cargo", "telefono", "correo", "sede_id", "activo"):
        v = getattr(data, campo)
        if v is not None:
            setattr(r, campo, v)
    db.flush()
    audit_op(db, "ACTIVOS", "Responsable", r.id, "EDITAR", f"Responsable {r.nombre} actualizado")
    db.commit()
    db.refresh(r)
    return r


# ------------------------------------------------------------------ activos
def _join_activo():
    return (
        selectinload(Activo.marca),
        selectinload(Activo.modelo),
        selectinload(Activo.categoria),
        selectinload(Activo.subcategoria),
        selectinload(Activo.estado),
        selectinload(Activo.responsable),
        selectinload(Activo.ubicacion),
        selectinload(Activo.proveedor),
        selectinload(Activo.atributos_valores),
    )


def create_activo(db: Session, data: ActivoCreate, actor_id: int | None = None) -> Activo:
    codigo = get_next_number(db, "ENT", Activo, attr="codigo")
    if data.serial:
        dup = db.scalar(select(Activo).where(Activo.serial == data.serial))
        if dup:
            raise ConflictError("Ya existe un activo con ese serial.")
    if data.codigo_inventario:
        dup = db.scalar(select(Activo).where(Activo.codigo_inventario == data.codigo_inventario))
        if dup:
            raise ConflictError("Ya existe un activo con ese código de inventario.")
    estado = (
        _get_or_404(db, EstadoActivo, data.estado_id, "Estado")
        if data.estado_id
        else _estado(db, _EST_CLAVE["DISPONIBLE"])
        or _get_or_404(db, EstadoActivo, db.scalars(select(EstadoActivo).limit(1)).first().id, "Estado")
    )
    activo = Activo(
        codigo=codigo,
        tipo=data.tipo,
        codigo_inventario=data.codigo_inventario,
        placa=data.placa,
        serial=data.serial,
        qr_hash=hashlib.sha256(codigo.encode()).hexdigest(),
        marca_id=data.marca_id,
        modelo_id=data.modelo_id,
        categoria_id=data.categoria_id,
        subcategoria_id=data.subcategoria_id,
        estado_id=estado.id,
        fecha_adquisicion=data.fecha_adquisicion,
        fecha_ingreso=data.fecha_ingreso or datetime.now(timezone.utc),
        proveedor_id=data.proveedor_id,
        factura_numero=data.factura_numero,
        valor_adquisicion=data.valor_adquisicion,
        garantia_meses=data.garantia_meses,
        fecha_fin_garantia=data.fecha_fin_garantia,
        responsable_id=data.responsable_id,
        ubicacion_id=data.ubicacion_id,
        observaciones=data.observaciones,
        foto=data.foto,
        creado_por=actor_id,
    )
    db.add(activo)
    db.flush()
    for av in data.atributos:
        db.add(
            ActivoAtributo(
                activo_id=activo.id,
                atributo_definicion_id=av.atributo_definicion_id,
                valor=av.valor,
            )
        )
    audit_op(db, "ACTIVOS", "Activo", activo.id, "CREAR", f"Activo {codigo} registrado")
    db.commit()
    return get_activo(db, activo.id)


def list_activos(
    db: Session,
    q: str = "",
    categoria_id: int | None = None,
    estado_id: int | None = None,
    ubicacion_id: int | None = None,
    sede_id: int | None = None,
    marca_id: int | None = None,
    tipo: str | None = None,
    responsable_id: int | None = None,
    incluir_inactivos: bool = False,
    page: int = 1,
    size: int = 20,
):
    stmt = select(Activo).options(*_join_activo())
    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            or_(
                Activo.codigo.ilike(like),
                Activo.serial.ilike(like),
                Activo.codigo_inventario.ilike(like),
                Activo.placa.ilike(like),
                Activo.factura_numero.ilike(like),
            )
        )
    if categoria_id:
        stmt = stmt.where(Activo.categoria_id == categoria_id)
    if estado_id:
        stmt = stmt.where(Activo.estado_id == estado_id)
    if ubicacion_id:
        stmt = stmt.where(Activo.ubicacion_id == ubicacion_id)
    if sede_id:
        stmt = stmt.join(Ubicacion, Activo.ubicacion_id == Ubicacion.id).where(Ubicacion.sede_id == sede_id)
    if marca_id:
        stmt = stmt.where(Activo.marca_id == marca_id)
    if tipo:
        stmt = stmt.where(Activo.tipo == tipo)
    if responsable_id:
        stmt = stmt.where(Activo.responsable_id == responsable_id)
    if not incluir_inactivos:
        stmt = stmt.where(Activo.activo == True)  # noqa: E712
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = db.scalars(stmt.order_by(Activo.codigo).offset((page - 1) * size).limit(size)).all()
    return rows, total


def get_activo(db: Session, activo_id: int) -> Activo:
    a = db.scalar(select(Activo).where(Activo.id == activo_id).options(*_join_activo()))
    if not a:
        raise NotFoundError("Activo")
    return a


def get_activo_by_codigo(db: Session, codigo: str) -> Activo:
    a = db.scalar(select(Activo).where(Activo.codigo == codigo).options(*_join_activo()))
    if not a:
        raise NotFoundError("Activo")
    return a


def update_activo(db: Session, activo_id: int, data: ActivoUpdate, actor_id: int | None = None) -> Activo:
    a = _get_or_404(db, Activo, activo_id, "Activo")
    if data.serial and data.serial != a.serial:
        dup = db.scalar(select(Activo).where(Activo.serial == data.serial, Activo.id != activo_id))
        if dup:
            raise ConflictError("Ya existe un activo con ese serial.")
    for campo in (
        "tipo",
        "codigo_inventario",
        "placa",
        "serial",
        "marca_id",
        "modelo_id",
        "categoria_id",
        "subcategoria_id",
        "estado_id",
        "fecha_adquisicion",
        "fecha_ingreso",
        "proveedor_id",
        "factura_numero",
        "valor_adquisicion",
        "garantia_meses",
        "fecha_fin_garantia",
        "responsable_id",
        "ubicacion_id",
        "observaciones",
        "foto",
        "activo",
    ):
        v = getattr(data, campo)
        if v is not None:
            setattr(a, campo, v)
    if data.atributos is not None:
        for old in a.atributos_valores:
            db.delete(old)
        for av in data.atributos:
            db.add(
                ActivoAtributo(
                    activo_id=activo_id,
                    atributo_definicion_id=av.atributo_definicion_id,
                    valor=av.valor,
                )
            )
    db.flush()
    audit_op(db, "ACTIVOS", "Activo", a.id, "EDITAR", f"Activo {a.codigo} actualizado")
    db.commit()
    return get_activo(db, activo_id)


def get_qr_bytes(db: Session, activo: Activo) -> bytes:
    payload = f"ETICOS|{activo.codigo}|{activo.tipo}|{activo.serial or ''}"
    img = qrcode.make(payload)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


# ------------------------------------------------------------------ movimientos
def list_movimientos(db: Session, activo_id: int | None = None, tipo: str | None = None, page: int = 1, size: int = 20):
    stmt = select(Movimiento).options(
        selectinload(Movimiento.activo),
        selectinload(Movimiento.origen_ubicacion),
        selectinload(Movimiento.destino_ubicacion),
        selectinload(Movimiento.responsable_anterior),
        selectinload(Movimiento.responsable_nuevo),
    )
    if activo_id:
        stmt = stmt.where(Movimiento.activo_id == activo_id)
    if tipo:
        stmt = stmt.where(Movimiento.tipo == tipo)
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = db.scalars(stmt.order_by(Movimiento.fecha.desc()).offset((page - 1) * size).limit(size)).all()
    return rows, total


def registrar_movimiento(db: Session, activo_id: int, data: MovimientoCreate, actor_id: int) -> Movimiento:
    activo = _get_or_404(db, Activo, activo_id, "Activo")
    if not activo.activo:
        raise ValidationError("El activo se encuentra inactivo.")
    tipo = data.tipo.upper()
    if tipo not in ("ASIGNACION", "TRASLADO", "DEVOLUCION", "AJUSTE"):
        raise ValidationError(f"Tipo de movimiento no soportado: {tipo}")
    numero = get_next_number(db, "MOV", Movimiento)

    mov = Movimiento(
        numero=numero,
        tipo=tipo,
        fecha=data.fecha or datetime.now(timezone.utc),
        activo_id=activo.id,
        origen_ubicacion_id=activo.ubicacion_id,
        destino_ubicacion_id=data.destino_ubicacion_id,
        responsable_anterior_id=activo.responsable_id,
        responsable_nuevo_id=data.responsable_nuevo_id,
        usuario_id=actor_id,
        motivo=data.motivo,
        observaciones=data.observaciones,
        estado="ACTIVO",
    )
    db.add(mov)
    db.flush()

    if tipo == "ASIGNACION":
        if not data.responsable_nuevo_id:
            raise ValidationError("Debe indicar el responsable para asignar el activo.")
        _get_or_404(db, Responsable, data.responsable_nuevo_id, "Responsable")
        activo.responsable_id = data.responsable_nuevo_id
        if data.destino_ubicacion_id:
            activo.ubicacion_id = data.destino_ubicacion_id
        activo.estado_id = _estado_o(db, _EST_CLAVE["EN_USO"], activo.estado).id
    elif tipo == "TRASLADO":
        if not data.destino_ubicacion_id:
            raise ValidationError("Debe indicar la ubicación de destino.")
        _get_or_404(db, Ubicacion, data.destino_ubicacion_id, "Ubicación")
        activo.ubicacion_id = data.destino_ubicacion_id
    elif tipo == "DEVOLUCION":
        activo.responsable_id = None
        if data.destino_ubicacion_id:
            activo.ubicacion_id = data.destino_ubicacion_id
        if data.responsable_nuevo_id:
            _get_or_404(db, Responsable, data.responsable_nuevo_id, "Responsable")
            activo.responsable_id = data.responsable_nuevo_id
        activo.estado_id = _estado_o(db, _EST_CLAVE["BODEGA"], activo.estado).id

    acta = _crear_acta(db, "MOVIMIENTO", mov, actor_id, data.observaciones)
    mov.acta_id = acta.id
    db.flush()
    audit_op(db, "ACTIVOS", "Movimiento", mov.id, "CREAR", f"Movimiento {numero} ({tipo}) para {activo.codigo}")
    db.commit()
    return _get_movimiento(db, mov.id)


def _get_movimiento(db: Session, mov_id: int) -> Movimiento:
    m = db.scalar(
        select(Movimiento)
        .where(Movimiento.id == mov_id)
        .options(
            selectinload(Movimiento.activo),
            selectinload(Movimiento.origen_ubicacion),
            selectinload(Movimiento.destino_ubicacion),
            selectinload(Movimiento.responsable_anterior),
            selectinload(Movimiento.responsable_nuevo),
        )
    )
    if not m:
        raise NotFoundError("Movimiento")
    return m


def anular_movimiento(db: Session, mov_id: int, motivo: str, actor_id: int) -> Movimiento:
    mov = _get_movimiento(db, mov_id)
    if mov.estado != "ACTIVO":
        raise ConflictError("El movimiento ya fue anulado.")
    activo = _get_or_404(db, Activo, mov.activo_id, "Activo")
    mov.anulado_motivo = motivo
    mov.anulado_usuario_id = actor_id
    mov.anulado_fecha = datetime.now(timezone.utc)
    mov.estado = "ANULADO"
    if mov.tipo == "ASIGNACION":
        activo.responsable_id = mov.responsable_anterior_id
    if mov.tipo in ("ASIGNACION", "TRASLADO", "DEVOLUCION"):
        activo.ubicacion_id = mov.origen_ubicacion_id
        if mov.tipo == "DEVOLUCION":
            activo.estado_id = _estado_o(db, _EST_CLAVE["DISPONIBLE"], activo.estado).id
        elif mov.tipo == "ASIGNACION" and not activo.responsable_id:
            activo.estado_id = _estado_o(db, _EST_CLAVE["DISPONIBLE"], activo.estado).id
    db.flush()
    audit_op(db, "ACTIVOS", "Movimiento", mov.id, "ANULAR", f"Movimiento {mov.numero} anulado: {motivo}")
    db.commit()
    return _get_movimiento(db, mov_id)


def _crear_acta(db: Session, tipo: str, mov: Movimiento, actor_id: int, obs: str | None) -> Acta:
    numero = get_next_number(db, "ACT", Acta)
    acta = Acta(
        numero=numero,
        tipo=tipo,
        fecha=datetime.now(timezone.utc),
        activo_id=mov.activo_id,
        movimiento_id=mov.id,
        operacion_tipo=mov.tipo,
        operacion_id=mov.id,
        observaciones=obs,
        usuario_id=actor_id,
        estado="GENERADA",
    )
    db.add(acta)
    db.flush()
    return acta


def list_actas(db: Session, activo_id: int | None = None, page: int = 1, size: int = 20):
    stmt = select(Acta)
    if activo_id:
        stmt = stmt.where(Acta.activo_id == activo_id)
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = db.scalars(stmt.order_by(Acta.fecha.desc()).offset((page - 1) * size).limit(size)).all()
    return rows, total


# ------------------------------------------------------------------ préstamos
def list_prestamos(db: Session, estado: str | None = None, activo_id: int | None = None):
    stmt = select(Prestamo).options(
        selectinload(Prestamo.activo),
        selectinload(Prestamo.solicitante),
        selectinload(Prestamo.responsable),
    )
    if estado:
        stmt = stmt.where(Prestamo.estado == estado)
    if activo_id:
        stmt = stmt.where(Prestamo.activo_id == activo_id)
    return db.scalars(stmt.order_by(Prestamo.id.desc())).all()


def crear_prestamo(db: Session, activo_id: int, data: PrestamoCreate, actor_id: int) -> Prestamo:
    activo = _get_or_404(db, Activo, activo_id, "Activo")
    if not activo.activo:
        raise ValidationError("El activo se encuentra inactivo.")
    if activo.estado and activo.estado.codigo not in ("DISPONIBLE", "BODEGA"):
        raise ConflictError("El activo no está disponible para préstamo.")
    numero = get_next_number(db, "PRE", Prestamo)
    p = Prestamo(
        numero=numero,
        activo_id=activo.id,
        solicitante_id=data.solicitante_id,
        responsable_id=data.responsable_id,
        fecha_prestamo=data.fecha_prestamo or datetime.now(timezone.utc),
        fecha_prevista_devolucion=data.fecha_prevista_devolucion,
        motivo=data.motivo,
        observaciones=data.observaciones,
        estado="SOLICITADO",
        usuario_id=actor_id,
    )
    db.add(p)
    db.flush()
    activo.estado_id = _estado_o(db, _EST_CLAVE["PRESTAMO"], activo.estado).id
    audit_op(db, "ACTIVOS", "Prestamo", p.id, "CREAR", f"Préstamo {numero} para {activo.codigo}")
    db.commit()
    db.refresh(p)
    return p


def aprobar_prestamo(db: Session, prestamo_id: int, actor_id: int) -> Prestamo:
    p = _get_or_404(db, Prestamo, prestamo_id, "Préstamo")
    if p.estado != "SOLICITADO":
        raise ConflictError("El préstamo no está en estado SOLICITADO.")
    p.estado = "ACTIVO"
    db.flush()
    audit_op(db, "ACTIVOS", "Prestamo", p.id, "EDITAR", f"Préstamo {p.numero} aprobado")
    db.commit()
    db.refresh(p)
    return p


def devolver_prestamo(db: Session, prestamo_id: int, actor_id: int) -> Prestamo:
    p = _get_or_404(db, Prestamo, prestamo_id, "Préstamo")
    if p.estado not in ("SOLICITADO", "ACTIVO"):
        raise ConflictError("El préstamo ya fue cerrado.")
    p.estado = "DEVUELTO"
    p.fecha_devolucion_real = datetime.now(timezone.utc)
    activo = _get_or_404(db, Activo, p.activo_id, "Activo")
    if not activo.activo:
        activo.estado_id = _estado_o(db, _EST_CLAVE["BODEGA"], activo.estado).id
    else:
        activo.estado_id = _estado_o(db, _EST_CLAVE["BODEGA"], activo.estado).id
    db.flush()
    audit_op(db, "ACTIVOS", "Prestamo", p.id, "EDITAR", f"Préstamo {p.numero} devuelto")
    db.commit()
    db.refresh(p)
    return p


# ------------------------------------------------------------------ mantenimientos
def list_mantenimientos(db: Session, estado: str | None = None, activo_id: int | None = None):
    stmt = select(Mantenimiento).options(
        selectinload(Mantenimiento.activo),
        selectinload(Mantenimiento.tecnico),
        selectinload(Mantenimiento.proveedor),
    )
    if estado:
        stmt = stmt.where(Mantenimiento.estado == estado)
    if activo_id:
        stmt = stmt.where(Mantenimiento.activo_id == activo_id)
    return db.scalars(stmt.order_by(Mantenimiento.id.desc())).all()


def crear_mantenimiento(db: Session, activo_id: int, data: MantenimientoCreate, actor_id: int) -> Mantenimiento:
    activo = _get_or_404(db, Activo, activo_id, "Activo")
    numero = get_next_number(db, "MANT", Mantenimiento)
    m = Mantenimiento(
        numero=numero,
        activo_id=activo.id,
        tipo=data.tipo,
        fecha_programada=data.fecha_programada or datetime.now(timezone.utc),
        tecnico_id=data.tecnico_id,
        diagnostico=data.diagnostico,
        actividades=data.actividades,
        costo=data.costo,
        proveedor_id=data.proveedor_id,
        estado=(data.estado or "PROGRAMADO").upper(),
        usuario_id=actor_id,
    )
    db.add(m)
    db.flush()
    if m.estado in ("EN_PROGRESO", "PROGRAMADO"):
        activo.estado_id = _estado_o(db, _EST_CLAVE["MANTENIMIENTO"], activo.estado).id
    audit_op(db, "ACTIVOS", "Mantenimiento", m.id, "CREAR", f"Mantenimiento {numero} para {activo.codigo}")
    db.commit()
    db.refresh(m)
    return m


def cerrar_mantenimiento(db: Session, mant_id: int, actor_id: int, resultado: str | None = None, observaciones: str | None = None, costo: float | None = None) -> Mantenimiento:
    m = _get_or_404(db, Mantenimiento, mant_id, "Mantenimiento")
    m.fecha_ejecucion = datetime.now(timezone.utc)
    m.estado = "COMPLETADO"
    if resultado:
        m.resultado = resultado
    if observaciones:
        m.observaciones = observaciones
    if costo is not None:
        m.costo = costo
    activo = _get_or_404(db, Activo, m.activo_id, "Activo")
    if activo.estado and activo.estado.codigo == "MANTENIMIENTO":
        activo.estado_id = _estado_o(db, _EST_CLAVE["DISPONIBLE"], activo.estado).id
    db.flush()
    audit_op(db, "ACTIVOS", "Mantenimiento", m.id, "EDITAR", f"Mantenimiento {m.numero} completado")
    db.commit()
    db.refresh(m)
    return m


# ------------------------------------------------------------------ garantías
def list_garantias(db: Session, activo_id: int | None = None):
    stmt = select(Garantia).options(
        selectinload(Garantia.activo), selectinload(Garantia.proveedor)
    )
    if activo_id:
        stmt = stmt.where(Garantia.activo_id == activo_id)
    return db.scalars(stmt.order_by(Garantia.fin)).all()


def crear_garantia(db: Session, activo_id: int, data: GarantiaCreate, actor_id: int) -> Garantia:
    _get_or_404(db, Activo, activo_id, "Activo")
    if data.inicio and data.fin and data.fin <= data.inicio:
        raise ValidationError("La fecha de fin de garantía debe ser posterior al inicio.")
    g = Garantia(activo_id=activo_id, **data.model_dump())
    db.add(g)
    db.flush()
    activo = db.get(Activo, activo_id)
    if data.fin and activo:
        activo.fecha_fin_garantia = data.fin
    audit_op(db, "ACTIVOS", "Garantia", g.id, "CREAR", f"Garantía para activo {activo_id}")
    db.commit()
    db.refresh(g)
    return g


# ------------------------------------------------------------------ bajas
def list_bajas(db: Session, estado: str | None = None):
    stmt = select(Baja).options(selectinload(Baja.activo))
    if estado:
        stmt = stmt.where(Baja.estado == estado)
    return db.scalars(stmt.order_by(Baja.id.desc())).all()


def registrar_baja(db: Session, activo_id: int, data: BajaCreate, actor_id: int) -> Baja:
    activo = _get_or_404(db, Activo, activo_id, "Activo")
    numero = get_next_number(db, "BAJA", Baja)
    b = Baja(
        numero=numero,
        activo_id=activo.id,
        motivo_tipo=data.motivo_tipo,
        motivo_descripcion=data.motivo_descripcion,
        estado_fisico=data.estado_fisico,
        estado="SOLICITADA",
        usuario_id=actor_id,
    )
    db.add(b)
    db.flush()
    audit_op(db, "ACTIVOS", "Baja", b.id, "CREAR", f"Baja {numero} solicitada para {activo.codigo}")
    db.commit()
    db.refresh(b)
    return b


def aprobar_baja(db: Session, baja_id: int, actor_id: int, observaciones: str | None = None) -> Baja:
    b = _get_or_404(db, Baja, baja_id, "Baja")
    if b.estado != "SOLICITADA":
        raise ConflictError("La baja no está en estado SOLICITADA.")
    b.estado = "APROBADA"
    b.fecha_aprobacion = datetime.now(timezone.utc)
    b.aprobador_id = actor_id
    activo = _get_or_404(db, Activo, b.activo_id, "Activo")
    activo.estado_id = _estado_o(db, _EST_CLAVE["BAJA"], activo.estado).id
    activo.activo = False
    db.flush()
    audit_op(db, "ACTIVOS", "Baja", b.id, "EDITAR", f"Baja {b.numero} aprobada")
    db.commit()
    db.refresh(b)
    return b