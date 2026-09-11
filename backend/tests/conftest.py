"""Configuración compartida de pytest para los tests de la API.

Utiliza una base SQLite en memoria con un engine propio (independiente del
`engine` de la aplicación) y sobreescribe la dependencia `get_db` para que
cada test trabaje sobre un esquema limpio.
"""
import os

os.environ["DB_ENGINE"] = "sqlite"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.main import app

# Engine propio aislado en memoria. StaticPool + :memory: garantizan que todas
# las conexiones compartan la misma base de datos en memoria.
engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def _recreate_schema():
    """Crea las tablas desde cero (esquema limpio)."""
    import app.models  # noqa: F401  registra todos los modelos
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


@pytest.fixture(autouse=True)
def _clean_db():
    """Cada test trabaja sobre un esquema vacío y fresco."""
    _recreate_schema()
    yield
    Base.metadata.drop_all(bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture()
def db_session():
    """Devuelve una sesión limpia (vacía) por test."""
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client():
    """Cliente de prueba con la dependencia get_db sobrescrita."""
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.pop(get_db, None)


@pytest.fixture()
def admin_token(client):
    """Registra el primer usuario (admin) y devuelve su token."""
    resp = client.post(
        "/api/auth/register",
        json={
            "nombre": "Admin",
            "correo": "admin@test.com",
            "password": "admin123",
            "rol": "operativo",  # el primero siempre queda como admin
        },
    )
    assert resp.status_code in (200, 201), resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


@pytest.fixture()
def admin_headers(admin_token):
    return admin_token


@pytest.fixture()
def auth_headers_factory(client):
    """Crea un usuario mediante el administrador y devuelve sus headers."""

    admin = client.post(
        "/api/auth/register",
        json={"nombre": "Admin", "correo": "admin-factory@test.com", "password": "admin123"},
    )
    assert admin.status_code in (200, 201), admin.text
    admin_headers = {"Authorization": f"Bearer {admin.json()['access_token']}"}

    def _make(nombre_correo, rol="operativo", password="pass1234", use_register=False):
        correo = f"{nombre_correo}@test.com"
        resp = client.post(
            "/api/usuarios",
            json={"nombre": nombre_correo, "correo": correo, "password": password, "rol": rol},
            headers=admin_headers,
        )
        assert resp.status_code in (200, 201), resp.text
        login = client.post("/api/auth/login", json={"correo": correo, "password": password})
        assert login.status_code == 200, login.text
        return {"Authorization": f"Bearer {login.json()['access_token']}"}

    return _make
