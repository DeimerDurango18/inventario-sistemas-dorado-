"""Tests de reportes: dashboard, alertas, depreciación y exportaciones."""


def _crear_equipo(client, admin_headers, folio="REP-1", valor=1000000, estado="disponible"):
    resp = client.post(
        "/api/inventory/equipos",
        json={"folio": folio, "marca": "HP", "modelo": "M1", "estado": estado, "valor_aprox": valor},
        headers=admin_headers,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def test_dashboard(client, admin_headers):
    _crear_equipo(client, admin_headers, folio="D-1", estado="disponible")
    _crear_equipo(client, admin_headers, folio="D-2", estado="asignado")
    resp = client.get("/api/reports/dashboard", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["totales"]["disponibles"] == 1
    assert data["totales"]["asignados"] == 1
    assert "alertas" in data


def test_depreciacion(client, admin_headers):
    client.post(
        "/api/catalogo/categorias",
        json={"nombre": "Computo"},
        headers=admin_headers,
    )
    cat_id = client.get("/api/catalogo/categorias", headers=admin_headers).json()[0]["id"]
    _crear_equipo(client, admin_headers, folio="DEP-1", valor=2000000)
    resp = client.post(
        "/api/inventory/equipos",
        json={"folio": "DEP-2", "marca": "Dell", "modelo": "X", "valor_aprox": 3000000, "categoria_id": cat_id},
        headers=admin_headers,
    )
    assert resp.status_code == 201

    resp = client.get("/api/reports/depreciacion", headers=admin_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["gran_total"] == 5000000
    # hay una fila para la categoría y una "Sin categoría"
    assert any(p["categoria"] == "Computo" and p["valor_total"] == 3000000 for p in data["por_categoria"])


def test_exportar_equipos_csv(client, admin_headers):
    _crear_equipo(client, admin_headers, folio="EXP-1")
    resp = client.get("/api/reports/exportar/equipos?formato=csv", headers=admin_headers)
    assert resp.status_code == 200
    assert "text/csv" in resp.headers["content-type"]
    assert "EXP-1" in resp.text


def test_exportar_equipos_xlsx(client, admin_headers):
    _crear_equipo(client, admin_headers, folio="XLSX-1")
    resp = client.get("/api/reports/exportar/equipos?formato=xlsx", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
    # Magic bytes de XLSX
    assert resp.content[:2] == b"PK"


def test_exportar_formato_invalido(client, admin_headers):
    resp = client.get("/api/reports/exportar/equipos?formato=pdf", headers=admin_headers)
    assert resp.status_code == 400


def test_alertas_mantenimiento(client, admin_headers):
    # crear equipo
    eq = _crear_equipo(client, admin_headers, folio="MT-1")
    # crear mantenimiento programado en el pasado (vencido)
    resp = client.post(
        "/api/mantenimientos",
        json={
            "equipo_id": eq["id"],
            "tipo": "preventivo",
            "descripcion": "Revisión",
            "estado": "programado",
            "fecha_programada": "2020-01-01T00:00:00",
        },
        headers=admin_headers,
    )
    assert resp.status_code in (200, 201), resp.text

    resp = client.get("/api/reports/mantenimiento/alertas", headers=admin_headers)
    assert resp.status_code == 200
    alertas = resp.json()
    assert len(alertas) == 1
    assert alertas[0]["nivel"] == "vencida"


def test_exportar_mantenimientos(client, admin_headers):
    eq = _crear_equipo(client, admin_headers, folio="MT-2")
    client.post(
        "/api/mantenimientos",
        json={"equipo_id": eq["id"], "tipo": "correctivo", "descripcion": "Reparar"},
        headers=admin_headers,
    )
    resp = client.get("/api/reports/exportar/mantenimientos?formato=csv", headers=admin_headers)
    assert resp.status_code == 200
    assert "MT-2" in resp.text
