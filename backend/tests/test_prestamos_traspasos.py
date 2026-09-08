"""Tests de préstamos, traspasos, alertas de préstamos vencidos y consulta pública QR."""


def _crear_categoria(client, admin_headers):
    resp = client.post(
        "/api/catalogo/categorias",
        json={"nombre": "Laptops", "descripcion": "Portátiles"},
        headers=admin_headers,
    )
    assert resp.status_code in (200, 201), resp.text
    return resp.json()["id"]


def _crear_ubicacion(client, admin_headers, nombre="Bodega 1"):
    resp = client.post(
        "/api/catalogo/ubicaciones",
        json={"nombre": nombre, "ciudad": "Bogotá", "direccion": "Calle 1"},
        headers=admin_headers,
    )
    assert resp.status_code in (200, 201), resp.text
    return resp.json()["id"]


def _crear_equipo(client, admin_headers, folio="EQ-001", **overrides):
    payload = {
        "folio": folio,
        "marca": "HP",
        "modelo": "ProBook",
        "serie": f"SN-{folio}",
        "estado": "disponible",
        "valor_aprox": 2500000,
    }
    payload.update(overrides)
    resp = client.post("/api/inventory/equipos", json=payload, headers=admin_headers)
    assert resp.status_code == 201, resp.text
    return resp.json()


def test_prestamo_y_retorno(client, admin_headers):
    cat = _crear_categoria(client, admin_headers)
    ubi = _crear_ubicacion(client, admin_headers)
    eq = _crear_equipo(client, admin_headers, categoria_id=cat, ubicacion_id=ubi)

    resp = client.post(
        f"/api/inventory/equipos/{eq['id']}/prestamo",
        json={"prestamo_a": "Maria Lopez", "motivo": "Trabajo en sede norte", "fecha_fin": "2026-12-31T00:00:00"},
        headers=admin_headers,
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["estado"] == "prestamo"
    assert data["prestamo_a"] == "Maria Lopez"

    hist = client.get(f"/api/inventory/equipos/historial/{eq['id']}", headers=admin_headers)
    assert "PRESTAMO" in [m["tipo"] for m in hist.json()]

    # Retorno
    resp = client.post(f"/api/inventory/equipos/{eq['id']}/retorno-prestamo", headers=admin_headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["estado"] == "disponible"
    assert data["prestamo_a"] is None

    hist = client.get(f"/api/inventory/equipos/historial/{eq['id']}", headers=admin_headers)
    tipos = [m["tipo"] for m in hist.json()]
    assert "RETORNO" in tipos


def test_prestamo_requiere_destinatario(client, admin_headers):
    eq = _crear_equipo(client, admin_headers)
    resp = client.post(
        f"/api/inventory/equipos/{eq['id']}/prestamo",
        json={"motivo": "sin destinatario"},
        headers=admin_headers,
    )
    assert resp.status_code == 422


def test_traspaso_equipo(client, admin_headers):
    ubi1 = _crear_ubicacion(client, admin_headers, nombre="Bodega 1")
    ubi2 = _crear_ubicacion(client, admin_headers, nombre="Sede Norte")
    eq = _crear_equipo(client, admin_headers, ubicacion_id=ubi1)

    resp = client.post(
        f"/api/inventory/equipos/{eq['id']}/traspaso",
        json={"ubicacion_id": ubi2, "motivo": "Cambio de sede"},
        headers=admin_headers,
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["ubicacion_id"] == ubi2
    assert data["ubicacion_nombre"] == "Sede Norte"

    hist = client.get(f"/api/inventory/equipos/historial/{eq['id']}", headers=admin_headers)
    mov = [m for m in hist.json() if m["tipo"] == "MOVIMIENTO"]
    assert mov, "El traspaso debe registrar un movimiento"
    assert "Bodega 1" in mov[0]["motivo"]
    assert "Sede Norte" in mov[0]["motivo"]


def test_traspaso_misma_ubicacion_rechazado(client, admin_headers):
    ubi1 = _crear_ubicacion(client, admin_headers, nombre="Bodega 1")
    eq = _crear_equipo(client, admin_headers, ubicacion_id=ubi1)
    resp = client.post(
        f"/api/inventory/equipos/{eq['id']}/traspaso",
        json={"ubicacion_id": ubi1},
        headers=admin_headers,
    )
    assert resp.status_code == 400


def test_traspaso_ubicacion_inexistente(client, admin_headers):
    eq = _crear_equipo(client, admin_headers)
    resp = client.post(
        f"/api/inventory/equipos/{eq['id']}/traspaso",
        json={"ubicacion_id": 99999},
        headers=admin_headers,
    )
    assert resp.status_code == 404


def test_traspaso_desde_prestamo(client, admin_headers):
    ubi1 = _crear_ubicacion(client, admin_headers, nombre="Bodega 1")
    ubi2 = _crear_ubicacion(client, admin_headers, nombre="Sede Sur")
    eq = _crear_equipo(client, admin_headers, ubicacion_id=ubi1)
    client.post(
        f"/api/inventory/equipos/{eq['id']}/prestamo",
        json={"prestamo_a": "Juan"}, headers=admin_headers,
    )
    resp = client.post(
        f"/api/inventory/equipos/{eq['id']}/traspaso",
        json={"ubicacion_id": ubi2},
        headers=admin_headers,
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["ubicacion_id"] == ubi2
    assert data["estado"] == "prestamo"


def test_notificacion_prestamo_vencido(client, admin_headers):
    eq = _crear_equipo(client, admin_headers)
    client.post(
        f"/api/inventory/equipos/{eq['id']}/prestamo",
        json={"prestamo_a": "Maria", "fecha_fin": "2020-01-01T00:00:00"},
        headers=admin_headers,
    )
    resp = client.get("/api/notificaciones/", headers=admin_headers)
    assert resp.status_code == 200
    ids = [n["id"] for n in resp.json()]
    assert f"prest-vencido-{eq['id']}" in ids


def test_consulta_publica_equipo(client, admin_headers):
    cat = _crear_categoria(client, admin_headers)
    ubi = _crear_ubicacion(client, admin_headers, nombre="Bodega 1")
    eq = _crear_equipo(client, admin_headers, categoria_id=cat, ubicacion_id=ubi)
    client.post(
        f"/api/inventory/equipos/{eq['id']}/prestamo",
        json={"prestamo_a": "Maria"}, headers=admin_headers,
    )

    # Page pública (HTML)
    resp = client.get(f"/consulta/equipos/{eq['id']}")
    assert resp.status_code == 200
    assert "text/html" in resp.headers.get("content-type", "")
    assert "Consulta de Equipo" in resp.text

    # Datos públicos (JSON)
    resp = client.get(f"/consulta/equipos/{eq['id']}/data")
    assert resp.status_code == 200
    data = resp.json()
    assert data["folio"] == eq["folio"]
    assert data["estado"] == "prestamo"
    assert data["estado_label"] == "En préstamo"
    assert data["ubicacion"] == "Bodega 1"
    tipos = [m["tipo"] for m in data["movimientos"]]
    assert "PRESTAMO" in tipos

    # No encontrado
    resp = client.get("/consulta/equipos/99999")
    assert resp.status_code == 404
    resp = client.get("/consulta/equipos/99999/data")
    assert resp.status_code == 404


def test_consulta_publica_sin_auth(client, admin_headers):
    eq = _crear_equipo(client, admin_headers)
    resp = client.get(f"/consulta/equipos/{eq['id']}/data")
    assert resp.status_code == 200  # no requiere token


def test_qr_contiene_url_de_consulta(client, admin_headers, monkeypatch):
    capturado = {}

    def _fake_generar(payload, **kwargs):
        capturado["payload"] = payload
        return b"FAKE_PNG"

    import app.api.routes.inventory as inv_mod
    monkeypatch.setattr(inv_mod, "generar_qr_png", _fake_generar)

    eq = _crear_equipo(client, admin_headers)
    resp = client.get(f"/api/inventory/equipos/{eq['id']}/qr", headers=admin_headers)
    assert resp.status_code == 200
    assert f"/consulta/equipos/{eq['id']}" in capturado["payload"]