from __future__ import annotations

import logging
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.api.routes import assets, auth, catalogs, dashboard, files, geo, operations, reports, stock, system, users
from app.core.config import settings
from app.core.database import Base, SessionLocal, engine
from app.core.errors import AppError
from app.services.seed import seed_initial

logger = logging.getLogger("eticos.api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Inicialización controlada: esquema/seed solo cuando está expresamente habilitado."""
    if settings.auto_create_schema:
        Base.metadata.create_all(bind=engine)
    if settings.allow_dev_seed:
        try:
            with SessionLocal() as db:
                seed_initial(db)
        except Exception:
            logger.exception("No se pudo ejecutar el bootstrap de datos iniciales")
    yield
    engine.dispose()


app = FastAPI(
    title="ETICOS - Gestión de Activos TI",
    version="2.0.0",
    docs_url="/api/docs" if settings.enable_docs else None,
    redoc_url="/api/redoc" if settings.enable_docs else None,
    openapi_url="/api/openapi.json" if settings.enable_docs else None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Request-ID"],
)


@app.middleware("http")
async def request_context(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex[:16]
    started = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        logger.exception("Error no controlado request_id=%s path=%s", request_id, request.url.path)
        response = JSONResponse(
            status_code=500,
            content={
                "success": False,
                "message": "Error interno del servidor." if not settings.debug else "Error interno del servidor.",
                "code": "INTERNAL_ERROR",
                "request_id": request_id,
            },
        )
    elapsed_ms = (time.perf_counter() - started) * 1000
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Cache-Control"] = "no-store" if request.url.path.startswith("/api/") else "no-cache"
    logger.info("%s %s -> %s %.1fms request_id=%s", request.method, request.url.path, response.status_code, elapsed_ms, request_id)
    return response


@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "message": exc.message, "code": exc.code},
    )


@app.get("/api/health", tags=["Sistema"])
def health():
    """Healthcheck real de aplicación y base de datos."""
    db_ok = False
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
            db_ok = True
    except Exception:
        logger.exception("Healthcheck de base de datos falló")
    return {
        "success": db_ok,
        "status": "ok" if db_ok else "degraded",
        "version": app.version,
        "database": "ok" if db_ok else "error",
    }


API_PREFIX = "/api"
app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(users.router, prefix=API_PREFIX)
app.include_router(catalogs.router, prefix=API_PREFIX)
app.include_router(geo.router, prefix=API_PREFIX)
app.include_router(assets.router, prefix=API_PREFIX)
app.include_router(dashboard.router, prefix=API_PREFIX)
app.include_router(system.router, prefix=API_PREFIX)
app.include_router(stock.router, prefix=API_PREFIX)
app.include_router(files.router, prefix=API_PREFIX)
app.include_router(reports.router, prefix=API_PREFIX)
app.include_router(operations.router, prefix=API_PREFIX)
