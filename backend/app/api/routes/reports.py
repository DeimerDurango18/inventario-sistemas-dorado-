from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, Response
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.catalog import Category, Location
from app.models.equipment import Equipment
from app.models.maintenance import MaintenanceRecord
from app.models.acta import Acta
from app.models.user import User
from app.services.exports import exportar_csv, exportar_xlsx, _filas_equipos, _filas_actas, _filas_mantenimientos
from app.services.pdf_reports import (
    generar_inventario_por_ubicacion,
    generar_resumen_mantenimientos,
)

router = APIRouter()
PDF_DIR = Path(__file__).resolve().parents[3] / "storage" / "actas"

MESES_ES = {
    1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril",
    5: "Mayo", 6: "Junio", 7: "Julio", 8: "Agosto",
    9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre"
}


def _normalize_dt(dt: datetime) -> datetime:
    """Normaliza un datetime para comparación segura con zona horaria UTC."""
    if dt is None:
        return None
    if dt.tzinfo is not None:
        return dt.astimezone(timezone.utc)
    return dt.replace(tzinfo=timezone.utc)


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    eid = current_user.empresa_id

    eq_query = db.query(Equipment)
    mt_query = db.query(MaintenanceRecord)
    acta_query = db.query(Acta)
    cat_query = db.query(Category)
    if eid:
        eq_query = eq_query.filter(Equipment.empresa_id == eid)
        mt_query = mt_query.filter(MaintenanceRecord.empresa_id == eid)
        acta_query = acta_query.filter(Acta.empresa_id == eid)

    totals = (
        eq_query.with_entities(Equipment.estado, func.count(Equipment.id))
        .group_by(Equipment.estado)
        .all()
    )
    result = {"disponibles": 0, "asignados": 0, "reparacion": 0, "baja": 0, "prestamo": 0}
    for estado, count in totals:
        raw = (estado or "").lower()
        # Los estados se almacenan en singular; el reporte agrupa en plural.
        key = {"disponible": "disponibles", "asignado": "asignados"}.get(raw, raw)
        if key in result:
            result[key] = count

    ahora = datetime.now(timezone.utc)
    mantenimientos_activos = (
        mt_query
        .filter(MaintenanceRecord.estado.in_(["programado", "en_proceso"]))
        .all()
    )

    # Alertas de mantenimiento calculadas de forma segura (soporta SQLite/MSSQL y naive/aware)
    limite_proximas = ahora + timedelta(days=7)
    vencidas = 0
    proximas = 0
    for m in mantenimientos_activos:
        if m.fecha_programada:
            f_norm = _normalize_dt(m.fecha_programada)
            if f_norm < ahora:
                vencidas += 1
            elif m.estado == "programado" and f_norm <= limite_proximas:
                proximas += 1

    actas_mes = acta_query.count()
    mes_nombre = MESES_ES.get(datetime.now().month, "Mes actual")

    # Distribución por categoría (para gráficos del dashboard).
    cat_e_query = db.query(Equipment)
    if eid:
        cat_e_query = cat_e_query.filter(Equipment.empresa_id == eid)
    por_categoria = (
        db.query(
            Category.nombre,
            func.count(Equipment.id),
            func.coalesce(func.sum(Equipment.valor_aprox), 0),
        )
        .outerjoin(Equipment, Equipment.categoria_id == Category.id)
    )
    if eid:
        por_categoria = por_categoria.filter(Equipment.empresa_id == eid)
    por_categoria = por_categoria.group_by(Category.id, Category.nombre).all()
    categoria_series = [
        {"categoria": cat, "cantidad": int(cant or 0), "valor_total": float(val or 0)}
        for cat, cant, val in por_categoria
    ]
    cant_sin_cat_q = db.query(func.count(Equipment.id)).filter(Equipment.categoria_id.is_(None))
    if eid:
        cant_sin_cat_q = cant_sin_cat_q.filter(Equipment.empresa_id == eid)
    cant_sin_cat = int(cant_sin_cat_q.scalar() or 0)
    if cant_sin_cat:
        categoria_series.append({"categoria": "Sin categoría", "cantidad": cant_sin_cat, "valor_total": 0.0})
    categoria_series.sort(key=lambda x: x["cantidad"], reverse=True)

    # Distribución por ubicación (nombre y/o registrada en el equipo).
    # Se agrega en Python para evitar diferencias de GROUP BY entre SQL Server/SQLite.
    eq_ubic_query = (
        db.query(Equipment.ubicacion_id, Location.nombre, Equipment.ubicacion, Equipment.id)
        .outerjoin(Location, Location.id == Equipment.ubicacion_id)
    )
    if eid:
        eq_ubic_query = eq_ubic_query.filter(Equipment.empresa_id == eid)
    equipos_ubic = eq_ubic_query.all()
    ubicacion_series = []
    ub_counts = {}
    for ub_id, loc_nombre, eq_ubicacion, _eid in equipos_ubic:
        key = loc_nombre or eq_ubicacion or "Sin ubicación"
        ub_counts[key] = ub_counts.get(key, 0) + 1
    ubicacion_series = [
        {"ubicacion": ub, "cantidad": cant} for ub, cant in ub_counts.items()
    ]
    ubicacion_series.sort(key=lambda x: x["cantidad"], reverse=True)

    # Total del valor del inventario.
    val_query = db.query(func.coalesce(func.sum(Equipment.valor_aprox), 0))
    if eid:
        val_query = val_query.filter(Equipment.empresa_id == eid)
    valor_total = float(val_query.scalar() or 0)

    return {
        "totales": result,
        "mes": mes_nombre,
        "mantenimientos_activos": len(mantenimientos_activos),
        "actas_generadas": actas_mes,
        "alertas": {"vencidas": vencidas, "proximas": proximas},
        "valor_total": valor_total,
        "por_categoria": categoria_series,
        "por_ubicacion": ubicacion_series,
    }


@router.get("/mantenimiento/alertas")
def alertas_mantenimiento(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Mantenimientos preventivos/correctivos vencidos o próximos a vencer."""
    ahora = datetime.now(timezone.utc)
    limite = ahora + timedelta(days=7)

    query = db.query(MaintenanceRecord)
    if current_user.empresa_id:
        query = query.filter(MaintenanceRecord.empresa_id == current_user.empresa_id)
    registros = (
        query
        .filter(MaintenanceRecord.estado.in_(["programado", "en_proceso"]))
        .all()
    )

    resultado = []
    for r in registros:
        if r.fecha_programada is None:
            continue
        f_norm = _normalize_dt(r.fecha_programada)
        if f_norm < ahora:
            nivel = "vencida"
        elif f_norm <= limite:
            nivel = "proxima"
        else:
            continue
        resultado.append(
            {
                "id": r.id,
                "equipo_id": r.equipo_id,
                "equipo_folio": r.equipo.folio if r.equipo else None,
                "equipo_marca": r.equipo.marca if r.equipo else None,
                "equipo_modelo": r.equipo.modelo if r.equipo else None,
                "tipo": r.tipo,
                "descripcion": r.descripcion,
                "tecnico": r.tecnico,
                "estado": r.estado,
                "fecha_programada": r.fecha_programada.isoformat() if r.fecha_programada else None,
                "nivel": nivel,
            }
        )
    resultado.sort(key=lambda x: x["fecha_programada"])
    return resultado


@router.get("/depreciacion")
def reporte_depreciacion(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Valor total del inventario agrupado por categoría (valor aproximado)."""
    eid = current_user.empresa_id
    cat_query = db.query(Category)
    if eid:
        cat_query = cat_query.filter(Category.empresa_id == eid)
    categorias = cat_query.all()
    resultado = []
    gran_total = 0.0

    for cat in categorias:
        val_q = db.query(func.coalesce(func.sum(Equipment.valor_aprox), 0)).filter(Equipment.categoria_id == cat.id)
        cant_q = db.query(func.count(Equipment.id)).filter(Equipment.categoria_id == cat.id)
        if eid:
            val_q = val_q.filter(Equipment.empresa_id == eid)
            cant_q = cant_q.filter(Equipment.empresa_id == eid)
        valor = val_q.scalar()
        cantidad = cant_q.scalar()
        valor = float(valor or 0)
        gran_total += valor
        resultado.append(
            {
                "categoria_id": cat.id,
                "categoria": cat.nombre,
                "cantidad": int(cantidad or 0),
                "valor_total": valor,
            }
        )

    # Equipos sin categoría.
    val_sin_q = db.query(func.coalesce(func.sum(Equipment.valor_aprox), 0)).filter(Equipment.categoria_id.is_(None))
    cant_sin_q = db.query(func.count(Equipment.id)).filter(Equipment.categoria_id.is_(None))
    if eid:
        val_sin_q = val_sin_q.filter(Equipment.empresa_id == eid)
        cant_sin_q = cant_sin_q.filter(Equipment.empresa_id == eid)
    valor_sin_cat = float(val_sin_q.scalar() or 0)
    cantidad_sin_cat = int(cant_sin_q.scalar() or 0)
    if cantidad_sin_cat:
        resultado.append(
            {
                "categoria_id": None,
                "categoria": "Sin categoría",
                "cantidad": cantidad_sin_cat,
                "valor_total": valor_sin_cat,
            }
        )
        gran_total += valor_sin_cat

    return {"por_categoria": resultado, "gran_total": gran_total}


# ---------------- Exportaciones CSV / Excel ----------------

def _media_type(formato: str) -> str:
    return (
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        if formato == "xlsx"
        else "text/csv; charset=utf-8"
    )


@router.get("/exportar/equipos")
def exportar_equipos(
    formato: str = "csv",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if formato not in ("csv", "xlsx"):
        raise HTTPException(status_code=400, detail="Formato debe ser csv o xlsx")
    query = db.query(Equipment)
    if current_user.empresa_id:
        query = query.filter(Equipment.empresa_id == current_user.empresa_id)
    equipos = query.order_by(Equipment.folio).all()
    filas = _filas_equipos(equipos)
    contenido = exportar_xlsx(filas) if formato == "xlsx" else exportar_csv(filas)
    return Response(
        content=contenido,
        media_type=_media_type(formato),
        headers={
            "Content-Disposition": f'attachment; filename="inventario_equipos.{formato}"'
        },
    )


@router.get("/exportar/actas")
def exportar_actas(
    formato: str = "csv",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if formato not in ("csv", "xlsx"):
        raise HTTPException(status_code=400, detail="Formato debe ser csv o xlsx")
    query = db.query(Acta)
    if current_user.empresa_id:
        query = query.filter(Acta.empresa_id == current_user.empresa_id)
    actas = query.order_by(Acta.id.desc()).all()
    filas = _filas_actas(actas)
    contenido = exportar_xlsx(filas) if formato == "xlsx" else exportar_csv(filas)
    return Response(
        content=contenido,
        media_type=_media_type(formato),
        headers={
            "Content-Disposition": f'attachment; filename="historial_actas.{formato}"'
        },
    )


@router.get("/exportar/mantenimientos")
def exportar_mantenimientos(
    formato: str = "csv",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if formato not in ("csv", "xlsx"):
        raise HTTPException(status_code=400, detail="Formato debe ser csv o xlsx")
    query = db.query(MaintenanceRecord)
    if current_user.empresa_id:
        query = query.filter(MaintenanceRecord.empresa_id == current_user.empresa_id)
    registros = query.order_by(MaintenanceRecord.id.desc()).all()
    filas = _filas_mantenimientos(registros)
    contenido = exportar_xlsx(filas) if formato == "xlsx" else exportar_csv(filas)
    return Response(
        content=contenido,
        media_type=_media_type(formato),
        headers={
            "Content-Disposition": f'attachment; filename="mantenimientos.{formato}"'
        },
    )


@router.get("/pdf/inventario-por-ubicacion")
def pdf_inventario_por_ubicacion(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reporte PDF del inventario agrupado por ubicación, con logo de la empresa."""
    from app.core.config import COMPANY

    query = db.query(Equipment)
    if current_user.empresa_id:
        query = query.filter(Equipment.empresa_id == current_user.empresa_id)
    equipos = query.all()
    por_ubicacion = {}
    valor_total = 0.0
    for eq in equipos:
        nombre = (eq.ubicacion_rel.nombre if eq.ubicacion_rel else eq.ubicacion) or "Sin ubicación"
        if nombre not in por_ubicacion:
            por_ubicacion[nombre] = {"cantidad": 0, "valor_total": 0.0}
        por_ubicacion[nombre]["cantidad"] += 1
        v = eq.valor_aprox or 0
        por_ubicacion[nombre]["valor_total"] += float(v)
        valor_total += float(v)

    filas = [
        {"ubicacion": k, "cantidad": v["cantidad"], "valor_total": v["valor_total"]}
        for k, v in sorted(por_ubicacion.items())
    ]

    PDF_DIR.mkdir(parents=True, exist_ok=True)
    out = PDF_DIR / "reporte_inventario_por_ubicacion.pdf"
    generar_inventario_por_ubicacion(
        filas, total_equipos=len(equipos), valor_total=valor_total,
        company=COMPANY, output_path=out,
    )
    return FileResponse(path=str(out), media_type="application/pdf", filename="inventario_por_ubicacion.pdf")


@router.get("/pdf/resumen-mantenimientos")
def pdf_resumen_mantenimientos(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reporte PDF con el resumen de los registros de mantenimiento, con logo."""
    from app.core.config import COMPANY

    query = db.query(MaintenanceRecord)
    if current_user.empresa_id:
        query = query.filter(MaintenanceRecord.empresa_id == current_user.empresa_id)
    registros = query.order_by(MaintenanceRecord.id.desc()).all()
    filas = []
    for r in registros:
        equipo = r.equipo
        filas.append(
            {
                "folio": f"MT-{r.id}",
                "equipo": f"{equipo.marca} {equipo.modelo}" if equipo else "-",
                "tipo": r.tipo,
                "tecnico": r.tecnico,
                "estado": r.estado,
                "costo": r.costo,
            }
        )

    PDF_DIR.mkdir(parents=True, exist_ok=True)
    out = PDF_DIR / "reporte_resumen_mantenimientos.pdf"
    generar_resumen_mantenimientos(filas, total=len(registros), company=COMPANY, output_path=out)
    return FileResponse(path=str(out), media_type="application/pdf", filename="resumen_mantenimientos.pdf")


@router.get("/acta/latest")
def get_latest_acta(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Devuelve la última acta generada; si el PDF en disco falta, lo regenera."""
    query = db.query(Acta)
    if current_user.empresa_id:
        query = query.filter(Acta.empresa_id == current_user.empresa_id)
    ultima = query.order_by(Acta.id.desc()).first()
    if ultima:
        pdf_path = Path(ultima.pdf_path) if ultima.pdf_path else PDF_DIR / f"acta_{ultima.numero}.pdf"
        if not pdf_path.exists():
            from app.core.config import COMPANY
            from app.services.pdf_acta import generar_acta_pdf
            PDF_DIR.mkdir(parents=True, exist_ok=True)
            generar_acta_pdf(ultima, ultima.items, COMPANY, pdf_path)
            ultima.pdf_path = str(pdf_path)
            db.commit()

        return FileResponse(
            path=str(pdf_path),
            media_type="application/pdf",
            filename=f"{ultima.tipo.lower()}_{ultima.numero}.pdf",
        )

    pdf_path = PDF_DIR / "acta_ejemplo.pdf"
    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail="No hay actas registradas en el sistema")

    return FileResponse(
        path=str(pdf_path),
        media_type="application/pdf",
        filename="acta_inventario.pdf",
    )
