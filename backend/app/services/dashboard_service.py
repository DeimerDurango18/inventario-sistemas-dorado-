from __future__ import annotations

from datetime import date, datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.asset import Activo
from app.models.catalog import Categoria, EstadoActivo
from app.models.documental import Baja, Garantia
from app.models.geo import Sede, Ubicacion
from app.models.loan import Prestamo
from app.models.maintenance import Mantenimiento, MantenimientoProgramacion
from app.models.movement import Movimiento
from app.models.system import Ticket


def dashboard_kpis(db: Session) -> dict:
    total_activos = db.scalar(select(func.count()).select_from(Activo)) or 0
    activos_activos = (
        db.scalar(select(func.count()).select_from(Activo).where(Activo.activo == True)) or 0  # noqa: E712
    )
    por_estado = dict(
        db.execute(
            select(EstadoActivo.nombre, func.count(Activo.id))
            .join(Activo, EstadoActivo.id == Activo.estado_id)
            .group_by(EstadoActivo.nombre)
        ).all()
    )
    hoy = datetime.now(timezone.utc)
    garantias_proximas = (
        db.scalar(
            select(func.count())
            .select_from(Garantia)
            .where(Garantia.fin >= hoy, Garantia.fin <= add_days(hoy, 60))
        )
        or 0
    )
    garantias_vencidas = (
        db.scalar(select(func.count()).select_from(Garantia).where(Garantia.fin < hoy)) or 0
    )
    mantenimientos_programados = (
        db.scalar(
            select(func.count())
            .select_from(Mantenimiento)
            .where(Mantenimiento.estado.in_(("PROGRAMADO", "EN_PROGRESO")))
        )
        or 0
    )
    mes_inicio = hoy.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    movimientos_mes = (
        db.scalar(
            select(func.count()).select_from(Movimiento).where(Movimiento.fecha >= mes_inicio)
        )
        or 0
    )
    prestamos_activos = (
        db.scalar(
            select(func.count())
            .select_from(Prestamo)
            .where(Prestamo.estado.in_(("SOLICITADO", "ACTIVO")))
        )
        or 0
    )
    bajas_solicitadas = (
        db.scalar(select(func.count()).select_from(Baja).where(Baja.estado == "SOLICITADA")) or 0
    )
    return {
        "total_activos": total_activos,
        "activos_activos": activos_activos,
        "por_estado": por_estado,
        "garantias_proximas": garantias_proximas,
        "garantias_vencidas": garantias_vencidas,
        "mantenimientos_programados": mantenimientos_programados,
        "movimientos_mes": movimientos_mes,
        "prestamos_activos": prestamos_activos,
        "bajas_solicitadas": bajas_solicitadas,
    }


def add_days(dt: datetime, days: int) -> datetime:
    from datetime import timedelta

    return dt + timedelta(days=days)


def activos_por_categoria(db: Session) -> list[dict]:
    rows = db.execute(
        select(Categoria.nombre, func.count(Activo.id))
        .join(Activo, Categoria.id == Activo.categoria_id)
        .group_by(Categoria.nombre)
        .order_by(func.count(Activo.id).desc())
        .limit(10)
    ).all()
    return [{"nombre": nombre, "cantidad": cantidad} for nombre, cantidad in rows]


def activos_por_sede(db: Session) -> list[dict]:
    rows = db.execute(
        select(Sede.nombre, func.count(Activo.id))
        .join(Ubicacion, Sede.id == Ubicacion.sede_id)
        .join(Activo, Ubicacion.id == Activo.ubicacion_id)
        .group_by(Sede.nombre)
        .order_by(func.count(Activo.id).desc())
    ).all()
    return [{"sede": nombre, "cantidad": cantidad} for nombre, cantidad in rows]


def alertas(db: Session) -> list[dict]:
    """Alertas de garantías próximas a vencer (dentro de 60 días)."""
    hoy = datetime.now(timezone.utc)
    filas = db.execute(
        select(Garantia.id, Garantia.activo_id, Garantia.fin, Activo.codigo)
        .join(Activo, Activo.id == Garantia.activo_id)
        .where(Garantia.fin >= hoy, Garantia.fin <= add_days(hoy, 60))
    ).all()
    lista = []
    for fid, activo_id, fin, codigo in filas:
        dias = (fin - hoy).days
        lista.append(
            {
                "tipo": "GARANTIA_PROXIMA",
                "titulo": "Garantía cercana a vencer",
                "mensaje": f"{codigo} vence en {dias} día(s).",
                "entidad_tipo": "Garantia",
                "entidad_id": fid,
            }
        )
    return lista


def alta_bajas(db: Session) -> dict:
    bajas = db.scalar(select(func.count()).select_from(Baja).where(Baja.estado == "APROBADA")) or 0
    tickets_abiertos = (
        db.scalar(select(func.count()).select_from(Ticket).where(Ticket.estado == "ABIERTO")) or 0
    )
    return {"bajas_aprobadas": bajas, "tickets_abiertos": tickets_abiertos}


def _dias_entre(fecha, referencia):
    """Días entre fecha y referencia (referencia asume UTC); maneja fechas naive de SQL Server."""
    if not fecha:
        return 0
    if getattr(fecha, "tzinfo", None) is None:
        fecha = fecha.replace(tzinfo=timezone.utc)
    return (fecha - referencia).days


def pendientes(db: Session, dias_aviso_gracia: int = 30) -> list[dict]:
    """Pendientes automáticos: mantenimientos preventivos por vencer/vencidos y garantías próximas a expirar.

    Combina tres fuentes:
    - Mantenimientos PROGRAMADO/EN_PROGRESO con fecha_programada ya vencida (atrasados).
    - Mantenimientos ejecutados con proxima_fecha alcanzada o cercana (vencido o por vencerse).
    - Programaciones recurrentes (MantenimientoProgramacion) cuyo proxima_fecha está vencida o próxima.
    - Garantías por vencer dentro de `dias_aviso_gracia` o vencidas.
    """
    hoy = datetime.now(timezone.utc)
    limite = add_days(hoy, dias_aviso_gracia)
    items: list[dict] = []

    def _anadir(tipo, prioridad, titulo, mensaje, entidad_tipo, entidad_id, fecha=None, ruta=None):
        items.append(
            {
                "tipo": tipo,
                "prioridad": prioridad,
                "titulo": titulo,
                "mensaje": mensaje,
                "entidad_tipo": entidad_tipo,
                "entidad_id": entidad_id,
                "fecha": fecha.isoformat() if fecha else None,
                "ruta": ruta,
            }
        )

    # Mantenimientos atrasados (no ejecutados)
    filas = db.execute(
        select(Mantenimiento.id, Mantenimiento.numero, Mantenimiento.fecha_programada, Activo.codigo)
        .outerjoin(Activo, Activo.id == Mantenimiento.activo_id)
        .where(Mantenimiento.estado.in_(("PROGRAMADO", "EN_PROGRESO")))
        .where(Mantenimiento.fecha_programada != None)  # noqa: E711
        .where(Mantenimiento.fecha_programada <= hoy)
    ).all()
    for mid, numero, fecha, codigo in filas:
        dias = abs(_dias_entre(fecha, hoy))
        _anadir(
            "MANTENIMIENTO_ATRASADO",
            "ALTA" if dias > 0 else "MEDIA",
            f"Mantenimiento atrasado {numero}",
            f"{codigo or 'Activo'} sin ejecutar (venció hace {dias} día(s)).",
            "Mantenimiento",
            mid,
            fecha,
            "/ops/mantenimientos",
        )

    # Próximos vencimientos de mantenimientos ejecutados con proxima_fecha
    filas = db.execute(
        select(Mantenimiento.id, Mantenimiento.numero, Mantenimiento.proxima_fecha, Activo.codigo)
        .outerjoin(Activo, Activo.id == Mantenimiento.activo_id)
        .where(Mantenimiento.estado == "COMPLETADO")
        .where(Mantenimiento.proxima_fecha != None)  # noqa: E711
        .where(Mantenimiento.proxima_fecha <= limite)
    ).all()
    for mid, numero, fecha, codigo in filas:
        dias = _dias_entre(fecha, hoy)
        _anadir(
            "MANTENIMIENTO_PROXIMO" if dias >= 0 else "MANTENIMIENTO_VENCIDO",
            "ALTA" if dias < 0 else "MEDIA",
            f"Próximo mantenimiento {numero}",
            f"{codigo or 'Activo'}: {'venció hace %d día(s)' % abs(dias) if dias < 0 else 'vence en %d día(s)' % dias}.",
            "Mantenimiento",
            mid,
            fecha,
            "/ops/mantenimientos",
        )

    # Programaciones recurrentes
    filas = db.execute(
        select(
            MantenimientoProgramacion.id,
            MantenimientoProgramacion.activo_id,
            MantenimientoProgramacion.proxima_fecha,
            MantenimientoProgramacion.periodicidad_meses,
            Activo.codigo,
        )
        .join(Activo, Activo.id == MantenimientoProgramacion.activo_id)
        .where(MantenimientoProgramacion.activo_flag == True)  # noqa: E712
        .where(MantenimientoProgramacion.proxima_fecha != None)  # noqa: E711
        .where(MantenimientoProgramacion.proxima_fecha <= limite)
    ).all()
    for pid, activo_id, fecha, periodicidad, codigo in filas:
        dias = _dias_entre(fecha, hoy)
        _anadir(
            "MANTENIMIENTO_PROGRAMADO" if dias >= 0 else "MANTENIMIENTO_PROGRAMADO_VENCIDO",
            "ALTA" if dias < 0 else "MEDIA",
            f"Mantenimiento preventivo {codigo}",
            f"Programado cada {periodicidad} mes(es): {'venció hace %d día(s)' % abs(dias) if dias < 0 else 'vence en %d día(s)' % dias}.",
            "Activo",
            activo_id,
            fecha,
            "/activos",
        )

    # Garantías por vencer / vencidas
    filas = db.execute(
        select(Garantia.id, Garantia.fin, Activo.codigo, Activo.id)
        .join(Activo, Activo.id == Garantia.activo_id)
        .where(Garantia.fin != None)  # noqa: E711
        .where(Garantia.fin <= limite)
    ).all()
    for gid, fin, codigo, activo_id in filas:
        dias = _dias_entre(fin, hoy)
        if dias < 0:
            tipo, prioridad = "GARANTIA_VENCIDA", "ALTA"
            texto = f"venció hace {abs(dias)} día(s)."
        else:
            tipo, prioridad = "GARANTIA_PROXIMA", "MEDIA"
            texto = f"vence en {dias} día(s)."
        _anadir(
            tipo,
            prioridad,
            f"Garantía {codigo}",
            f"La garantía {texto}",
            "Garantia",
            gid,
            fin,
            "/activos",
        )

    items.sort(key=lambda x: (0 if x["prioridad"] == "ALTA" else 1, x["fecha"] or ""))
    return items