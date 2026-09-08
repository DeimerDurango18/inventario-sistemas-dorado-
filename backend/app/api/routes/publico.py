"""Consulta pública de equipos (FASE 12).

Endpoints sin autenticación para la lectura rápida del estado de un equipo
a través del código QR:

  GET /consulta/equipos/{equipo_id}        -> landing HTML (página pública)
  GET /consulta/equipos/{equipo_id}/data   -> JSON (resumen + historial)

Solo expone información del equipo; no permite modificaciones.
"""
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.equipment import Equipment
from app.models.maintenance import MaintenanceRecord
from app.models.punto_venta import Instalacion

router = APIRouter()

TEMPLATE_DIR = Path(__file__).resolve().parents[2] / "templates"

ESTADO_LABEL = {
    "disponible": "Disponible",
    "asignado": "Asignado",
    "prestamo": "En préstamo",
    "reparacion": "En reparación",
    "baja": "Dado de baja",
}

MOV_TIPO_LABEL = {
    "ENTRADA": "Entrada",
    "SALIDA": "Salida",
    "CAMBIO_ESTADO": "Cambio de estado",
    "MANTENIMIENTO": "Mantenimiento",
    "PRESTAMO": "Préstamo",
    "RETORNO": "Retorno de préstamo",
    "BAJA": "Baja",
    "VENTA": "Venta",
    "MOVIMIENTO": "Traspaso",
}

ESTADO_COLOR = {
    "disponible": "#2e7d32",
    "asignado": "#1565c0",
    "prestamo": "#e65100",
    "reparacion": "#8e24aa",
    "baja": "#c62828",
}


def _serializar_publico(db: Session, equipo: Equipment) -> dict:
    instalacion = (
        db.query(Instalacion)
        .filter(Instalacion.equipo_id == equipo.id)
        .order_by(Instalacion.id.desc())
        .first()
    )
    mantenimientos = (
        db.query(MaintenanceRecord)
        .filter(MaintenanceRecord.equipo_id == equipo.id)
        .order_by(MaintenanceRecord.id.desc())
        .limit(6)
        .all()
    )
    movimientos = sorted(equipo.movements, key=lambda m: (m.created_at or m.id), reverse=True)[:15]

    return {
        "id": equipo.id,
        "folio": equipo.folio,
        "marca": equipo.marca,
        "modelo": equipo.modelo,
        "serie": equipo.serie,
        "estado": equipo.estado,
        "estado_label": ESTADO_LABEL.get(equipo.estado, equipo.estado),
        "estado_color": ESTADO_COLOR.get(equipo.estado, "#555555"),
        "foto": equipo.foto,
        "categoria": equipo.categoria.nombre if equipo.categoria else None,
        "ubicacion": equipo.ubicacion_rel.nombre if equipo.ubicacion_rel else None,
        "observaciones": equipo.observaciones,
        "fecha_compra": equipo.fecha_compra.isoformat() if equipo.fecha_compra else None,
        "meses_garantia": equipo.meses_garantia,
        "valor_aprox": float(equipo.valor_aprox) if equipo.valor_aprox is not None else None,
        "prestamo_a": equipo.prestamo_a,
        "prestamo_desde": equipo.prestamo_desde.isoformat() if equipo.prestamo_desde else None,
        "prestamo_hasta": equipo.prestamo_hasta.isoformat() if equipo.prestamo_hasta else None,
        "baja_motivo": equipo.baja_motivo,
        "punto_actual": {
            "nombre": instalacion.punto.nombre if instalacion and instalacion.punto else None,
            "ciudad": instalacion.punto.ciudad if instalacion and instalacion.punto else None,
            "software": instalacion.software if instalacion else None,
            "estado_instalacion": instalacion.estado if instalacion else None,
        },
        "mantenimientos": [
            {
                "tipo": m.tipo,
                "estado": m.estado,
                "descripcion": m.descripcion,
                "tecnico": m.tecnico,
                "fecha_programada": m.fecha_programada.isoformat() if m.fecha_programada else None,
                "fecha_finalizado": m.fecha_finalizado.isoformat() if m.fecha_finalizado else None,
                "punto": m.punto.nombre if m.punto else None,
            }
            for m in mantenimientos
        ],
        "movimientos": [
            {
                "tipo": m.tipo,
                "tipo_label": MOV_TIPO_LABEL.get(m.tipo, m.tipo),
                "persona": m.persona,
                "motivo": m.motivo,
                "estado_anterior": m.estado_anterior,
                "estado_nuevo": m.estado_nuevo,
                "fecha": m.created_at.isoformat() if m.created_at else None,
            }
            for m in movimientos
        ],
    }


def _cargar_equipo(db: Session, equipo_id: int) -> Equipment:
    equipo = db.query(Equipment).filter(Equipment.id == equipo_id).first()
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    return equipo


@router.get("/equipos/{equipo_id}", response_class=HTMLResponse)
def pagina_consulta(equipo_id: int, db: Session = Depends(get_db)):
    _cargar_equipo(db, equipo_id)
    archivo = TEMPLATE_DIR / "equipo_consulta.html"
    if not archivo.exists():
        raise HTTPException(status_code=500, detail="Plantilla de consulta no disponible")
    return HTMLResponse(archivo.read_text(encoding="utf-8"), media_type="text/html")


@router.get("/equipos/{equipo_id}/data")
def datos_consulta(equipo_id: int, db: Session = Depends(get_db)):
    equipo = _cargar_equipo(db, equipo_id)
    return _serializar_publico(db, equipo)