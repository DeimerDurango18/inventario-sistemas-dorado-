"""Tests del módulo Puntos de venta / Instalaciones y vinculo con mantenimientos."""


def _crear_equipo(client, admin_headers, folio="EQ-PTO"):
    resp = client.post(
        "/api/inventory/equipos",
        json={"folio": folio, "marca": "HP", "modelo": "M1"},
        headers=admin_headers,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def _crear_punto(client, admin_headers, nombre="Drogueria Central"):
    resp = client.post(
        "/api/puntos",
        json={"nombre": nombre, "tipo": "drogueria", "ciudad": "Bogota", "responsable": "Carlos"},
        headers=admin_headers,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def test_crear_y_listar_puntos(client, admin_headers):
    p = _crear_punto(client, admin_headers)
    assert p["estado"] == "activo"
    resp = client.get("/api/puntos", headers=admin_headers)
    assert resp.status_code == 200
    assert any(x["id"] == p["id"] for x in resp.json())


def test_punto_tipo_invalido(client, admin_headers):
    resp = client.post(
        "/api/puntos",
        json={"nombre": "X", "tipo": "bodega"},
        headers=admin_headers,
    )
    assert resp.status_code == 400


def test_instalar_y_retirar_equipo(client, admin_headers):
    p = _crear_punto(client, admin_headers)
    eq = _crear_equipo(client, admin_headers)
    resp = client.post(
        f"/api/puntos/{p['id']}/instalaciones",
        json={"equipo_id": eq["id"], "software": "POS"},
        headers=admin_headers,
    )
    assert resp.status_code == 201, resp.text
    inst = resp.json()
    assert inst["equipo_folio"] == eq["folio"]

    det = client.get(f"/api/puntos/{p['id']}", headers=admin_headers).json()
    assert det["equipos_instalados"] == 1
    assert len(det["instalaciones"]) == 1
    # La instalacion genera automaticamente una atencion tipo instalacion
    assert any(a["tipo"] == "instalacion" for a in det["atenciones"])

    resp = client.put(f"/api/puntos/instalaciones/{inst['id']}", json={"estado": "retirada"}, headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["estado"] == "retirada"


def test_instalacion_duplicada_rechazada(client, admin_headers):
    p = _crear_punto(client, admin_headers)
    eq = _crear_equipo(client, admin_headers)
    client.post(f"/api/puntos/{p['id']}/instalaciones", json={"equipo_id": eq["id"]}, headers=admin_headers)
    resp = client.post(f"/api/puntos/{p['id']}/instalaciones", json={"equipo_id": eq["id"]}, headers=admin_headers)
    assert resp.status_code == 400


def test_crear_atencion_con_ticket(client, admin_headers):
    p = _crear_punto(client, admin_headers)
    tk = client.post(
        "/api/soporte",
        json={"titulo": "Impresora falla", "prioridad": "media"},
        headers=admin_headers,
    ).json()
    resp = client.post(
        f"/api/puntos/{p['id']}/atenciones",
        json={"tipo": "mantenimiento", "ticket_id": tk["id"], "descripcion": "Cambio de toner"},
        headers=admin_headers,
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["ticket_id"] == tk["id"]


def test_atencion_con_ticket_inexistente(client, admin_headers):
    p = _crear_punto(client, admin_headers)
    resp = client.post(
        f"/api/puntos/{p['id']}/atenciones",
        json={"tipo": "soporte", "ticket_id": 9999, "descripcion": "X"},
        headers=admin_headers,
    )
    assert resp.status_code == 404


def test_mantenimiento_vinculado_a_punto(client, admin_headers):
    p = _crear_punto(client, admin_headers)
    eq = _crear_equipo(client, admin_headers)
    resp = client.post(
        "/api/mantenimientos",
        json={"equipo_id": eq["id"], "tipo": "preventivo", "punto_id": p["id"]},
        headers=admin_headers,
    )
    assert resp.status_code in (200, 201), resp.text
    assert resp.json()["punto_id"] == p["id"]

    det = client.get(f"/api/puntos/{p['id']}", headers=admin_headers).json()
    assert len(det["mantenimientos"]) == 1
    assert det["mantenimientos"][0]["equipo_folio"] == eq["folio"]


def test_punto_requiere_rol(client, admin_headers):
    resp = client.post("/api/puntos", json={"nombre": "X", "tipo": "drogueria"})
    assert resp.status_code == 401
    creado = client.post(
        "/api/usuarios",
        json={"nombre": "Oper", "correo": "opptos@test.com", "password": "secreto1", "rol": "operativo"},
        headers=admin_headers,
    )
    assert creado.json()["rol"] == "operativo"
    login = client.post("/api/auth/login", json={"correo": "opptos@test.com", "password": "secreto1"})
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    resp = client.post("/api/puntos", json={"nombre": "X", "tipo": "drogueria"}, headers=headers)
    assert resp.status_code == 403
