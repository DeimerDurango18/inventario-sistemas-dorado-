"""Smoke test de la API usando TestClient (sin levantar servidor)."""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

client = TestClient(app)


def check():
    r = client.get("/api/health")
    print("health:", r.status_code, r.json())
    assert r.status_code == 200

    r = client.post("/api/auth/login", json={"username": "admin", "password": "Admin123!"})
    print("login:", r.status_code)
    assert r.status_code == 200, r.text
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("roles:", [x["codigo"] for x in r.json()["user"]["roles"]])

    r = client.get("/api/dashboard/kpis", headers=headers)
    print("kpis:", r.status_code, r.json())
    assert r.status_code == 200

    r = client.get("/api/catalogo/estados", headers=headers)
    print("estados:", r.status_code, len(r.json()))
    assert r.status_code == 200

    r = client.get("/api/catalogo/categorias?size=200", headers=headers)
    print("categorias:", r.status_code, r.json()["total"])

    r = client.get("/api/geo/sedes", headers=headers)
    print("sedes:", r.status_code, len(r.json()))

    r = client.get("/api/geo/ubicaciones", headers=headers)
    print("ubicaciones:", r.status_code, len(r.json()))

    r = client.get("/api/catalogo/marcas", headers=headers)
    print("marcas:", r.status_code, r.json()["total"])

    # crear un responsable y un activo de prueba
    import time

    stamp = int(time.time() * 1000) % 1000000
    r = client.post(
        "/api/activos/responsables",
        headers=headers,
        json={"documento": f"SN-DOC-{stamp}", "nombre": "Responsable Prueba", "cargo": "Tecnico"},
    )
    print("crear responsable:", r.status_code)
    assert r.status_code in (200, 201), r.text
    resp_id = r.json()["id"]

    r = client.post(
        "/api/activos",
        headers=headers,
        json={
            "tipo": "COMPUTADOR",
            "categoria_id": 1,
            "serial": f"SN-SMOKE-{stamp}",
            "codigo_inventario": f"INV-SMOKE-{stamp}",
            "ubicacion_id": 1,
            "responsable_id": resp_id,
        },
    )
    print("crear activo:", r.status_code, r.json().get("codigo") if r.status_code in (200, 201) else r.text[:80])
    assert r.status_code in (200, 201), r.text

    activo_id = r.json()["id"]
    codigo = r.json()["codigo"]

    r = client.get(f"/api/activos/{activo_id}/qr", headers=headers)
    print("qr:", r.status_code, len(r.content), "bytes")

    r = client.post(f"/api/activos/{activo_id}/movimientos", headers=headers,
                    json={"tipo": "ASIGNACION", "responsable_nuevo_id": resp_id, "observaciones": "prueba"})
    print("movimiento:", r.status_code, r.json().get("numero") if r.status_code in (200, 201) else r.text[:80])
    assert r.status_code in (200, 201), r.text

    r = client.get(f"/api/activos/{activo_id}", headers=headers)
    print("ficha activo:", r.status_code, r.json()["estado"]["codigo"])

    r = client.get("/api/dashboard/kpis", headers=headers)
    print("kpis tras alta:", r.json())

    print("SMOKE TEST OK")


if __name__ == "__main__":
    check()