"""Envío de actas por correo (SMTP) y generación de enlace WhatsApp."""

from __future__ import annotations

import smtplib
import urllib.parse
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings
from app.core.errors import ValidationError
from app.models.documental import Acta


def _asunto(acta: Acta) -> str:
    titulo = (acta.operacion_tipo or acta.tipo or "ACTA").replace("_", " ").title()
    return f"[ETICOS] {titulo} - {acta.numero}"


def _cuerpo(acta: Acta) -> str:
    return (
        f"Cordial saludo,\n\n"
        f"Le adjuntamos el acta {acta.numero} correspondiente a {acta.operacion_tipo or acta.tipo}.\n"
        f"Fecha: {acta.fecha.strftime('%d/%m/%Y')}.\n\n"
        f"ETICOS S.A.S.\n{settings.company_address or ''}"
    )


def enviar_acta_correo(destinatario: str, acta: Acta, pdf: bytes, nombre: str) -> dict:
    """Envía el acta como adjunto usando los datos SMTP de configuración."""
    if not settings.mail_host or not settings.mail_from:
        raise ValidationError(
            "El correo SMTP no está configurado. Defina MAIL_HOST, MAIL_USER, MAIL_PASSWORD y MAIL_FROM en el .env."
        )
    msg = MIMEMultipart()
    msg["From"] = settings.mail_from or settings.mail_user
    msg["To"] = destinatario
    msg["Subject"] = _asunto(acta)
    msg.attach(MIMEText(_cuerpo(acta), "plain", "utf-8"))
    adjunto = MIMEApplication(pdf, "pdf")
    adjunto.add_header("Content-Disposition", f"attachment; filename=\"{nombre}\"")
    msg.attach(adjunto)

    with smtplib.SMTP(settings.mail_host, settings.mail_port, timeout=25) as srv:
        if settings.mail_tls:
            srv.starttls()
        if settings.mail_user:
            srv.login(settings.mail_user, settings.mail_password)
        srv.send_message(msg)
    return {"medio": "correo", "destino": destinatario}


def enlace_whatsapp(telefono: str, acta: Acta) -> str:
    """Genera un enlace wa.me con el resumen del acta (el PDF se adjunta manualmente)."""
    telefono = "".join(ch for ch in telefono if ch.isdigit())
    if not telefono:
        raise ValidationError("Indique un teléfono válido para enviar por WhatsApp.")
    texto = (
        f"Hola, le compartimos el acta {acta.numero} "
        f"({acta.operacion_tipo or acta.tipo}) del {acta.fecha.strftime('%d/%m/%Y')}."
    )
    return f"https://wa.me/{telefono}?text={urllib.parse.quote(texto)}"