import json
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.core.config import COMPANY
from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.acta import Acta, ActaItem
from app.models.equipment import Equipment, Movement
from app.models.user import User
from app.schemas import ActaFirmaIn, ActaIn
from app.services.pdf_acta import generar_acta_pdf

router = APIRouter()
PDF_DIR = Path(__file__).resolve().parents[3] / "storage" / "actas"
ACTA_FOTO_DIR = Path(__file__).resolve().parents[3] / "storage" / "actas_fotos"
ACTA_FOTO_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".webp"}
MAX_FOTOS = 3

# Solo supervisor/admin pueden emitir o eliminar actas.
MODIFY_ROLES = require_roles("admin", "supervisor")


def _parse_fotos(a: Acta) -> list:
    try:
        return json.loads(a.fotos) if a.fotos else []
    except (ValueError, TypeError):
        return []


def _siguiente_numero(db: Session, empresa_id: int = None) -> str:
    """Genera el siguiente consecutivo SIS-#### de forma correlativa y única."""
    query = db.query(Acta)
    if empresa_id:
        query = query.filter(Acta.empresa_id == empresa_id)
    ultimo = query.order_by(Acta.id.desc()).first()
    base = 1760
    if ultimo and ultimo.numero:
        try:
            parte = ultimo.numero.split("-", 1)[1]
            base = int(parte)
        except (ValueError, IndexError):
            base = int(ultimo.id or 0) + 1760
    return f"SIS-{base + 1}"


def _serialize_acta(a: Acta, include_items: bool = False) -> dict:
    data = {
        "id": a.id,
        "numero": a.numero,
        "tipo": a.tipo,
        "entregado_por": a.entregado_por,
        "proyecto": a.proyecto,
        "responsable_destino": a.responsable_destino,
        "ciudad_destino": a.ciudad_destino,
        "direccion_destino": a.direccion_destino,
        "observaciones": a.observaciones,
        "cajas": a.cajas,
        "valor_aprox": float(a.valor_aprox) if a.valor_aprox is not None else None,
        "firmado_por": a.firmado_por,
        "documento_firma": a.documento_firma,
        "fecha_firma": a.fecha_firma.isoformat() if a.fecha_firma else None,
        "email_destino": a.email_destino,
        "fotos": _parse_fotos(a),
        "created_at": a.created_at.isoformat() if a.created_at else None,
        "items_count": len(a.items),
        "pdf_url": f"/api/reports/actas/{a.id}/pdf",
    }
    if include_items:
        data["items"] = [
            {
                "id": it.id,
                "dispositivo": it.dispositivo,
                "marca": it.marca,
                "detalle": it.detalle,
                "cantidad": it.cantidad,
                "serial": it.serial,
                "equipo_id": it.equipo_id,
            }
            for it in a.items
        ]
    return data


def generate_pdf_background(acta_id: int):
    """Genera el PDF en segundo plano y actualiza la ruta en la DB.

    Si el acta tiene email_destino, envía el PDF por correo al terminar.
    """
    from app.core.database import SessionLocal
    from app.services.email_service import enviar_correo
    db = SessionLocal()
    try:
        acta = db.query(Acta).filter(Acta.id == acta_id).first()
        if acta:
            pdf_path = PDF_DIR / f"acta_{acta.numero}.pdf"
            generar_acta_pdf(acta, acta.items, COMPANY, pdf_path)
            acta.pdf_path = str(pdf_path)
            db.commit()
            if acta.email_destino:
                enviar_correo(
                    destinatarios=[acta.email_destino],
                    asunto=f"Acta {acta.tipo} {acta.numero} - {COMPANY['nombre']}",
                    html=(
                        f"<p>Se generó la <strong>Acta {acta.tipo} {acta.numero}</strong> "
                        f"a cargo de <strong>{acta.entregado_por}</strong>.</p>"
                        f"<p>Encuentra el PDF adjunto.</p>"
                    ),
                    adjuntos=[("acta.pdf", pdf_path)],
                )
    except Exception as e:
        # En un entorno real, usaríamos un logger.
        print(f"Error generando PDF para acta {acta_id}: {e}")
    finally:
        db.close()


@router.get("")
def listar(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(Acta)
    if current_user.empresa_id:
        query = query.filter(Acta.empresa_id == current_user.empresa_id)
    actas = query.order_by(Acta.id.desc()).all()
    return [_serialize_acta(a, include_items=True) for a in actas]


@router.get("/{acta_id}")
def obtener_acta(acta_id: int, db: Session = Depends(get_db)):
    acta = db.query(Acta).filter(Acta.id == acta_id).first()
    if not acta:
        raise HTTPException(status_code=404, detail="Acta no encontrada")
    return _serialize_acta(acta, include_items=True)



@router.post("")
def crear(
    payload: ActaIn,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(MODIFY_ROLES),
):
    if payload.tipo not in ("SALIDA", "ENTRADA"):
        raise HTTPException(status_code=400, detail="El tipo debe ser SALIDA o ENTRADA")
    if not payload.items:
        raise HTTPException(status_code=400, detail="El acta debe tener al menos un ítem")

    eid = current_user.empresa_id
    acta = Acta(
        numero=_siguiente_numero(db, eid),
        tipo=payload.tipo,
        entregado_por=payload.entregado_por,
        proyecto=payload.proyecto,
        responsable_destino=payload.responsable_destino,
        ciudad_destino=payload.ciudad_destino,
        direccion_destino=payload.direccion_destino,
        observaciones=payload.observaciones,
        valor_aprox=payload.valor_aprox,
        cajas=payload.cajas,
        email_destino=payload.email_destino,
        empresa_id=eid,
    )
    db.add(acta)
    db.flush()  # obtener acta.id antes de crear los items

    # Validar y actualizar estado de equipos vinculados + registrar movimiento.
    for item in payload.items:
        db.add(ActaItem(acta_id=acta.id, **item.model_dump()))

        if item.equipo_id:
            equipo = db.query(Equipment).filter(Equipment.id == item.equipo_id).first()
            if not equipo:
                continue
            if payload.tipo == "SALIDA" and equipo.estado == "reparacion":
                raise HTTPException(
                    status_code=400,
                    detail=f"El equipo {equipo.folio} está en reparación y no puede despacharse",
                )
            if payload.tipo == "SALIDA":
                estado_anterior = equipo.estado
                equipo.estado = "asignado"
                db.add(
                    Movement(
                        tipo="SALIDA",
                        folio_acta=acta.numero,
                        persona=current_user.nombre,
                        motivo=item.detalle or "Despacho en acta",
                        estado_anterior=estado_anterior,
                        estado_nuevo="asignado",
                        equipo_id=equipo.id,
                        empresa_id=eid,
                    )
                )
            elif payload.tipo == "ENTRADA":
                estado_anterior = equipo.estado
                equipo.estado = "disponible"
                db.add(
                    Movement(
                        tipo="ENTRADA",
                        folio_acta=acta.numero,
                        persona=current_user.nombre,
                        motivo=item.detalle or "Reingreso en acta",
                        estado_anterior=estado_anterior,
                        estado_nuevo="disponible",
                        equipo_id=equipo.id,
                        empresa_id=eid,
                    )
                )

    try:
        db.commit()
    except IntegrityError:
        # Carrera por el consecutivo (dos actas simultáneas). Los índices
        # únicos garantizan que no se duplique el número; se informa y se reintenta.
        db.rollback()
        raise HTTPException(status_code=409, detail="Conflicto de consecutivo del acta. Presiona nuevamente 'Generar acta'.")
    db.refresh(acta)

    background_tasks.add_task(generate_pdf_background, acta.id)

    return {"id": acta.id, "numero": acta.numero, "pdf_url": f"/api/reports/actas/{acta.id}/pdf"}


@router.post("/{acta_id}/fotos")
def subir_foto_acta(
    acta_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(MODIFY_ROLES),
):
    """Sube una foto/evidencia de la salida o entrada (máximo 3 por acta)."""
    acta = db.query(Acta).filter(Acta.id == acta_id).first()
    if not acta:
        raise HTTPException(status_code=404, detail="Acta no encontrada")

    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(status_code=400, detail="Formato no permitido. Usa JPG, PNG o WEBP")

    fotos = _parse_fotos(acta)
    if len(fotos) >= MAX_FOTOS:
        raise HTTPException(status_code=400, detail=f"Máximo {MAX_FOTOS} fotos por acta")

    nombre = f"acta_{acta.numero}_{len(fotos) + 1}{ext}"
    destino = ACTA_FOTO_DIR / nombre
    destino.write_bytes(file.file.read())

    fotos.append(f"/storage/actas_fotos/{nombre}")
    acta.fotos = json.dumps(fotos)
    db.commit()
    db.refresh(acta)
    return {"message": "Foto subida", "fotos": _parse_fotos(acta)}


@router.delete("/{acta_id}/fotos/{indice}")
def eliminar_foto_acta(
    acta_id: int,
    indice: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(MODIFY_ROLES),
):
    """Elimina una foto del acta por su índice (0-based)."""
    acta = db.query(Acta).filter(Acta.id == acta_id).first()
    if not acta:
        raise HTTPException(status_code=404, detail="Acta no encontrada")

    fotos = _parse_fotos(acta)
    if indice < 0 or indice >= len(fotos):
        raise HTTPException(status_code=404, detail="Foto no encontrada")

    ruta = Path(__file__).resolve().parents[3] / fotos[indice].lstrip("/")
    if ruta.exists():
        try:
            ruta.unlink()
        except OSError:
            pass

    del fotos[indice]
    acta.fotos = json.dumps(fotos) if fotos else None
    db.commit()
    db.refresh(acta)
    return {"message": "Foto eliminada", "fotos": _parse_fotos(acta)}


@router.get("/{acta_id}/verify")
def verificar_acta(acta_id: int, db: Session = Depends(get_db)):
    """Endpoint público para verificar la autenticidad de un acta mediante QR."""
    acta = db.query(Acta).filter(Acta.id == acta_id).first()
    if not acta:
        raise HTTPException(status_code=404, detail="Acta no encontrada o inválida")

    return {
        "estado": "Auténtico",
        "numero": acta.numero,
        "tipo": acta.tipo,
        "fecha": acta.created_at.isoformat() if acta.created_at else "N/A",
        "entregado_por": acta.entregado_por,
        "proyecto": acta.proyecto,
        "items_count": len(acta.items)
    }


@router.post("/{acta_id}/firmar")
def firmar_acta(
    acta_id: int,
    payload: ActaFirmaIn,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(MODIFY_ROLES),
):
    """Registra la firma del responsable del destino y regenera el PDF con la constancia."""
    from datetime import datetime, timezone
    acta = db.query(Acta).filter(Acta.id == acta_id).first()
    if not acta:
        raise HTTPException(status_code=404, detail="Acta no encontrada")
    if not payload.nombre.strip():
        raise HTTPException(status_code=400, detail="El nombre del responsable es obligatorio")

    acta.firmado_por = payload.nombre.strip().upper()
    acta.documento_firma = payload.documento
    acta.fecha_firma = datetime.now(timezone.utc)
    db.commit()
    db.refresh(acta)

    background_tasks.add_task(generate_pdf_background, acta.id)
    return _serialize_acta(acta, include_items=True)

@router.get("/{acta_id}/pdf")
def descargar_pdf(acta_id: int, db: Session = Depends(get_db)):
    acta = db.query(Acta).filter(Acta.id == acta_id).first()
    if not acta:
        raise HTTPException(status_code=404, detail="Acta no encontrada")

    pdf_path = Path(acta.pdf_path) if acta.pdf_path else PDF_DIR / f"acta_{acta.numero}.pdf"
    if not pdf_path.exists():
        generar_acta_pdf(acta, acta.items, COMPANY, pdf_path)

    return FileResponse(
        path=str(pdf_path),
        media_type="application/pdf",
        filename=f"{acta.tipo.lower()}_{acta.numero}.pdf",
    )
