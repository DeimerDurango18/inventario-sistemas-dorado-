from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import (
    auth,
    inventory,
    reports,
    actas,
    categorias,
    ubicaciones,
    usuarios,
    mantenimientos,
)
from app.core.database import init_db


# ============================================================
# CONFIGURACIÓN DE LA APLICACIÓN
# ============================================================

app = FastAPI(
    title="Inventario Equipos API",
    version="1.1.0",
    description="API para la gestión del inventario de equipos",
)


# ============================================================
# CONFIGURACIÓN CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# INICIALIZACIÓN DE LA BASE DE DATOS
# ============================================================

@app.on_event("startup")
def startup_event():
    init_db()


# ============================================================
# RUTAS DE LA API
# ============================================================

app.include_router(
    auth.router,
    prefix="/api/auth",
    tags=["auth"],
)

app.include_router(
    inventory.router,
    prefix="/api/inventory",
    tags=["inventory"],
)

app.include_router(
    reports.router,
    prefix="/api/reports",
    tags=["reports"],
)

app.include_router(
    actas.router,
    prefix="/api/reports/actas",
    tags=["actas"],
)

app.include_router(
    categorias.router,
    prefix="/api/catalogo/categorias",
    tags=["categorias"],
)

app.include_router(
    ubicaciones.router,
    prefix="/api/catalogo/ubicaciones",
    tags=["ubicaciones"],
)

app.include_router(
    usuarios.router,
    prefix="/api/usuarios",
    tags=["usuarios"],
)

app.include_router(
    mantenimientos.router,
    prefix="/api/mantenimientos",
    tags=["mantenimientos"],
)


# ============================================================
# RUTA PRINCIPAL
# ============================================================

@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "Inventario Equipos API",
        "version": "1.1.0",
        "message": "API funcionando correctamente",
    }


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "Inventario Equipos API",
    }