"""Tests de mantenimientos y actas (links con estado de equipos)."""


def _crear_equipo(client, admin_headers, folio="EQ-1"):
    resp = client.post(
        "/api/inventory/equipos",
        json={"folio": folio, "marca": "HP", "modelo": "M1"},
        headers=admin_headers,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def test_crear_mantenimiento_en_proceso_cambia_estado_equipo(client, admin_headers):
    eq = _crear_equipo(client, admin_headers)
    resp = client.post(
        "/api/mantenimientos",
        json={"equipo_id": eq["id"], "tipo": "correctivo", "descripcion": "Pantalla rota", "estado": "en_proceso"},
        headers=admin_headers,
    )
    assert resp.status_code in (200, 201), resp.text

    eq_resp = client.get(f"/api/inventory/equipos/{eq['id']}", headers=admin_headers)
    assert eq_resp.json()["estado"] == "reparacion"


def test_finalizar_mantenimiento_devuelve_equipo_disponible(client, admin_headers):
    eq = _crear_equipo(client, admin_headers)
    registro = client.post(
        "/api/mantenimientos",
        json={"equipo_id": eq["id"], "tipo": "correctivo", "estado": "en_proceso"},
        headers=admin_headers,
    ).json()

    resp = client.patch(
        f"/api/mantenimientos/{registro['id']}/estado?estado=finalizado",
        headers=admin_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["estado"] == "finalizado"

    eq_resp = client.get(f"/api/inventory/equipos/{eq['id']}", headers=admin_headers)
    assert eq_resp.json()["estado"] == "disponible"


def test_mantenimiento_requiere_rol(client, admin_headers):
    resp = client.post("/api/mantenimientos", json={"equipo_id": 1})
    assert resp.status_code == 401
    reg = client.post(
        "/api/auth/register",
        json={"nombre": "Oper", "correo": "opmt@test.com", "password": "secreto1", "rol": "operativo"},
    )
    assert reg.json()["user"]["rol"] == "operativo"
    headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}
    resp = client.post("/api/mantenimientos", json={"equipo_id": 1}, headers=headers)
    assert resp.status_code == 403


def test_acta_salida_asigna_equipo(client, admin_headers):
    eq = _crear_equipo(client, admin_headers, folio="ACTA-1")
    resp = client.post(
        "/api/reports/actas",
        json={
            "tipo": "SALIDA",
            "entregado_por": "Jefe Bodega",
            "proyecto": "Proyecto X",
            "items": [{"dispositivo": "Laptop", "marca": "HP", "equipo_id": eq["id"]}],
        },
        headers=admin_headers,
    )
    assert resp.status_code in (200, 201), resp.text
    assert resp.json()["numero"].startswith("SIS-")

    eq_resp = client.get(f"/api/inventory/equipos/{eq['id']}", headers=admin_headers)
    assert eq_resp.json()["estado"] == "asignado"


def test_acta_entrada_devuelve_equipo_disponible(client, admin_headers):
    eq = _crear_equipo(client, admin_headers, folio="ACTA-2")
    client.post(
        "/api/reports/actas",
        json={
            "tipo": "SALIDA",
            "entregado_por": "Jefe",
            "items": [{"dispositivo": "Laptop", "equipo_id": eq["id"]}],
        },
        headers=admin_headers,
    )
    resp = client.post(
        "/api/reports/actas",
        json={
            "tipo": "ENTRADA",
            "entregado_por": "Jefe",
            "items": [{"dispositivo": "Laptop", "equipo_id": eq["id"]}],
        },
        headers=admin_headers,
    )
    assert resp.status_code in (200, 201), resp.text
    eq_resp = client.get(f"/api/inventory/equipos/{eq['id']}", headers=admin_headers)
    assert eq_resp.json()["estado"] == "disponible"


def test_acta_no_despacha_equipo_en_reparacion(client, admin_headers):
    eq = _crear_equipo(client, admin_headers, folio="REP-ACTA")
    client.post(
        "/api/mantenimientos",
        json={"equipo_id": eq["id"], "tipo": "correctivo", "estado": "en_proceso"},
        headers=admin_headers,
    )
    resp = client.post(
        "/api/reports/actas",
        json={
            "tipo": "SALIDA",
            "entregado_por": "Jefe",
            "items": [{"dispositivo": "Laptop", "equipo_id": eq["id"]}],
        },
        headers=admin_headers,
    )
    assert resp.status_code == 400
    assert "reparaci" in resp.json()["detail"]


def test_acta_sin_items(client, admin_headers):
    resp = client.post(
        "/api/reports/actas",
        json={"tipo": "SALIDA", "entregado_por": "Jefe", "items": []},
        headers=admin_headers,
    )
    assert resp.status_code == 400


def test_acta_requiere_rol(client):
    resp = client.post("/api/reports/actas", json={"tipo": "SALIDA", "entregado_por": "A", "items": []})
    assert resp.status_code == 401
