"""Almacenamiento seguro de adjuntos y actas en disco."""

from __future__ import annotations

import mimetypes
import uuid
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import BASE_DIR, settings
from app.core.errors import ConflictError, NotFoundError, ValidationError
from app.models.asset import Activo
from app.models.documental import Archivo

_STORAGE = Path(settings.storage_path)
if not _STORAGE.is_absolute():
    _STORAGE = BASE_DIR / _STORAGE


def _storage_dir(*parts: str) -> Path:
    d = _STORAGE.joinpath(*parts)
    d.mkdir(parents=True, exist_ok=True)
    return d


def _validate_upload(archivo: UploadFile) -> str:
    original = Path(archivo.filename or "archivo").name
    if not original or original in {".", ".."}:
        raise ValidationError("El archivo no tiene un nombre válido.")
    ext = Path(original).suffix.lower()
    if ext not in settings.upload_extensions:
        raise ValidationError(f"Tipo de archivo no permitido: {ext or 'sin extensión'}.")
    return ext


def guardar_archivo(
    db: Session,
    archivo: UploadFile,
    entidad_tipo: str,
    entidad_id: int,
    usuario_id: int | None = None,
    tipo_documento: str | None = None,
) -> Archivo:
    """Guarda un UploadFile con límite de tamaño y extensión permitida."""
    if entidad_tipo.upper() == "ACTIVO" and not db.get(Activo, entidad_id):
        raise NotFoundError("Activo")

    ext = _validate_upload(archivo)
    tipo_documento = tipo_documento or "GENERAL"
    guardado = f"{uuid.uuid4().hex}{ext}"
    carpeta = _storage_dir("adjuntos", entidad_tipo.lower())
    destino = carpeta / guardado
    max_bytes = settings.max_upload_mb * 1024 * 1024
    total = 0

    try:
        with destino.open("xb") as out:
            while chunk := archivo.file.read(1024 * 1024):
                total += len(chunk)
                if total > max_bytes:
                    raise ValidationError(f"El archivo supera el límite de {settings.max_upload_mb} MB.")
                out.write(chunk)
    except FileExistsError as exc:
        raise ConflictError("No fue posible generar un nombre seguro para el archivo.") from exc
    except Exception:
        destino.unlink(missing_ok=True)
        raise

    mime = archivo.content_type or mimetypes.guess_type(destino.name)[0] or "application/octet-stream"
    row = Archivo(
        entidad_tipo=entidad_tipo.upper(),
        entidad_id=entidad_id,
        tipo_documento=tipo_documento[:40],
        nombre_original=Path(archivo.filename or guardado).name[:255],
        ruta=str(destino.relative_to(_STORAGE)),
        mime=mime[:100],
        tamano=total,
        usuario_id=usuario_id,
    )
    try:
        db.add(row)
        db.commit()
        db.refresh(row)
    except Exception:
        destino.unlink(missing_ok=True)
        db.rollback()
        raise
    return row


def listar_archivos(db: Session, entidad_tipo: str, entidad_id: int):
    return db.scalars(
        select(Archivo)
        .where(Archivo.entidad_tipo == entidad_tipo.upper(), Archivo.entidad_id == entidad_id)
        .order_by(Archivo.id.desc())
    ).all()


def get_archivo(db: Session, archivo_id: int) -> Archivo:
    a = db.get(Archivo, archivo_id)
    if not a:
        raise NotFoundError("Archivo")
    return a


def ruta_disco(archivo: Archivo) -> Path:
    root = _STORAGE.resolve()
    p = (root / archivo.ruta).resolve()
    if root not in p.parents and p != root:
        raise ValidationError("Ruta de archivo inválida.")
    return p


def eliminar_archivo(db: Session, archivo_id: int) -> None:
    a = get_archivo(db, archivo_id)
    p = ruta_disco(a)
    p.unlink(missing_ok=True)
    db.delete(a)
    db.commit()


def guardar_pdf(pdf_bytes: bytes, numero: str) -> str:
    carpeta = _storage_dir("actas")
    nombre = f"{Path(numero).name.replace('/', '-')}.pdf"
    destino = carpeta / nombre
    destino.write_bytes(pdf_bytes)
    return str(destino.relative_to(_STORAGE))


def leer_pdf(ruta_relativa: str) -> Path:
    root = _STORAGE.resolve()
    p = (root / ruta_relativa).resolve() if not Path(ruta_relativa).is_absolute() else Path(ruta_relativa).resolve()
    if root not in p.parents or not p.exists() or p.suffix.lower() != ".pdf":
        raise NotFoundError("PDF del acta")
    return p
