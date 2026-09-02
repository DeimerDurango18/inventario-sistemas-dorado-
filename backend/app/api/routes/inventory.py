from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.equipment import Equipment
from app.schemas import EquipmentIn, EquipmentUpdate

router = APIRouter()


def _serialize_equipo(equipo: Equipment) -> dict:
    return {
        "id": equipo.id,
        "folio": equipo.folio,
        "marca": equipo.marca,
        "modelo": equipo.modelo,
        "serie": equipo.serie,
        "estado": equipo.estado,
        "ubicacion": equipo.ubicacion,
        "categoria_id": equipo.categoria_id,
        "ubicacion_id": equipo.ubicacion_id,
        "categoria_nombre": equipo.categoria.nombre if equipo.categoria else None,
        "ubicacion_nombre": equipo.ubicacion_rel.nombre if equipo.ubicacion_rel else (equipo.ubicacion or None),
        "valor_aprox": float(equipo.valor_aprox) if equipo.valor_aprox is not None else None,
        "observaciones": equipo.observaciones,
        "created_at": equipo.created_at.isoformat() if equipo.created_at else None,
    }


@router.get("/equipos")
def get_equipos(db: Session = Depends(get_db)):
    equipos = db.query(Equipment).order_by(Equipment.id.desc()).all()
    return [_serialize_equipo(equipo) for equipo in equipos]


@router.get("/equipos/{equipo_id}")
def get_equipo(equipo_id: int, db: Session = Depends(get_db)):
    equipo = db.query(Equipment).filter(Equipment.id == equipo_id).first()
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    return _serialize_equipo(equipo)


@router.post("/equipos", status_code=status.HTTP_201_CREATED)
def crear_equipo(payload: EquipmentIn, db: Session = Depends(get_db)):
    existente = db.query(Equipment).filter(Equipment.folio == payload.folio).first()
    if existente:
        raise HTTPException(status_code=400, detail=f"Ya existe un equipo con el folio '{payload.folio}'")

    equipo = Equipment(
        folio=payload.folio,
        marca=payload.marca,
        modelo=payload.modelo,
        serie=payload.serie,
        estado=payload.estado or "disponible",
        ubicacion=payload.ubicacion,
        categoria_id=payload.categoria_id,
        ubicacion_id=payload.ubicacion_id,
        valor_aprox=payload.valor_aprox,
        observaciones=payload.observaciones,
    )
    db.add(equipo)
    db.commit()
    db.refresh(equipo)
    return _serialize_equipo(equipo)


@router.put("/equipos/{equipo_id}")
def actualizar_equipo(equipo_id: int, payload: EquipmentUpdate, db: Session = Depends(get_db)):
    equipo = db.query(Equipment).filter(Equipment.id == equipo_id).first()
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")

    update_data = payload.model_dump(exclude_unset=True)
    if "folio" in update_data and update_data["folio"] != equipo.folio:
        otro = db.query(Equipment).filter(Equipment.folio == update_data["folio"]).first()
        if otro:
            raise HTTPException(status_code=400, detail=f"Ya existe otro equipo con el folio '{update_data['folio']}'")

    for key, value in update_data.items():
        setattr(equipo, key, value)

    db.commit()
    db.refresh(equipo)
    return _serialize_equipo(equipo)


@router.delete("/equipos/{equipo_id}")
def eliminar_equipo(equipo_id: int, db: Session = Depends(get_db)):
    equipo = db.query(Equipment).filter(Equipment.id == equipo_id).first()
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")

    db.delete(equipo)
    db.commit()
    return {"message": "Equipo eliminado correctamente", "id": equipo_id}

