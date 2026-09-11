"""Envío de avisos vía WhatsApp a través del gateway local (whatsapp-gateway).

El gateway es un proceso Node (whatsapp-web.js) que expone HTTP local:
  GET  /health  -> estado de autenticación
  POST /send    -> {"numero": "57315...", "mensaje": "..."}

Configuración (variables de entorno, override por .env):
  WHATSAPP_GATEWAY_URL   (por defecto: http://127.0.0.1:8900)
  WHATSAPP_DESTINOS      (csv de números con o sin +57, ej. "3157410696,3153199403")

Sin gateway configurado o sin autenticación, las funciones devuelven False sin fallar.
"""
import json
import urllib.request
import urllib.error

from app.core.config import WHATSAPP_GATEWAY_URL, WHATSAPP_DESTINOS


def _gateway_url() -> str:
    return (WHATSAPP_GATEWAY_URL or "http://127.0.0.1:8900").rstrip("/")


def whatsapp_configurado() -> bool:
    return bool(WHATSAPP_DESTINOS)


def _normalizar_numero(numero: str) -> str:
    n = "".join(c for c in str(numero) if c.isdigit())
    if not n.startswith("57"):
        n = "57" + n
    return n


def _get(path: str) -> dict:
    try:
        with urllib.request.urlopen(f"{_gateway_url()}{path}", timeout=8) as r:
            return json.loads(r.read().decode("utf-8"))
    except (urllib.error.URLError, OSError, ValueError):
        return {"estado": "desconocido", "autenticado": False, "error": "gateway-sin-contacto"}


def _post(path: str, payload: dict) -> dict:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        f"{_gateway_url()}{path}",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        try:
            return json.loads(e.read().decode("utf-8"))
        except (ValueError, OSError):
            return {"ok": False, "error": f"HTTP {e.code}"}
    except (urllib.error.URLError, OSError, ValueError):
        return {"ok": False, "error": "gateway-sin-contacto"}


def gateway_estado() -> dict:
    return _get("/health")


def enviar_whatsapp(numero: str, mensaje: str) -> bool:
    if not mensaje or not mensaje.strip():
        return False
    res = _post("/send", {"numero": _normalizar_numero(numero), "mensaje": mensaje})
    return bool(res.get("ok"))


def construir_resumen_wa(db) -> str:
    """Resumen en texto plano (ideal para WhatsApp) con las mismas alertas que el HTML."""
    from datetime import datetime, timedelta, timezone as tz
    from app.models.equipment import Equipment
    from app.models.maintenance import MaintenanceRecord
    from app.models.acta import Acta

    ahora = datetime.now(tz.utc)
    lineas = []

    # Garantías
    garantias_vencidas, garantias_proximas = [], []
    for eq in db.query(Equipment).all():
        if not eq.fecha_compra or not eq.meses_garantia:
            continue
        fin = eq.fecha_compra + timedelta(days=30 * int(eq.meses_garantia))
        if fin.tzinfo is None:
            fin = fin.replace(tzinfo=tz.utc)
        restante = (fin - ahora).days
        etiqueta = f"{eq.folio} {eq.marca} {eq.modelo}"
        if restante < 0:
            garantias_vencidas.append(f" * {etiqueta}  vencida el {fin.strftime('%d/%m/%Y')}")
        elif restante <= 30:
            garantias_proximas.append(f" * {etiqueta}  vence en {restante}d ({fin.strftime('%d/%m/%Y')})")
    if garantias_vencidas:
        lineas.append("*Garantías vencidas*")
        lineas.extend(garantias_vencidas[:10])
    if garantias_proximas:
        lineas.append("*Garantías próximas*")
        lineas.extend(garantias_proximas[:10])

    # Mantenimientos
    mts_vencidos, mts_proximos = [], []
    for r in db.query(MaintenanceRecord).filter(MaintenanceRecord.estado.in_(["programado", "en_proceso"])).all():
        if not r.fecha_programada:
            continue
        f = r.fecha_programada
        if f.tzinfo is None:
            f = f.replace(tzinfo=tz.utc)
        restante = (f - ahora).days
        eq = r.equipo
        etiqueta = f"{eq.folio} {eq.marca} {eq.modelo}" if eq else f"MT-{r.id}"
        if restante < 0:
            mts_vencidos.append(f" * {etiqueta}  venció {f.strftime('%d/%m/%Y')} ({r.tecnico or 's/tecnico'})")
        elif restante <= 7:
            mts_proximos.append(f" * {etiqueta}  programado {f.strftime('%d/%m/%Y')} ({r.tecnico or 's/tecnico'})")
    if mts_vencidos:
        lineas.append("*Mantenimientos vencidos*")
        lineas.extend(mts_vencidos[:10])
    if mts_proximos:
        lineas.append("*Mantenimientos próximos (7 días)*")
        lineas.extend(mts_proximos[:10])

    # Actas sin firma
    actas = db.query(Acta).filter(Acta.firmado_por.is_(None)).filter(Acta.created_at <= ahora - timedelta(days=15)).limit(10).all()
    if actas:
        lineas.append("*Actas sin firma*")
        for a in actas:
            lineas.append(f" * {a.numero} ({a.tipo})  desde {a.created_at.strftime('%d/%m/%Y') if a.created_at else '?'}")

    # Préstamos vencidos
    prestamos = db.query(Equipment).filter(Equipment.estado == "prestamo", Equipment.prestamo_hasta.isnot(None)).all()
    prestamos_vencidos = []
    for eq in prestamos:
        fin = eq.prestamo_hasta
        if fin.tzinfo is None:
            fin = fin.replace(tzinfo=tz.utc)
        if fin >= ahora:
            continue
        prestamos_vencidos.append(f" * {eq.folio} {eq.marca} {eq.marca} → {eq.prestamo_a or '?'}  venció {fin.strftime('%d/%m/%Y')} (hace {(ahora - fin).days}d)")
    if prestamos_vencidos:
        lineas.append("*Préstamos vencidos*")
        lineas.extend(prestamos_vencidos[:10])

    titulo = f"*Inventario · {ahora.strftime('%d/%m/%Y %H:%M')}*"
    if len(lineas) == 0:
        return f"{titulo}\nSin novedades activas."
    return titulo + "\n" + "\n".join(lineas)


def enviar_whatsapp_grupo(mensaje: str) -> dict:
    """Envía a todos los destinatarios configurados. Devuelve {ok, enviados, fallidos}."""
    if not whatsapp_configurado() or not mensaje.strip():
        return {"ok": False, "enviados": [], "fallidos": [d for d in WHATSAPP_DESTINOS]}

    enviados, fallidos = [], []
    for d in WHATSAPP_DESTINOS:
        if enviar_whatsapp(d, mensaje):
            enviados.append(d)
        else:
            fallidos.append(d)

    return {"ok": bool(enviados), "enviados": enviados, "fallidos": fallidos}