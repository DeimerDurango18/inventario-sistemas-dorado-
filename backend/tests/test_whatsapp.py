"""Tests del envío de notificaciones por WhatsApp (gateway whatsapp-web.js).

El gateway real no existe en los tests: se simulan las funciones de
whatsapp_service para verificar la respuesta del endpoint y el contenido
del resumen construido.
"""
import os

os.environ["WHATSAPP_DESTINOS"] = "3157410696,3153199403"


def test_whatsapp_endpoint_envia_resumen(client, admin_headers, monkeypatch):
    """POST /api/notificaciones/whatsapp responde y llama al grupo."""
    monkeypatch.setattr(
        "app.api.routes.notificaciones.gateway_estado",
        lambda: {"estado": "autenticado", "autenticado": True},
    )
    monkeypatch.setattr(
        "app.api.routes.notificaciones.whatsapp_configurado",
        lambda: True,
    )
    monkeypatch.setattr(
        "app.api.routes.notificaciones.enviar_whatsapp_grupo",
        lambda mensaje: {"ok": True, "enviados": ["3157410696"], "fallidos": []},
    )

    resp = client.post("/api/notificaciones/whatsapp", headers=admin_headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["enviados"] == ["3157410696"]
    assert data["fallidos"] == []
    assert "tamanio_chars" in data


def test_whatsapp_endpoint_requiere_autenticado(client, admin_headers, monkeypatch):
    """409 si el gateway no está autenticado."""
    monkeypatch.setattr(
        "app.api.routes.notificaciones.whatsapp_configurado",
        lambda: True,
    )
    monkeypatch.setattr(
        "app.api.routes.notificaciones.gateway_estado",
        lambda: {"estado": "qr", "autenticado": False},
    )

    resp = client.post("/api/notificaciones/whatsapp", headers=admin_headers)
    assert resp.status_code == 409, resp.text


def test_whatsapp_construir_resumen_sin_novedades(monkeypatch, db_session):
    """Un inventario vacío produce 'Sin novedades activas'."""
    from app.services.whatsapp_service import construir_resumen_wa

    texto = construir_resumen_wa(db_session)
    assert "Sin novedades activas" in texto