"""Envío de correos SMTP con el resumen de alertas operativas del inventario.

Sin dependencias externas (smtplib de la librería estándar). Si SMTP_HOST
no está configurado en .env, las funciones devuelven False sin fallar.
"""
import smtplib
from datetime import datetime, timedelta, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import SMTP


def smtp_configurado() -> bool:
    return bool(SMTP.get("host") and SMTP.get("from_addr"))


def enviar_correo(destinatarios, asunto: str, html: str) -> bool:
    if not smtp_configurado() or not destinatarios:
        return False
    to_list = [d.strip() for d in destinatarios if d and d.strip()]
    if not to_list:
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = asunto
    msg["From"] = SMTP["from_addr"]
    msg["To"] = ", ".join(to_list)
    msg.attach(MIMEText(html, "html", "utf-8"))

    try:
        server = smtplib.SMTP(SMTP["host"], SMTP["port"], timeout=15)
        server.ehlo()
        if SMTP.get("use_tls"):
            server.starttls()
            server.ehlo()
        if SMTP.get("user"):
            server.login(SMTP["user"], SMTP["password"])
        server.sendmail(SMTP["from_addr"], to_list, msg.as_string())
        server.quit()
        return True
    except Exception:
        return False


def _fmt(dt) -> str:
    if dt is None:
        return "Sin fecha"
    return dt.strftime("%Y-%m-%d")


def construir_resumen_html(db) -> str:
    """Arma el HTML del resumen: garantías, mantenimientos y actas por renovar."""
    ahora = datetime.now(timezone.utc)
    filas = []

    # --- Garantías próximas a vencer (fecha_compra + meses_garantia) ---
    from app.models.equipment import Equipment
    from app.models.maintenance import MaintenanceRecord
    from app.models.acta import Acta

    equipos = db.query(Equipment).all()
    garantias = []
    for eq in equipos:
        if not eq.fecha_compra or not eq.meses_garantia:
            continue
        fin = eq.fecha_compra + timedelta(days=30 * int(eq.meses_garantia))
        if fin.tzinfo is None:
            fin = fin.replace(tzinfo=timezone.utc)
        restante = (fin - ahora).days
        if restante <= 30:
            garantias.append((eq, fin, restante))
    garantias.sort(key=lambda g: g[2])
    for eq, fin, restante in garantias[:20]:
        lbl = f"VENCIÓ hace {abs(restante)} día(s)" if restante < 0 else f"vence en {restante} día(s)"
        filas.append(
            f"<tr><td>Garantía</td><td>{eq.folio}</td><td>{eq.marca} {eq.modelo}</td>"
            f"<td>{fin.strftime('%Y-%m-%d')}</td><td style='color:"
            f"{'#c0392b' if restante < 0 else '#f39c12'}'>{lbl}</td></tr>"
        )

    # --- Mantenimientos vencidos o próximos (7 días) ---
    mts = (
        db.query(MaintenanceRecord)
        .filter(MaintenanceRecord.estado.in_(["programado", "en_proceso"]))
        .all()
    )
    for r in mts:
        if r.fecha_programada is None:
            continue
        f = r.fecha_programada
        if f.tzinfo is None:
            f = f.replace(tzinfo=timezone.utc)
        restante = (f - ahora).days
        etq = f"{r.equipo.folio} - {r.equipo.marca} {r.equipo.modelo}" if r.equipo else f"#{r.equipo_id}"
        if restante < 0 or restante <= 7:
            lbl = f"VENCIDO hace {abs(restante)} día(s)" if restante < 0 else f"programado en {restante} día(s)"
            filas.append(
                f"<tr><td>Mantenimiento</td><td>{etq}</td><td>{r.tipo}</td>"
                f"<td>{f.strftime('%Y-%m-%d')}</td><td style='color:{'#c0392b' if restante < 0 else '#f39c12'}'>{lbl}</td></tr>"
            )

    # --- Actas por renovar (sin firma registrada hace más de 60 días) ---
    actas = (
        db.query(Acta)
        .filter(Acta.firmado_por.is_(None))
        .filter(Acta.created_at <= ahora - timedelta(days=60))
        .order_by(Acta.created_at.asc())
        .limit(20)
        .all()
    )
    for a in actas:
        filas.append(
            f"<tr><td>Acta sin firmar</td><td>{a.numero}</td><td>{a.tipo}</td>"
            f"<td>{a.created_at.strftime('%Y-%m-%d') if a.created_at else 'N/A'}</td>"
            f"<td style='color:#e67e22'>pendiente de firma del responsable</td></tr>"
        )

    titulo = f"Resumen operativo del inventario · {ahora.strftime('%Y-%m-%d %H:%M')}"
    if not filas:
        return f"<h2>{titulo}</h2><p>Sin novedades activas (garantías, mantenimientos o actas por renovar).</p>"

    cuerpo = (
        "<table border='1' cellpadding='6' cellspacing='0' style='border-collapse:collapse;width:100%;font-family:Arial'>"
        "<tr style='background:#1d3557;color:#fff'><th>Tipo</th><th>Referencia</th><th>Detalle</th><th>Fecha</th><th>Estado</th></tr>"
        + "".join(filas)
        + "</table>"
    )
    return f"<h2>{titulo}</h2>{cuerpo}"


def destinatarios_por_defecto(db) -> list:
    if SMTP.get("to"):
        return [d.strip() for d in SMTP["to"].split(",") if d.strip()]
    from app.models.user import User

    correos = (
        db.query(User.correo)
        .filter(User.rol.in_(["admin", "supervisor"]))
        .all()
    )
    return [c[0] for c in correos if c and c[0]]