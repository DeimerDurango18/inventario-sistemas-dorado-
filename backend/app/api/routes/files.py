from fastapi import APIRouter, Depends, File, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import require_permiso
from app.core.database import get_db
from app.core.errors import NotFoundError
from app.models.user import Usuario
from app.schemas.files import ArchivoRead
from app.services import files_service

router = APIRouter(prefix="/archivos", tags=["Adjuntos"])


@router.post("/{activo_id}", response_model=ArchivoRead, status_code=201)
def subir_archivo(
    activo_id: int,
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_permiso("editar_activos")),
):
    return files_service.guardar_archivo(db, archivo, "ACTIVO", activo_id, user.id)


@router.get("/activo/{activo_id}", response_model=list[ArchivoRead])
def listar_archivos_activo(
    activo_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("ver_activos")),
):
    return files_service.listar_archivos(db, "ACTIVO", activo_id)


@router.get("/{archivo_id}/descargar")
def descargar_archivo(
    archivo_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("ver_activos")),
):
    a = files_service.get_archivo(db, archivo_id)
    p = files_service.ruta_disco(a)
    if not p.exists():
        raise NotFoundError("Archivo")
    return FileResponse(p, media_type=a.mime or "application/octet-stream", filename=a.nombre_original)


@router.delete("/{archivo_id}")
def eliminar_archivo(
    archivo_id: int,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("editar_activos")),
):
    files_service.eliminar_archivo(db, archivo_id)
    return {"success": True}