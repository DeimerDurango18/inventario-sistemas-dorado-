"""Tests de CRUD de inventario (equipos), búsqueda, historial, QR y foto."""


def _crear_categoria(client, admin_headers, nombre="Laptops"):
    resp = client.post(
        "/api/catalogo/categorias",
        json={"nombre": nombre, "descripcion": "Portátiles"},
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
        "serie": "SN001",
        "estado": "disponible",
        "valor_aprox": 2500000,
    }
    payload.update(overrides)
    resp = client.post("/api/inventory/equipos", json=payload, headers=admin_headers)
    assert resp.status_code == 201, resp.text
    return resp.json()


def test_crear_equipo_exitoso(client, admin_headers):
    data = _crear_equipo(client, admin_headers)
    assert data["folio"] == "EQ-001"
    assert data["qr_url"]


def test_crear_equipo_folio_duplicado(client, admin_headers):
    _crear_equipo(client, admin_headers, folio="DUP")
    resp = client.post(
        "/api/inventory/equipos",
        json={"folio": "DUP", "marca": "A", "modelo": "B"},
        headers=admin_headers,
    )
    assert resp.status_code == 400


def test_crear_equipo_roles(client, admin_headers):
    # anónimo -> 401
    resp = client.post(
        "/api/inventory/equipos",
        json={"folio": "A1", "marca": "A", "modelo": "B"},
    )
    assert resp.status_code == 401

    # operativo -> 403 (admin ya existe: admin_headers)
    reg = client.post(
        "/api/auth/register",
        json={"nombre": "Oper", "correo": "op@test.com", "password": "secreto1", "rol": "operativo"},
    )
    assert reg.json()["user"]["rol"] == "operativo"
    op_headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}
    resp = client.post(
        "/api/inventory/equipos",
        json={"folio": "A2", "marca": "A", "modelo": "B"},
        headers=op_headers,
    )
    assert resp.status_code == 403


def test_listar_equipos(client, admin_headers):
    _crear_equipo(client, admin_headers)
    resp = client.get("/api/inventory/equipos", headers=admin_headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 1


def test_get_equipo_no_encontrado(client, admin_headers):
    resp = client.get("/api/inventory/equipos/999", headers=admin_headers)
    assert resp.status_code == 404


def test_actualizar_equipo_estado_registra_movimiento(client, admin_headers):
    data = _crear_equipo(client, admin_headers)
    resp = client.put(
        f"/api/inventory/equipos/{data['id']}",
        json={"estado": "asignado", "observaciones": "Cambio a asignado"},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["estado"] == "asignado"

    hist = client.get(f"/api/inventory/equipos/historial/{data['id']}", headers=admin_headers)
    assert hist.status_code == 200
    tipos = [m["tipo"] for m in hist.json()]
    # Cambio desde "disponible" se registra como MOVIMIENTO
    assert "MOVIMIENTO" in tipos


def test_buscar_equipos(client, admin_headers):
    _crear_equipo(client, admin_headers, folio="BUSCA-1", marca="Dell")
    _crear_equipo(client, admin_headers, folio="OTRO-2", marca="Lenovo")
    resp = client.get("/api/inventory/equipos/buscar?q=dell", headers=admin_headers)
    assert resp.status_code == 200
    folios = [e["folio"] for e in resp.json()]
    assert "BUSCA-1" in folios
    assert "OTRO-2" not in folios


def test_buscar_equipos_por_estado_y_categoria(client, admin_headers):
    cat = _crear_categoria(client, admin_headers)
    _crear_equipo(client, admin_headers, folio="CAT-1", categoria_id=cat, estado="disponible")
    resp = client.get(f"/api/inventory/equipos/buscar?categoria_id={cat}&estado=disponible", headers=admin_headers)
    assert resp.status_code == 200
    assert all(e["estado"] == "disponible" for e in resp.json())


def test_qr_equipo(client, admin_headers):
    data = _crear_equipo(client, admin_headers)
    resp = client.get(f"/api/inventory/equipos/{data['id']}/qr", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("image/png")


def test_qr_equipo_no_encontrado(client, admin_headers):
    resp = client.get("/api/inventory/equipos/999/qr", headers=admin_headers)
    assert resp.status_code == 404


def test_historial_equipo_vacio(client, admin_headers):
    data = _crear_equipo(client, admin_headers)
    resp = client.get(f"/api/inventory/equipos/historial/{data['id']}", headers=admin_headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_eliminar_equipo(client, admin_headers):
    data = _crear_equipo(client, admin_headers)
    resp = client.delete(f"/api/inventory/equipos/{data['id']}", headers=admin_headers)
    assert resp.status_code == 200
    resp2 = client.get(f"/api/inventory/equipos/{data['id']}", headers=admin_headers)
    assert resp2.status_code == 404


def test_eliminar_equipo_no_encontrado(client, admin_headers):
    resp = client.delete("/api/inventory/equipos/999", headers=admin_headers)
    assert resp.status_code == 404


def test_subir_foto_y_servir_estatico(client, admin_headers):
    data = _crear_equipo(client, admin_headers, folio="FOTO-1")
    equipo_id = data["id"]
    # Subir imagen png simulada
    dummy_png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4"
    resp = client.post(
        f"/api/inventory/equipos/{equipo_id}/foto",
        files={"file": ("test.png", dummy_png, "image/png")},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    foto_url = resp.json()["foto"]
    assert foto_url.startswith("/storage/fotos/")

    # Verificar que se sirve estáticamente a través de FastAPI
    resp_static = client.get(foto_url)
    assert resp_static.status_code == 200
    assert resp_static.content == dummy_png

