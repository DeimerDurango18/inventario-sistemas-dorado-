"""Notificaciones (FASE 7).

Genera la lista de notificaciones derivadas en vivo del estado del inventario:
  - Mantenimientos vencidos o próximos a vencer
  - Equipos en estado "baja" recientes
  - Equipos sin stock categórico (sin serie) / sin categoría asignada

Es de solo lectura: el reconocimiento de lectura se gestiona en el cliente
(localStorage), por lo que no requiere cambios de esquema.
"""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.equipment import Equipment
from app.models.maintenance import MaintenanceRecord
from app.models.acta import Acta
from app.models.user import User
from app.services.email_service import construir_resumen_html, destinatarios_por_defecto, enviar_correo

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

    # --- Garantías próximas a vencer (fecha_compra + meses_garantia) ---
    todos = eq_query.all()
    for eq in todos:
        if not eq.fecha_compra or not eq.meses_garantia:
            continue
        fin = eq.fecha_compra + timedelta(days=30 * int(eq.meses_garantia))
        if fin.tzinfo is None:
            fin = fin.replace(tzinfo=timezone.utc)
        restante = (fin - ahora).days
        if restante < 0:
            items.append({
                "id": f"gar-vencida-{eq.id}",
                "tipo": "garantia",
                "nivel": "vencida",
                "titulo": "Garantía vencida",
                "mensaje": f"{eq.folio} - {eq.marca} {eq.modelo}: garantía venció el {fin.strftime('%Y-%m-%d')}.",
                "fecha": fin.isoformat(),
            })
        elif restante <= 30:
            items.append({
                "id": f"gar-proxima-{eq.id}",
                "tipo": "garantia",
                "nivel": "proxima",
                "titulo": "Garantía próxima a vencer",
                "mensaje": f"{eq.folio} - {eq.marca} {eq.modelo}: garantía vence en {restante} día(s).",
                "fecha": fin.isoformat(),
            })

    # --- Préstamos vencidos (fecha límite superada sin retorno) ---
    prestamos = (
        eq_query
        .filter(Equipment.estado == "prestamo")
        .filter(Equipment.prestamo_hasta.isnot(None))
        .all()
    )
    for eq in prestamos:
        fin = _normalize_dt(eq.prestamo_hasta)
        if fin is None or fin >= ahora:
            continue
        dias = (ahora - fin).days
        items.append({
            "id": f"prest-vencido-{eq.id}",
            "tipo": "prestamo",
            "nivel": "vencida",
            "titulo": "Préstamo vencido",
            "mensaje": f"{eq.folio} - {eq.marca} {eq.modelo} prestado a {eq.prestamo_a or '—'} venció el {fin.strftime('%Y-%m-%d')} (hace {dias} día(s)) sin retorno.",
            "fecha": fin.isoformat(),
        })

    # --- Actas pendientes de firma del responsable (más de 15 días) ---
    actas_pend = (
        db.query(Acta)
        .filter(Acta.firmado_por.is_(None))
        .filter(Acta.created_at <= ahora - timedelta(days=15))
        .order_by(Acta.created_at.asc())
        .limit(20)
        .all()
    )
    for a in actas_pend:
        items.append({
            "id": f"acta-firma-{a.id}",
            "tipo": "acta",
            "nivel": "info",
            "titulo": "Acta pendiente de firma",
            "mensaje": f"Acta {a.numero} ({a.tipo}) sin firma del responsable del destino.",
            "fecha": (a.created_at.isoformat() if a.created_at else None),
        })

    peso = {"vencida": 0, "proxima": 1, "info": 2}
    items.sort(key=lambda n: (peso.get(n["nivel"], 3), n["fecha"] or ""))
    return items


@router.post("/correo")
def enviar_correo_resumen(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "supervisor")),
):
    """Envía por SMTP el resumen operativo (garantías, mantenimientos, actas)."""
    from app.services.email_service import smtp_configurado

    if not smtp_configurado():
        raise HTTPException(
            status_code=400,
            detail="SMTP no configurado. Define SMTP_HOST en el .env del backend para habilitar el envío.",
        )

    html = construir_resumen_html(db)
    destinatarios = destinatarios_por_defecto(db)
    if not destinatarios:
        raise HTTPException(status_code=400, detail="No hay destinatarios configurados (SMTP_TO o usuarios admin/supervisor)")

    ok = enviar_correo(destinatarios, "Resumen operativo del inventario", html)
    if not ok:
        raise HTTPException(status_code=502, detail="No se pudo enviar el correo. Revisa la configuración SMTP")
    return {"message": "Correo enviado", "destinatarios": destinatarios}
