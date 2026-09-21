from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_permiso
from app.core.database import get_db
from app.models.system import Notificacion, Parametro, Ticket
from app.models.user import Usuario
from app.schemas.common import Paginated
from app.schemas.system import NotificacionRead, ParametroRead, TicketCreate, TicketRead
from app.services.numbering import get_next_number

router = APIRouter(tags=["Sistema"])


# ------------------------------------------------------------------ notificaciones
@router.get("/notificaciones", response_model=list[NotificacionRead])
def listar_notificaciones(
    leida: bool | None = None,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    user: Usuario = Depends(get_current_user),
):
    stmt = select(Notificacion).where(Notificacion.usuario_destino_id == user.id)
    if leida is not None:
        stmt = stmt.where(Notificacion.leida == leida)
    return db.scalars(stmt.order_by(Notificacion.id.desc()).limit(limit)).all()


@router.put("/notificaciones/{notif_id}/leer")
def marcar_leida(
    notif_id: int,
    db: Session = Depends(get_db),
    user: Usuario = Depends(get_current_user),
):
    n = db.get(Notificacion, notif_id)
    if n and n.usuario_destino_id == user.id:
        n.leida = True
        db.commit()
    return {"success": True}


# ------------------------------------------------------------------ tickets
@router.get("/tickets", response_model=Paginated[TicketRead])
def listar_tickets(
    estado: str | None = None,
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=200),
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("ver_activos")),
):
    stmt = select(Ticket)
    if estado:
        stmt = stmt.where(Ticket.estado == estado)
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = db.scalars(stmt.order_by(Ticket.id.desc()).offset((page - 1) * size).limit(size)).all()
    return Paginated(items=rows, total=total, page=page, page_size=size, pages=-(total // -size))


@router.post("/tickets", response_model=TicketRead, status_code=201)
def crear_ticket(
    data: TicketCreate,
    db: Session = Depends(get_db),
    user: Usuario = Depends(get_current_user),
):
    numero = get_next_number(db, "TKT", Ticket)
    t = Ticket(
        numero=numero,
        sede_id=data.sede_id,
        solicitante=data.solicitante or user.nombre,
        categoria=data.categoria,
        prioridad=data.prioridad or "MEDIA",
        descripcion=data.descripcion,
        estado="ABIERTO",
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return t


@router.put("/tickets/{ticket_id}", response_model=TicketRead)
def atender_ticket(
    ticket_id: int,
    data: dict,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("registrar_mantenimiento")),
):
    t = db.get(Ticket, ticket_id)
    if not t:
        from app.core.errors import NotFoundError

        raise NotFoundError("Ticket")
    from datetime import datetime, timezone

    if data.get("estado") == "RESUELTO":
        t.estado = "RESUELTO"
        t.solucion = data.get("solucion")
        t.fecha_solucion = datetime.now(timezone.utc)
    elif data.get("estado"):
        t.estado = data["estado"]
    db.commit()
    db.refresh(t)
    return t


# ------------------------------------------------------------------ parámetros
@router.get("/parametros", response_model=list[ParametroRead])
def listar_parametros(
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("administrar_config")),
):
    return db.scalars(select(Parametro).order_by(Parametro.grupo, Parametro.clave)).all()


@router.put("/parametros/{clave}")
def actualizar_parametro(
    clave: str,
    data: dict,
    db: Session = Depends(get_db),
    _: Usuario = Depends(require_permiso("administrar_config")),
):
    p = db.scalar(select(Parametro).where(Parametro.clave == clave))
    if not p:
        from app.core.errors import NotFoundError

        raise NotFoundError("Parámetro")
    p.valor = str(data.get("valor", ""))
    db.commit()
    db.refresh(p)
    return p