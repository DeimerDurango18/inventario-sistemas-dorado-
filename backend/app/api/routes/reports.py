from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse, Response
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.catalog import Category
from app.models.equipment import Equipment
from app.models.maintenance import MaintenanceRecord
from app.models.acta import Acta
from app.services.exports import exportar_csv, exportar_xlsx, _filas_equipos, _filas_actas, _filas_mantenimientos

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
def dashboard(db: Session = Depends(get_db)):
    totals = (
        db.query(Equipment.estado, func.count(Equipment.id))
        .group_by(Equipment.estado)
        .all()
    )
    result = {"disponibles": 0, "asignados": 0, "reparacion": 0, "baja": 0}
    for estado, count in totals:
        raw = (estado or "").lower()
        # Los estados se almacenan en singular; el reporte agrupa en plural.
        key = {"disponible": "disponibles", "asignado": "asignados"}.get(raw, raw)
        if key in result:
            result[key] = count

    ahora = datetime.now(timezone.utc)
    mantenimientos_activos = (
        db.query(MaintenanceRecord)
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

    actas_mes = db.query(Acta).count()
    mes_nombre = MESES_ES.get(datetime.now().month, "Mes actual")

    return {
        "totales": result,
        "mes": mes_nombre,
        "mantenimientos_activos": len(mantenimientos_activos),
        "actas_generadas": actas_mes,
        "alertas": {"vencidas": vencidas, "proximas": proximas},
    }


@router.get("/mantenimiento/alertas")
def alertas_mantenimiento(db: Session = Depends(get_db)):
    """Mantenimientos preventivos/correctivos vencidos o próximos a vencer."""
    ahora = datetime.now(timezone.utc)
    limite = ahora + timedelta(days=7)

    registros = (
        db.query(MaintenanceRecord)
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
def reporte_depreciacion(db: Session = Depends(get_db)):
    """Valor total del inventario agrupado por categoría (valor aproximado)."""
    categorias = db.query(Category).all()
    resultado = []
    gran_total = 0.0

    for cat in categorias:
        valor = (
            db.query(func.coalesce(func.sum(Equipment.valor_aprox), 0))
            .filter(Equipment.categoria_id == cat.id)
            .scalar()
        )
        cantidad = (
            db.query(func.count(Equipment.id))
            .filter(Equipment.categoria_id == cat.id)
            .scalar()
        )
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
    valor_sin_cat = float(
        db.query(func.coalesce(func.sum(Equipment.valor_aprox), 0))
        .filter(Equipment.categoria_id.is_(None))
        .scalar()
        or 0
    )
    cantidad_sin_cat = int(
        db.query(func.count(Equipment.id)).filter(Equipment.categoria_id.is_(None)).scalar() or 0
    )
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
def exportar_equipos(formato: str = "csv", db: Session = Depends(get_db)):
    if formato not in ("csv", "xlsx"):
        raise HTTPException(status_code=400, detail="Formato debe ser csv o xlsx")
    equipos = db.query(Equipment).order_by(Equipment.folio).all()
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
def exportar_actas(formato: str = "csv", db: Session = Depends(get_db)):
    if formato not in ("csv", "xlsx"):
        raise HTTPException(status_code=400, detail="Formato debe ser csv o xlsx")
    actas = db.query(Acta).order_by(Acta.id.desc()).all()
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
def exportar_mantenimientos(formato: str = "csv", db: Session = Depends(get_db)):
    if formato not in ("csv", "xlsx"):
        raise HTTPException(status_code=400, detail="Formato debe ser csv o xlsx")
    registros = db.query(MaintenanceRecord).order_by(MaintenanceRecord.id.desc()).all()
    filas = _filas_mantenimientos(registros)
    contenido = exportar_xlsx(filas) if formato == "xlsx" else exportar_csv(filas)
    return Response(
        content=contenido,
        media_type=_media_type(formato),
        headers={
            "Content-Disposition": f'attachment; filename="mantenimientos.{formato}"'
        },
    )


@router.get("/acta/latest")
def get_latest_acta(db: Session = Depends(get_db)):
    """Devuelve la última acta generada; si el PDF en disco falta, lo regenera."""
    ultima = db.query(Acta).order_by(Acta.id.desc()).first()
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
