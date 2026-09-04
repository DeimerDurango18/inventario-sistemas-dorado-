from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routes import (
    auth,
    inventory,
    reports,
    actas,
    categorias,
    ubicaciones,
    usuarios,
    mantenimientos,
    seed,
    notificaciones,
)
from app.core.config import CORS_ORIGINS, DEBUG
from app.core.database import init_db

STORAGE_DIR = Path(__file__).resolve().parents[1] / "storage"
STORAGE_DIR.mkdir(parents=True, exist_ok=True)
(STORAGE_DIR / "fotos").mkdir(parents=True, exist_ok=True)
(STORAGE_DIR / "actas").mkdir(parents=True, exist_ok=True)
(STORAGE_DIR / "mantenimientos").mkdir(parents=True, exist_ok=True)


# ============================================================
# CICLO DE VIDA (LIFESPAN)
# ============================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


# ============================================================
# CONFIGURACIÓN DE LA APLICACIÓN
# ============================================================

app = FastAPI(
    title="Inventario Equipos API",
    version="1.2.0",
    description="API para la gestión del inventario de equipos",
    lifespan=lifespan,
)


# ============================================================
# CONFIGURACIÓN CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# ARCHIVOS ESTÁTICOS (FOTOS Y DOCUMENTOS)
# ============================================================

app.mount("/storage", StaticFiles(directory=str(STORAGE_DIR)), name="storage")


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

app.include_router(
    seed.router,
    prefix="/api/catalogo",
    tags=["catalogo"],
)

app.include_router(
    notificaciones.router,
    prefix="/api/notificaciones",
    tags=["notificaciones"],
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