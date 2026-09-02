from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.equipment import Equipment
from app.models.maintenance import MaintenanceRecord
from app.models.acta import Acta

router = APIRouter()
PDF_DIR = Path(__file__).resolve().parents[3] / "storage" / "actas"


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db)):
    totals = (
        db.query(Equipment.estado, func.count(Equipment.id))
        .group_by(Equipment.estado)
        .all()
    )
    result = {"disponibles": 0, "asignados": 0, "reparacion": 0, "baja": 0}
    for estado, count in totals:
        key = (estado or "").lower()
        if key in result:
            result[key] = count

    mantenimientos_activos = (
        db.query(MaintenanceRecord)
        .filter(MaintenanceRecord.estado.in_(["programado", "en_proceso"]))
        .count()
    )
    actas_mes = db.query(Acta).count()

    return {
        "totales": result,
        "mes": "Septiembre",
        "mantenimientos_activos": mantenimientos_activos,
        "actas_generadas": actas_mes,
    }


@router.get("/acta/latest")
def get_latest_acta(db: Session = Depends(get_db)):
    """Devuelve la última acta generada; si no existe ninguna, cae al PDF de ejemplo."""
    ultima = db.query(Acta).order_by(Acta.id.desc()).first()
    if ultima and ultima.pdf_path and Path(ultima.pdf_path).exists():
        return FileResponse(
            path=ultima.pdf_path,
            media_type="application/pdf",
            filename=f"{ultima.tipo.lower()}_{ultima.numero}.pdf",
        )

    pdf_path = PDF_DIR / "acta_ejemplo.pdf"
    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail="No existe el acta PDF")

    return FileResponse(
        path=str(pdf_path),
        media_type="application/pdf",
        filename="acta_inventario.pdf",
    )
