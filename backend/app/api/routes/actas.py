from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import COMPANY
from app.core.database import get_db
from app.models.acta import Acta, ActaItem
from app.schemas import ActaIn
from app.services.pdf_acta import generar_acta_pdf

router = APIRouter()
PDF_DIR = Path(__file__).resolve().parents[3] / "storage" / "actas"


def _siguiente_numero(db: Session) -> str:
    ultimo = db.query(Acta).order_by(Acta.id.desc()).first()
    consecutivo = (ultimo.id if ultimo else 0) + 1760  # arranca en el mismo rango que el ejemplo físico
    return f"SIS-{consecutivo}"


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


@router.get("")
def listar(db: Session = Depends(get_db)):
    actas = db.query(Acta).order_by(Acta.id.desc()).all()
    return [_serialize_acta(a, include_items=True) for a in actas]


@router.get("/{acta_id}")
def obtener_acta(acta_id: int, db: Session = Depends(get_db)):
    acta = db.query(Acta).filter(Acta.id == acta_id).first()
    if not acta:
        raise HTTPException(status_code=404, detail="Acta no encontrada")
    return _serialize_acta(acta, include_items=True)



@router.post("")
def crear(payload: ActaIn, db: Session = Depends(get_db)):
    if payload.tipo not in ("SALIDA", "ENTRADA"):
        raise HTTPException(status_code=400, detail="El tipo debe ser SALIDA o ENTRADA")
    if not payload.items:
        raise HTTPException(status_code=400, detail="El acta debe tener al menos un ítem")

    acta = Acta(
        numero=_siguiente_numero(db),
        tipo=payload.tipo,
        entregado_por=payload.entregado_por,
        proyecto=payload.proyecto,
        responsable_destino=payload.responsable_destino,
        ciudad_destino=payload.ciudad_destino,
        direccion_destino=payload.direccion_destino,
        observaciones=payload.observaciones,
        valor_aprox=payload.valor_aprox,
        cajas=payload.cajas,
    )
    db.add(acta)
    db.flush()  # obtener acta.id antes de crear los items

    for item in payload.items:
        db.add(ActaItem(acta_id=acta.id, **item.model_dump()))

    db.commit()
    db.refresh(acta)

    pdf_path = PDF_DIR / f"acta_{acta.numero}.pdf"
    generar_acta_pdf(acta, acta.items, COMPANY, pdf_path)
    acta.pdf_path = str(pdf_path)
    db.commit()

    return {"id": acta.id, "numero": acta.numero, "pdf_url": f"/api/reports/actas/{acta.id}/pdf"}


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
