from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api.deps import require_permiso
from app.core.database import get_db
from app.core.errors import NotFoundError
from app.models.user import Usuario
from app.services import report_service

router = APIRouter(prefix="/reportes", tags=["Reportes"])


@router.get("/{nombre}.xlsx")
def descargar_reporte(
    nombre: str,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("exportar_reportes")),
):
    data = report_service.generar(nombre, db)
    if data is None:
        raise NotFoundError("Reporte")
    return Response(
        content=data,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="reporte_{nombre}.xlsx"'},
    )