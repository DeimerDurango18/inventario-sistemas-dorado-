from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import assets, auth, catalogs, dashboard, geo, system, users
from app.core.config import settings
from app.core.database import Base, engine
from app.core.errors import AppError, ConflictError, ForbiddenError, NotFoundError, UnauthorizedError, ValidationError

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ETICOS - Gestión de Activos TI",
    version="1.0.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    return JSONResponse(
        status_code=400,
        content={"success": False, "message": exc.message, "code": exc.code},
    )


@app.exception_handler(NotFoundError)
async def not_found_handler(request: Request, exc: NotFoundError):
    return JSONResponse(
        status_code=404,
        content={"success": False, "message": exc.message, "code": exc.code},
    )


@app.exception_handler(ValidationError)
async def validation_handler(request: Request, exc: ValidationError):
    return JSONResponse(
        status_code=422,
        content={"success": False, "message": exc.message, "code": exc.code},
    )


@app.exception_handler(ConflictError)
async def conflict_handler(request: Request, exc: ConflictError):
    return JSONResponse(
        status_code=409,
        content={"success": False, "message": exc.message, "code": exc.code},
    )


@app.exception_handler(UnauthorizedError)
async def unauthorized_handler(request: Request, exc: UnauthorizedError):
    return JSONResponse(
        status_code=401,
        content={"success": False, "message": exc.message, "code": exc.code},
    )


@app.exception_handler(ForbiddenError)
async def forbidden_handler(request: Request, exc: ForbiddenError):
    return JSONResponse(
        status_code=403,
        content={"success": False, "message": exc.message, "code": exc.code},
    )


API_PREFIX = "/api"
app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(users.router, prefix=API_PREFIX)
app.include_router(catalogs.router, prefix=API_PREFIX)
app.include_router(geo.router, prefix=API_PREFIX)
app.include_router(assets.router, prefix=API_PREFIX)
app.include_router(dashboard.router, prefix=API_PREFIX)
app.include_router(system.router, prefix=API_PREFIX)


@app.get("/api/health", tags=["Sistema"])
def health():
    return {"success": True, "message": "ETICOS API operativa", "version": app.version}