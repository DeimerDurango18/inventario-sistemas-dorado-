"""Tests de catálogos: categorías y ubicaciones."""


def test_crud_categoria(client, admin_headers):
    # crear
    resp = client.post(
        "/api/catalogo/categorias",
        json={"nombre": "Tablets", "descripcion": "Tablets"},
        headers=admin_headers,
    )
    assert resp.status_code in (200, 201), resp.text
    cat_id = resp.json()["id"]

    # duplicado
    resp = client.post(
        "/api/catalogo/categorias",
        json={"nombre": "Tablets"},
        headers=admin_headers,
    )
    assert resp.status_code == 400

    # listar
    resp = client.get("/api/catalogo/categorias", headers=admin_headers)
    assert resp.status_code == 200
    assert any(c["nombre"] == "Tablets" for c in resp.json())

    # actualizar
    resp = client.put(
        f"/api/catalogo/categorias/{cat_id}",
        json={"nombre": "Tablets Pro", "descripcion": "Actualizada"},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["nombre"] == "Tablets Pro"

    # eliminar
    resp = client.delete(f"/api/catalogo/categorias/{cat_id}", headers=admin_headers)
    assert resp.status_code == 200


def test_no_eliminar_categoria_con_equipos(client, admin_headers):
    resp = client.post(
        "/api/catalogo/categorias",
        json={"nombre": "Servidores"},
        headers=admin_headers,
    )
    cat_id = resp.json()["id"]

    client.post(
        "/api/inventory/equipos",
        json={"folio": "SRV-1", "marca": "Dell", "modelo": "R740", "categoria_id": cat_id},
        headers=admin_headers,
    )
    resp = client.delete(f"/api/catalogo/categorias/{cat_id}", headers=admin_headers)
    assert resp.status_code == 400
    assert "equipos" in resp.json()["detail"].lower()


def test_crud_ubicacion(client, admin_headers):
    resp = client.post(
        "/api/catalogo/ubicaciones",
        json={"nombre": "Sede Norte", "ciudad": "Medellín", "direccion": "Calle 50"},
        headers=admin_headers,
    )
    assert resp.status_code in (200, 201), resp.text
    loc_id = resp.json()["id"]

    resp = client.put(
        f"/api/catalogo/ubicaciones/{loc_id}",
        json={"nombre": "Sede Sur", "ciudad": "Cali", "direccion": "Cra 10"},
        headers=admin_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["nombre"] == "Sede Sur"

    resp = client.delete(f"/api/catalogo/ubicaciones/{loc_id}", headers=admin_headers)
    assert resp.status_code == 200


def test_catalogos_requieren_rol(client, admin_headers):
    # sin token
    resp = client.post("/api/catalogo/categorias", json={"nombre": "X"})
    assert resp.status_code == 401
    # operativo -> 403 (admin ya existe vía admin_headers)
    reg = client.post(
        "/api/auth/register",
        json={"nombre": "Oper", "correo": "opcat@test.com", "password": "secreto1", "rol": "operativo"},
    )
    assert reg.json()["user"]["rol"] == "operativo"
    headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}
    resp = client.post("/api/catalogo/categorias", json={"nombre": "X"}, headers=headers)
    assert resp.status_code == 403


def test_seed_catalogos(client, admin_headers):
    resp = client.post("/api/catalogo/seed", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["ok"] is True
    assert data["categorias_creadas"] > 0
    assert data["ubicaciones_creadas"] > 0

    # segunda ejecución es idempotente
    resp2 = client.post("/api/catalogo/seed", headers=admin_headers)
    assert resp2.status_code == 200
    assert resp2.json()["categorias_creadas"] == 0
    assert resp2.json()["ubicaciones_creadas"] == 0

