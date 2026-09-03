"""Tests de gestión de usuarios (admin only)."""


def test_listar_usuarios_admin(client, admin_headers):
    resp = client.get("/api/usuarios", headers=admin_headers)
    assert resp.status_code == 200
    assert any(u["correo"] == "admin@test.com" for u in resp.json())


def test_usuarios_requiere_admin(client, admin_headers):
    reg = client.post(
        "/api/auth/register",
        json={"nombre": "Oper", "correo": "opus@test.com", "password": "secreto1", "rol": "operativo"},
    )
    headers = {"Authorization": f"Bearer {reg.json()['access_token']}"}
    resp = client.get("/api/usuarios", headers=headers)
    assert resp.status_code == 403


def test_crear_usuario_admin(client, admin_headers):
    resp = client.post(
        "/api/usuarios",
        json={"nombre": "Nuevo", "correo": "nuevo@test.com", "password": "pass123", "rol": "supervisor"},
        headers=admin_headers,
    )
    assert resp.status_code in (200, 201), resp.text
    assert resp.json()["rol"] == "supervisor"
    assert resp.json()["has_password"] is True


def test_no_exponer_password(client, admin_headers):
    resp = client.post(
        "/api/usuarios",
        json={"nombre": "P", "correo": "p@test.com", "password": "pass123"},
        headers=admin_headers,
    )
    body = resp.json()
    assert "password" not in body
    assert "has_password" in body


def test_actualizar_usuario_admin(client, admin_headers):
    cliente = client.post(
        "/api/usuarios",
        json={"nombre": "U1", "correo": "u1@test.com", "password": "pass123", "rol": "operativo"},
        headers=admin_headers,
    ).json()
    resp = client.patch(f"/api/usuarios/{cliente['id']}", json={"rol": "supervisor"}, headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["rol"] == "supervisor"


def test_no_eliminar_unico_admin(client, admin_headers):
    # obtener el id del admin (único usuario)
    usuarios = client.get("/api/usuarios", headers=admin_headers).json()
    admin_id = next(u["id"] for u in usuarios if u["correo"] == "admin@test.com")
    resp = client.delete(f"/api/usuarios/{admin_id}", headers=admin_headers)
    assert resp.status_code == 400
    assert "administrador" in resp.json()["detail"].lower()
