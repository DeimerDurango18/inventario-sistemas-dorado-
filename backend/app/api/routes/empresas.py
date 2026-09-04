from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.empresa import Empresa
from app.models.user import User
from app.schemas import EmpresaIn, EmpresaUpdate

router = APIRouter()


def _serialize_empresa(e: Empresa) -> dict:
    return {
        "id": e.id,
        "nombre": e.nombre,
        "nit": e.nit,
        "telefono": e.telefono,
        "direccion": e.direccion,
        "logo_path": e.logo_path,
        "activo": e.activo,
        "created_at": e.created_at.isoformat() if e.created_at else None,
    }


@router.get("/")
def listar_empresas(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lista empresas. Admin ve todas; otros ven su empresa."""
    if current_user.rol == "admin" and current_user.empresa_id is None:
        empresas = db.query(Empresa).all()
    elif current_user.empresa_id:
        empresas = db.query(Empresa).filter(Empresa.id == current_user.empresa_id).all()
    else:
        empresas = db.query(Empresa).all()
    return [_serialize_empresa(e) for e in empresas]


@router.post("/")
def crear_empresa(
    payload: EmpresaIn,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    """Crea una empresa. Solo admin."""
    if db.query(Empresa).filter(Empresa.nombre == payload.nombre).first():
        raise HTTPException(status_code=400, detail="Ya existe una empresa con ese nombre")
    empresa = Empresa(
        nombre=payload.nombre,
        nit=payload.nit,
        telefono=payload.telefono,
        direccion=payload.direccion,
        logo_path=payload.logo_path,
        activo=True,
    )
    db.add(empresa)
    db.commit()
    db.refresh(empresa)
    return _serialize_empresa(empresa)


@router.put("/{empresa_id}")
def actualizar_empresa(
    empresa_id: int,
    payload: EmpresaUpdate,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(empresa, k, v)
    db.commit()
    db.refresh(empresa)
    return _serialize_empresa(empresa)


@router.delete("/{empresa_id}")
def eliminar_empresa(
    empresa_id: int,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    db.delete(empresa)
    db.commit()
    return {"ok": True}


@router.get("/{empresa_id}")
def obtener_empresa(
    empresa_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    if current_user.empresa_id and current_user.empresa_id != empresa_id:
        raise HTTPException(status_code=403, detail="Sin acceso a esta empresa")
    return _serialize_empresa(empresa)


@router.post("/{empresa_id}/asignar-usuario")
def asignar_usuario_empresa(
    empresa_id: int,
    user_id: int,
    current_user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
):
    """Asigna un usuario a una empresa. Solo admin."""
    empresa = db.query(Empresa).filter(Empresa.id == empresa_id).first()
    if not empresa:
        raise HTTPException(status_code=404, detail="Empresa no encontrada")
    usuario = db.query(User).filter(User.id == user_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    usuario.empresa_id = empresa_id
    db.commit()
    return {"ok": True, "usuario_id": user_id, "empresa_id": empresa_id}
