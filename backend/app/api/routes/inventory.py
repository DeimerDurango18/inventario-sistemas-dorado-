from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_roles
from app.models.catalog import Category, Location
from app.models.equipment import Equipment, Movement
from app.models.user import User
from app.schemas import BulkEditEquipos, BulkEquipmentItem, EquipmentIn, EquipmentUpdate
from app.services.qr import generar_qr_png
from app.services.exports import exportar_xlsx

router = APIRouter()

# Roles que pueden crear/editar/eliminar equipos (supervisor o administrador).
MODIFY_ROLES = require_roles("admin", "supervisor")

FOTO_DIR = Path(__file__).resolve().parents[3] / "storage" / "fotos"
FOTO_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXT = {".jpg", ".jpeg", ".png", ".webp"}


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
        "foto": equipo.foto,
        "qr_url": f"/api/inventory/equipos/{equipo.id}/qr" if equipo.id else None,
        "created_at": equipo.created_at.isoformat() if equipo.created_at else None,
    }


def _siguiente_folio(db: Session) -> str:
    """Genera el siguiente folio correlativo EQ-#### basado en los folios existentes."""
    folios = db.query(Equipment.folio).all()
    max_num = 0
    for (folio,) in folios:
        if folio and folio.upper().startswith("EQ-"):
            suffix = folio[3:].strip()
            if suffix.isdigit():
                max_num = max(max_num, int(suffix))
    return f"EQ-{max_num + 1:04d}"


def _registrar_movimiento(
    db: Session,
    equipo: Equipment,
    tipo: str,
    persona: str,
    motivo: str = None,
    estado_anterior: str = None,
    estado_nuevo: str = None,
    folio_acta: str = None,
) -> None:
    db.add(
        Movement(
            tipo=tipo,
            folio_acta=folio_acta,
            persona=persona,
            motivo=motivo,
            estado_anterior=estado_anterior,
            estado_nuevo=estado_nuevo,
            equipo_id=equipo.id,
        )
    )


@router.get("/equipos")
def get_equipos(db: Session = Depends(get_db)):
    equipos = db.query(Equipment).order_by(Equipment.id.desc()).all()
    return [_serialize_equipo(equipo) for equipo in equipos]


@router.get("/equipos/buscar")
def buscar_equipos(
    q: str = "",
    estado: str = "",
    categoria_id: int = None,
    ubicacion_id: int = None,
    db: Session = Depends(get_db),
):
    query = db.query(Equipment)
    if q.strip():
        termino = q.strip().lower()
        query = query.filter(
            Equipment.folio.ilike(f"%{termino}%")
            | Equipment.marca.ilike(f"%{termino}%")
            | Equipment.modelo.ilike(f"%{termino}%")
            | Equipment.serie.ilike(f"%{termino}%")
            | Equipment.observaciones.ilike(f"%{termino}%")
        )
    if estado:
        query = query.filter(Equipment.estado == estado)
    if categoria_id:
        query = query.filter(Equipment.categoria_id == categoria_id)
    if ubicacion_id:
        query = query.filter(Equipment.ubicacion_id == ubicacion_id)

    equipos = query.order_by(Equipment.id.desc()).all()
    return [_serialize_equipo(equipo) for equipo in equipos]


@router.get("/equipos/plantilla")
def plantilla_importacion(
    current_user: User = Depends(MODIFY_ROLES),
):
    """Descarga una plantilla Excel con el formato esperado para la carga masiva."""
    filas = [
        {
            "Marca": "HP",
            "Modelo": "ProBook 450",
            "Serie": "SN001",
            "Estado": "disponible",
            "Categoria": "Computo",
            "Ubicacion": "Principal",
            "Valor Aprox": 1500000,
            "Observaciones": "Equipo de ejemplo",
        }
    ]
    contenido = exportar_xlsx(filas) if filas else exportar_xlsx([])
    return Response(
        content=contenido,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": 'attachment; filename="plantilla_equipos.xlsx"'
        },
    )


@router.get("/equipos/historial/{equipo_id}")
def historial_equipo(equipo_id: int, db: Session = Depends(get_db)):
    equipo = db.query(Equipment).filter(Equipment.id == equipo_id).first()
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    movimientos = (
        db.query(Movement)
        .filter(Movement.equipo_id == equipo_id)
        .order_by(Movement.id.desc())
        .all()
    )
    return [
        {
            "id": m.id,
            "tipo": m.tipo,
            "folio_acta": m.folio_acta,
            "persona": m.persona,
            "motivo": m.motivo,
            "estado_anterior": m.estado_anterior,
            "estado_nuevo": m.estado_nuevo,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        }
        for m in movimientos
    ]


@router.get("/equipos/{equipo_id}")
def get_equipo(equipo_id: int, db: Session = Depends(get_db)):
    equipo = db.query(Equipment).filter(Equipment.id == equipo_id).first()
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")
    return _serialize_equipo(equipo)


@router.get("/equipos/{equipo_id}/qr")
def get_equipo_qr(equipo_id: int, db: Session = Depends(get_db)):
    equipo = db.query(Equipment).filter(Equipment.id == equipo_id).first()
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")

    ubicacion_texto = (
        equipo.ubicacion_rel.nombre if equipo.ubicacion_rel else (equipo.ubicacion or "")
    )
    payload = (
        f"EQUIPO|{equipo.folio}|{equipo.marca} {equipo.modelo}|"
        f"{equipo.serie or ''}|{equipo.estado}|{ubicacion_texto}"
    )
    png = generar_qr_png(payload)
    return Response(
        content=png,
        media_type="image/png",
        headers={"Content-Disposition": f'inline; filename="qr_{equipo.folio}.png"'},
    )


@router.post("/equipos", status_code=status.HTTP_201_CREATED)
def crear_equipo(
    payload: EquipmentIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(MODIFY_ROLES),
):
    folio = (payload.folio or "").strip() or _siguiente_folio(db)
    existente = db.query(Equipment).filter(Equipment.folio == folio).first()
    if existente:
        raise HTTPException(status_code=400, detail=f"Ya existe un equipo con el folio '{folio}'")

    equipo = Equipment(
        folio=folio,
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
    db.flush()
    _registrar_movimiento(
        db,
        equipo,
        tipo="ENTRADA",
        persona=current_user.nombre,
        motivo="Alta de equipo en inventario",
        estado_nuevo=equipo.estado,
    )
    db.commit()
    db.refresh(equipo)
    return _serialize_equipo(equipo)


@router.post("/equipos/importar")
def importar_equipos(
    payload: List[BulkEquipmentItem],
    db: Session = Depends(get_db),
    current_user: User = Depends(MODIFY_ROLES),
):
    """Importa equipos de forma masiva desde una lista JSON.

    Cada elemento soporta: marca, modelo, serie, estado, categoria (nombre),
    ubicacion (nombre), valor_aprox, observaciones.
    La marca y modelo son obligatorios. El folio se genera automáticamente.
    """
    if not payload:
        raise HTTPException(status_code=400, detail="Debes enviar una lista de equipos no vacía")

    categorias = {c.nombre.lower(): c for c in db.query(Category).all()}
    ubicaciones = {u.nombre.lower(): u for u in db.query(Location).all()}

    creados = 0
    errores = []

    for idx, fila in enumerate(payload, start=2):
        marca = (fila.marca or "").strip()
        modelo = (fila.modelo or "").strip()
        if not marca or not modelo:
            errores.append({"fila": idx, "error": "Faltan 'marca' y/o 'modelo'"})
            continue

        cat_nombre = (fila.categoria or "").strip()
        ub_nombre = (fila.ubicacion or "").strip()
        categoria = categorias.get(cat_nombre.lower()) if cat_nombre else None
        ubicacion = ubicaciones.get(ub_nombre.lower()) if ub_nombre else None

        serie = (fila.serie or "").strip() or None
        if serie:
            existente = db.query(Equipment).filter(Equipment.serie == serie).first()
            if existente:
                errores.append({"fila": idx, "error": f"Ya existe un equipo con serie '{serie}'"})
                continue

        folio = _siguiente_folio(db)
        equipo = Equipment(
            folio=folio,
            marca=marca,
            modelo=modelo,
            serie=serie,
            estado=(fila.estado or "disponible").strip() or "disponible",
            ubicacion=ub_nombre if ub_nombre and not ubicacion else None,
            categoria_id=categoria.id if categoria else None,
            ubicacion_id=ubicacion.id if ubicacion else None,
            valor_aprox=fila.valor_aprox,
            observaciones=(fila.observaciones or "").strip() or None,
        )
        db.add(equipo)
        db.flush()
        _registrar_movimiento(
            db,
            equipo,
            tipo="ENTRADA",
            persona=current_user.nombre,
            motivo="Importación masiva",
            estado_nuevo=equipo.estado,
        )
        creados += 1

    db.commit()
    return {"creados": creados, "errores": errores}


@router.post("/equipos/lote")
def editar_equipos_lote(
    payload: BulkEditEquipos,
    db: Session = Depends(get_db),
    current_user: User = Depends(MODIFY_ROLES),
):
    """Actualiza en lote el estado, ubicación y/o categoría de varios equipos."""
    if not payload.ids:
        raise HTTPException(status_code=400, detail="Selecciona al menos un equipo")

    cambios = 0
    errores = []
    for eid in payload.ids:
        equipo = db.query(Equipment).filter(Equipment.id == eid).first()
        if not equipo:
            errores.append({"id": eid, "error": "Equipo no encontrado"})
            continue
        estado_anterior = equipo.estado
        if payload.estado is not None and payload.estado != equipo.estado:
            equipo.estado = payload.estado
        if payload.ubicacion_id is not None:
            equipo.ubicacion_id = payload.ubicacion_id
        if payload.ubicacion is not None:
            equipo.ubicacion = payload.ubicacion
        if payload.categoria_id is not None:
            equipo.categoria_id = payload.categoria_id
        db.flush()
        if payload.estado is not None and payload.estado != estado_anterior:
            _registrar_movimiento(
                db,
                equipo,
                tipo="CAMBIO_ESTADO" if estado_anterior not in ("disponible",) else "MOVIMIENTO",
                persona=current_user.nombre,
                motivo="Edición en lote",
                estado_anterior=estado_anterior,
                estado_nuevo=payload.estado,
            )
        cambios += 1

    db.commit()
    return {"actualizados": cambios, "errores": errores}


@router.put("/equipos/{equipo_id}")
def actualizar_equipo(
    equipo_id: int,
    payload: EquipmentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(MODIFY_ROLES),
):
    equipo = db.query(Equipment).filter(Equipment.id == equipo_id).first()
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")

    update_data = payload.model_dump(exclude_unset=True)
    if "folio" in update_data and update_data["folio"] != equipo.folio:
        otro = db.query(Equipment).filter(Equipment.folio == update_data["folio"]).first()
        if otro:
            raise HTTPException(status_code=400, detail=f"Ya existe otro equipo con el folio '{update_data['folio']}'")

    estado_anterior = equipo.estado
    for key, value in update_data.items():
        setattr(equipo, key, value)
    db.flush()

    if "estado" in update_data and update_data["estado"] != estado_anterior:
        _registrar_movimiento(
            db,
            equipo,
            tipo="CAMBIO_ESTADO" if estado_anterior not in ("disponible",) else "MOVIMIENTO",
            persona=current_user.nombre,
            motivo=update_data.get("observaciones") or "Cambio de estado",
            estado_anterior=estado_anterior,
            estado_nuevo=update_data["estado"],
        )

    db.commit()
    db.refresh(equipo)
    return _serialize_equipo(equipo)


@router.post("/equipos/{equipo_id}/foto")
def subir_foto(
    equipo_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(MODIFY_ROLES),
):
    equipo = db.query(Equipment).filter(Equipment.id == equipo_id).first()
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")

    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(status_code=400, detail="Formato no permitido. Usa JPG, PNG o WEBP")

    nombre = f"{equipo.folio}_{equipo.id}{ext}"
    destino = FOTO_DIR / nombre
    contenido = file.file.read()
    destino.write_bytes(contenido)

    equipo.foto = f"/storage/fotos/{nombre}"
    db.commit()
    db.refresh(equipo)
    return {"message": "Foto subida", "foto": equipo.foto}


@router.delete("/equipos/{equipo_id}")
def eliminar_equipo(
    equipo_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(MODIFY_ROLES),
):
    equipo = db.query(Equipment).filter(Equipment.id == equipo_id).first()
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")

    # Eliminar archivo de foto asociado, si existe.
    if equipo.foto:
        ruta = Path(__file__).resolve().parents[3] / equipo.foto.lstrip("/")
        if ruta.exists():
            try:
                ruta.unlink()
            except OSError:
                pass

    db.delete(equipo)
    db.commit()
    return {"message": "Equipo eliminado correctamente", "id": equipo_id}
