from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import COMPANY
from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.maintenance import MaintenanceRecord
from app.models.equipment import Equipment, Movement
from app.models.user import User
from app.schemas import MaintenanceIn
from app.services.pdf_mantenimiento import generar_acta_mantenimiento_pdf

router = APIRouter()

# Solo supervisor/admin pueden crear o cambiar estado de mantenimientos.
MODIFY_ROLES = require_roles("admin", "supervisor")

PDF_DIR = Path(__file__).resolve().parents[3] / "storage" / "mantenimientos"
PDF_DIR.mkdir(parents=True, exist_ok=True)

EVI_DIR = Path(__file__).resolve().parents[3] / "storage" / "mantenimientos_evidencia"
EVI_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".webp"}


def _serialize_registro(r: MaintenanceRecord) -> dict:
    return {
        "id": r.id,
        "equipo_id": r.equipo_id,
        "equipo_folio": r.equipo.folio if r.equipo else None,
        "equipo_marca": r.equipo.marca if r.equipo else None,
        "equipo_modelo": r.equipo.modelo if r.equipo else None,
        "tipo": r.tipo,
        "descripcion": r.descripcion,
        "tecnico": r.tecnico,
        "costo": float(r.costo) if r.costo is not None else None,
        "estado": r.estado,
        "fecha_programada": r.fecha_programada.isoformat() if r.fecha_programada else None,
        "fecha_finalizado": r.fecha_finalizado.isoformat() if r.fecha_finalizado else None,
        "foto": r.foto,
        "piezas": r.piezas,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "pdf_url": f"/api/mantenimientos/{r.id}/pdf",
    }


def _registrar_movimiento(
    db: Session,
    equipo: Equipment,
    tipo: str,
    persona: str,
    motivo: str = None,
    estado_anterior: str = None,
    estado_nuevo: str = None,
) -> None:
    db.add(
        Movement(
            tipo=tipo,
            persona=persona,
            motivo=motivo,
            estado_anterior=estado_anterior,
            estado_nuevo=estado_nuevo,
            equipo_id=equipo.id,
        )
    )


@router.get("")
def listar(db: Session = Depends(get_db)):
    registros = db.query(MaintenanceRecord).order_by(MaintenanceRecord.id.desc()).all()
    return [_serialize_registro(r) for r in registros]


@router.post("")
def crear(
    payload: MaintenanceIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(MODIFY_ROLES),
):
    equipo = db.query(Equipment).filter(Equipment.id == payload.equipo_id).first()
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")

    registro = MaintenanceRecord(**payload.model_dump())
    if registro.estado == "en_proceso":
        estado_anterior = equipo.estado
        equipo.estado = "reparacion"
        _registrar_movimiento(
            db,
            equipo,
            tipo="MANTENIMIENTO",
            persona=current_user.nombre,
            motivo=f"Mantenimiento {registro.tipo} iniciado",
            estado_anterior=estado_anterior,
            estado_nuevo="reparacion",
        )

    db.add(registro)
    db.commit()
    db.refresh(registro)
    return _serialize_registro(registro)


@router.patch("/{registro_id}/estado")
def cambiar_estado(
    registro_id: int,
    estado: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(MODIFY_ROLES),
):
    registro = db.query(MaintenanceRecord).filter(MaintenanceRecord.id == registro_id).first()
    if not registro:
        raise HTTPException(status_code=404, detail="Registro no encontrado")

    estado_anterior = registro.estado
    registro.estado = estado
    if estado == "finalizado":
        registro.fecha_finalizado = datetime.now(timezone.utc)
        if registro.equipo:
            _registrar_movimiento(
                db,
                registro.equipo,
                tipo="MANTENIMIENTO",
                persona=current_user.nombre,
                motivo=f"Mantenimiento {registro.tipo} finalizado",
                estado_anterior=registro.equipo.estado,
                estado_nuevo="disponible",
            )
            registro.equipo.estado = "disponible"
    elif estado == "en_proceso" and registro.equipo:
        if registro.equipo.estado != "reparacion":
            _registrar_movimiento(
                db,
                registro.equipo,
                tipo="MANTENIMIENTO",
                persona=current_user.nombre,
                motivo=f"Mantenimiento {registro.tipo} iniciado",
                estado_anterior=registro.equipo.estado,
                estado_nuevo="reparacion",
            )
            registro.equipo.estado = "reparacion"

    db.commit()
    db.refresh(registro)
    return _serialize_registro(registro)


@router.post("/{registro_id}/evidencia")
def subir_evidencia(
    registro_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(MODIFY_ROLES),
):
    """Sube una foto/evidencia del mantenimiento realizado."""
    registro = db.query(MaintenanceRecord).filter(MaintenanceRecord.id == registro_id).first()
    if not registro:
        raise HTTPException(status_code=404, detail="Registro de mantenimiento no encontrado")

    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(status_code=400, detail="Formato no permitido. Usa JPG, PNG o WEBP")

    nombre = f"mt_{registro_id}{ext}"
    destino = EVI_DIR / nombre
    destino.write_bytes(file.file.read())

    registro.foto = f"/storage/mantenimientos_evidencia/{nombre}"
    db.commit()
    db.refresh(registro)
    return {"message": "Evidencia subida", "foto": registro.foto}


@router.get("/{registro_id}/pdf")
def descargar_pdf(
    registro_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Genera y entrega el Acta de Mantenimiento en PDF (requiere autenticación)."""
    registro = db.query(MaintenanceRecord).filter(MaintenanceRecord.id == registro_id).first()
    if not registro:
        raise HTTPException(status_code=404, detail="Registro no encontrado")

    pdf_path = PDF_DIR / f"mantenimiento_{registro_id}.pdf"
    movimientos = (
        db.query(Movement)
        .filter(Movement.equipo_id == registro.equipo_id)
        .order_by(Movement.id.desc())
        .all()
    )
    generar_acta_mantenimiento_pdf(registro, registro.equipo, COMPANY, pdf_path, movimientos)

    return FileResponse(
        path=str(pdf_path),
        media_type="application/pdf",
        filename=f"acta_mantenimiento_{registro_id}.pdf",
    )
