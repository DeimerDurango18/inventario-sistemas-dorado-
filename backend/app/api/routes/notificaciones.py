"""Notificaciones (FASE 7).

Genera la lista de notificaciones derivadas en vivo del estado del inventario:
  - Mantenimientos vencidos o próximos a vencer
  - Equipos en estado "baja" recientes
  - Equipos sin stock categórico (sin serie) / sin categoría asignada

Es de solo lectura: el reconocimiento de lectura se gestiona en el cliente
(localStorage), por lo que no requiere cambios de esquema.
"""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.equipment import Equipment
from app.models.maintenance import MaintenanceRecord
from app.models.user import User

router = APIRouter()


def _normalize_dt(dt) -> datetime:
    if dt is None:
        return None
    if dt.tzinfo is not None:
        return dt.astimezone(timezone.utc)
    return dt.replace(tzinfo=timezone.utc)


@router.get("/")
def listar_notificaciones(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ahora = datetime.now(timezone.utc)
    limite = ahora + timedelta(days=7)
    items = []

    eq_query = db.query(Equipment)
    mt_query = db.query(MaintenanceRecord)
    if current_user.empresa_id:
        eq_query = eq_query.filter(Equipment.empresa_id == current_user.empresa_id)
        mt_query = mt_query.filter(MaintenanceRecord.empresa_id == current_user.empresa_id)

    registros = (
        mt_query
        .filter(MaintenanceRecord.estado.in_(["programado", "en_proceso"]))
        .all()
    )
    for r in registros:
        if r.fecha_programada is None:
            continue
        f_norm = _normalize_dt(r.fecha_programada)
        if f_norm is None:
            continue
        equipo = r.equipo
        etiqueta = f"{equipo.folio} - {equipo.marca} {equipo.modelo}" if equipo else f"Equipo #{r.equipo_id}"
        if f_norm < ahora:
            items.append({
                "id": f"mt-vencida-{r.id}",
                "tipo": "mantenimiento",
                "nivel": "vencida",
                "titulo": "Mantenimiento vencido",
                "mensaje": f"{etiqueta}: el servicio programado del {f_norm.strftime('%Y-%m-%d')} venció.",
                "fecha": f_norm.isoformat(),
            })
        elif r.estado == "programado" and f_norm <= limite:
            items.append({
                "id": f"mt-proxima-{r.id}",
                "tipo": "mantenimiento",
                "nivel": "proxima",
                "titulo": "Mantenimiento próximo",
                "mensaje": f"{etiqueta}: servicio programado para el {f_norm.strftime('%Y-%m-%d')}.",
                "fecha": f_norm.isoformat(),
            })

    bajas = (
        eq_query
        .filter(Equipment.estado == "baja")
        .all()
    )
    for eq in bajas[:50]:
        items.append({
            "id": f"baja-{eq.id}",
            "tipo": "baja",
            "nivel": "info",
            "titulo": "Equipo dado de baja",
            "mensaje": f"{eq.folio} - {eq.marca} {eq.modelo} está marcado como baja.",
            "fecha": (eq.created_at.isoformat() if eq.created_at else None),
        })

    sin_cat = (
        eq_query
        .filter(Equipment.categoria_id.is_(None))
        .limit(20)
        .all()
    )
    for eq in sin_cat:
        items.append({
            "id": f"sin-cat-{eq.id}",
            "tipo": "catalogo",
            "nivel": "info",
            "titulo": "Equipo sin categoría",
            "mensaje": f"{eq.folio} - {eq.marca} {eq.modelo} no tiene categoría asignada.",
            "fecha": (eq.created_at.isoformat() if eq.created_at else None),
        })

    peso = {"vencida": 0, "proxima": 1, "info": 2}
    items.sort(key=lambda n: (peso.get(n["nivel"], 3), n["fecha"] or ""))
    return items
