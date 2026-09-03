from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_roles
from app.models.catalog import Category, Location
from app.models.user import User

router = APIRouter()

# Solo supervisor o administrador pueden inicializar catálogos
MODIFY_ROLES = require_roles("admin", "supervisor")

DEFAULT_CATEGORIES = [
    {"nombre": "Cómputo", "descripcion": "Portátiles, computadores de escritorio, todo-en-uno"},
    {"nombre": "Impresión", "descripcion": "Impresoras multifuncionales, escáneres y térmicas"},
    {"nombre": "Redes", "descripcion": "Switches, routers, access points y patch panels"},
    {"nombre": "Servidores", "descripcion": "Servidores en rack y almacenamiento NAS/SAN"},
    {"nombre": "Telefonía", "descripcion": "Teléfonos IP, smartphones y centrales telefónicas"},
    {"nombre": "Periféricos", "descripcion": "Monitores, teclados, diademas y docking stations"},
]

DEFAULT_LOCATIONS = [
    {"nombre": "Bodega Central", "ciudad": "Bogotá", "direccion": "CR. 98 # 25g - 10"},
    {"nombre": "Sede Principal", "ciudad": "Bogotá", "direccion": "Calle 26 N 68C-61"},
    {"nombre": "Sede Norte", "ciudad": "Bogotá", "direccion": "Cra 45 # 103-20"},
    {"nombre": "Data Center TI", "ciudad": "Bogotá", "direccion": "Sala técnica piso 2"},
    {"nombre": "Taller de Soporte", "ciudad": "Bogotá", "direccion": "Laboratorio técnico"},
]


@router.post("/seed")
def seed_catalogos(
    db: Session = Depends(get_db),
    _: User = Depends(MODIFY_ROLES),
):
    """Puebla categorías y ubicaciones por defecto si no existen."""
    creadas_cat = 0
    for cat in DEFAULT_CATEGORIES:
        if not db.query(Category).filter(Category.nombre == cat["nombre"]).first():
            db.add(Category(nombre=cat["nombre"], descripcion=cat["descripcion"]))
            creadas_cat += 1

    creadas_loc = 0
    for loc in DEFAULT_LOCATIONS:
        if not db.query(Location).filter(Location.nombre == loc["nombre"]).first():
            db.add(Location(nombre=loc["nombre"], ciudad=loc["ciudad"], direccion=loc["direccion"]))
            creadas_loc += 1

    db.commit()

    return {
        "ok": True,
        "message": f"Catálogos inicializados: {creadas_cat} categorías y {creadas_loc} ubicaciones creadas.",
        "categorias_creadas": creadas_cat,
        "ubicaciones_creadas": creadas_loc,
    }
