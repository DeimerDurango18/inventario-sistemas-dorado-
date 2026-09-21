from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_permiso
from app.core.database import get_db
from app.models.user import Usuario
from app.services import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/kpis")
def kpis(
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("ver_activos")),
):
    return dashboard_service.dashboard_kpis(db)


@router.get("/por-categoria")
def por_categoria(
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("ver_activos")),
):
    return dashboard_service.activos_por_categoria(db)


@router.get("/por-sede")
def por_sede(
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("ver_activos")),
):
    return dashboard_service.activos_por_sede(db)


@router.get("/alertas")
def alertas(
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("ver_activos")),
):
    return dashboard_service.alertas(db)


@router.get("/bajas-tickets")
def bajas_tickets(
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("ver_activos")),
):
    return dashboard_service.alta_bajas(db)