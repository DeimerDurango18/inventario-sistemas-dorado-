from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.adjunto import Adjunto
from app.models.equipment import Equipment
from app.models.ticket import Ticket
from app.models.user import User

router = APIRouter()

DIR = Path(__file__).resolve().parents[3] / "storage" / "adjuntos"
DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".webp", ".pdf"}
MAX_BYTES = 8 * 1024 * 1024  # 8 MB


def _serialize(a: Adjunto) -> dict:
    return {
        "id": a.id,
        "tipo": a.tipo,
        "equipo_id": a.equipo_id,
        "registro_id": a.registro_id,
        "ticket_id": a.ticket_id,
        "archivo": a.archivo,
        "url": a.archivo,
        "descripcion": a.descripcion,
        "creado_por": a.creado_por,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }


def _validar_referencia(db: Session, tipo: str, equipo_id, registro_id, ticket_id):
    if tipo == "equipo":
        if not equipo_id:
            raise HTTPException(status_code=400, detail="Un adjunto de equipo necesita equipo_id")
        if not db.query(Equipment).filter(Equipment.id == equipo_id).first():
            raise HTTPException(status_code=404, detail="Equipo no encontrado")
    elif tipo == "mantenimiento":
        if not registro_id:
            raise HTTPException(status_code=400, detail="Un adjunto de mantenimiento necesita registro_id")
    elif tipo == "ticket":
        if not ticket_id:
            raise HTTPException(status_code=400, detail="Un adjunto de ticket necesita ticket_id")
        if not db.query(Ticket).filter(Ticket.id == ticket_id).first():
            raise HTTPException(status_code=404, detail="Ticket no encontrado")
    else:
        raise HTTPException(status_code=400, detail="tipo debe ser equipo, mantenimiento o ticket")


@router.post("", status_code=201)
def subir(
    file: UploadFile = File(...),
    tipo: str = Form("equipo"),
    equipo_id: int = Form(None),
    registro_id: int = Form(None),
    ticket_id: int = Form(None),
    descripcion: str = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "supervisor")),
):
    _validar_referencia(db, tipo, equipo_id, registro_id, ticket_id)

    contenido = file.file.read()
    if len(contenido) > MAX_BYTES:
        raise HTTPException(status_code=400, detail="Archivo muy grande (máx. 8 MB)")

    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(status_code=400, detail="Formato no permitido. Usa JPG, PNG, WEBP o PDF")

    import uuid
    nombre = f"{uuid.uuid4().hex[:12]}{ext}"
    destino = DIR / nombre
    destino.write_bytes(contenido)

    adjunto = Adjunto(
        empresa_id=current_user.empresa_id,
        tipo=tipo,
        equipo_id=equipo_id,
        registro_id=registro_id,
        ticket_id=ticket_id,
        archivo=f"/storage/adjuntos/{nombre}",
        descripcion=descripcion,
        creado_por=current_user.nombre,
    )
    db.add(adjunto)
    db.commit()
    db.refresh(adjunto)
    return _serialize(adjunto)


@router.get("")
def listar(
    tipo: str = None,
    ref_id: int = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Adjunto)
    if current_user.empresa_id:
        query = query.filter(Adjunto.empresa_id == current_user.empresa_id)
    if tipo == "equipo":
        query = query.filter(Adjunto.equipo_id == ref_id)
    elif tipo == "mantenimiento":
        query = query.filter(Adjunto.registro_id == ref_id)
    elif tipo == "ticket":
        query = query.filter(Adjunto.ticket_id == ref_id)
    adjuntos = query.order_by(Adjunto.id.desc()).all()
    return [_serialize(a) for a in adjuntos]


@router.delete("/{adjunto_id}")
def eliminar(
    adjunto_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "supervisor")),
):
    adjunto = db.query(Adjunto).filter(Adjunto.id == adjunto_id).first()
    if not adjunto:
        raise HTTPException(status_code=404, detail="Adjunto no encontrado")

    ruta = Path(__file__).resolve().parents[3] / adjunto.archivo.lstrip("/") if adjunto.archivo else None
    if ruta and ruta.exists():
        try:
            ruta.unlink()
        except OSError:
            pass

    db.delete(adjunto)
    db.commit()
    return {"message": "Adjunto eliminado"}