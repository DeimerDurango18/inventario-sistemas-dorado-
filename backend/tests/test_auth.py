"""Tests de autenticación y autorización por rol."""


def test_register_primer_usuario_es_admin(client):
    resp = client.post(
        "/api/auth/register",
        json={
            "nombre": "Primero",
            "correo": "primero@test.com",
            "password": "secreto1",
        },
    )
    assert resp.status_code in (200, 201)
    data = resp.json()
    assert data["user"]["rol"] == "admin"
    assert data["token_type"] == "bearer"
    assert data["access_token"]


def test_register_password_corto(client):
    resp = client.post(
        "/api/auth/register",
        json={"nombre": "X", "correo": "x@test.com", "password": "abc"},
    )
    assert resp.status_code == 400


def test_register_correo_duplicado(client, admin_headers):
    client.post(
        "/api/auth/register",
        json={"nombre": "A", "correo": "dup@test.com", "password": "secreto1"},
    )
    resp = client.post(
        "/api/auth/register",
        json={"nombre": "B", "correo": "dup@test.com", "password": "secreto1"},
    )
    assert resp.status_code == 400
    assert "correo" in resp.json()["detail"].lower()


def test_register_segundo_usuario_rol_definido(client, admin_headers):
    resp = client.post(
        "/api/auth/register",
        json={"nombre": "Oper", "correo": "oper@test.com", "password": "secreto1", "rol": "operativo"},
    )
    assert resp.status_code in (200, 201)
    assert resp.json()["user"]["rol"] == "operativo"


def test_login_correcto(client, admin_headers):
    resp = client.post(
        "/api/auth/login",
        json={"correo": "admin@test.com", "password": "admin123"},
    )
    assert resp.status_code == 200
    assert resp.json()["access_token"]


def test_login_incorrecto(client, admin_headers):
    resp = client.post(
        "/api/auth/login",
        json={"correo": "admin@test.com", "password": "mala"},
    )
    assert resp.status_code == 401


def test_me_requiere_token(client):
    resp = client.get("/api/auth/me")
    assert resp.status_code == 401


def test_me_con_token(client, admin_headers):
    resp = client.get("/api/auth/me", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["correo"] == "admin@test.com"


def test_me_con_token_invalido(client):
    resp = client.get("/api/auth/me", headers={"Authorization": "Bearer token-invalido"})
    assert resp.status_code == 401
