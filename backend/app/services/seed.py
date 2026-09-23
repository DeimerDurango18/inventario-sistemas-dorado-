from __future__ import annotations

import logging
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.models.catalog import EstadoActivo
from app.models.geo import Ciudad, Departamento, Pais
from app.models.system import Parametro
from app.models.user import Permiso, Rol, Usuario

_PERMISOS = [
    ("ver_activos", "Ver activos", "ACTIVOS"),
    ("crear_activos", "Crear activos", "ACTIVOS"),
    ("editar_activos", "Editar activos", "ACTIVOS"),
    ("crear_movimientos", "Registrar movimientos", "MOVIMIENTOS"),
    ("aprobar_movimientos", "Aprobar movimientos", "MOVIMIENTOS"),
    ("registrar_mantenimiento", "Registrar mantenimiento", "MANTENIMIENTO"),
    ("gestionar_catalogos", "Gestionar catálogos", "CATALOGOS"),
    ("gestionar_usuarios", "Gestionar usuarios", "USUARIOS"),
    ("ver_auditoria", "Ver auditoría", "USUARIOS"),
    ("administrar_config", "Administrar configuración", "SISTEMA"),
    ("exportar_reportes", "Exportar reportes", "REPORTES"),
]

_ESTADOS = [
    ("DISPONIBLE", "Disponible", "#28c76f"),
    ("EN_USO", "En uso", "#7367f0"),
    ("BODEGA", "Bodega", "#82868b"),
    ("PRESTAMO", "Prestado", "#ff9f43"),
    ("MANTENIMIENTO", "En mantenimiento", "#ea5455"),
    ("BAJA", "Baja", "#6c757d"),
]

logger = logging.getLogger(__name__)

def _parametros():
    return [
        ("empresa_nombre", settings.company_name, "Nombre de la empresa para documentos", "Empresa"),
        ("empresa_comercial", settings.company_name, "Nombre comercial", "Empresa"),
        ("empresa_nit", settings.company_nit, "NIT de la empresa", "Empresa"),
        ("empresa_telefono", settings.company_phone, "Teléfonos de contacto", "Empresa"),
        ("empresa_direccion", settings.company_address, "Dirección", "Empresa"),
        ("empresa_ciudad", settings.company_city, "Ciudad de la empresa", "Empresa"),
        ("encargado_nombre", settings.company_encargado, "Encargado en las actas", "Empresa"),
        ("encargado_cargo", settings.company_encargado_cargo, "Cargo del encargado", "Empresa"),
        ("destino_nombre", settings.company_destino, "Destino por defecto en actas", "Empresa"),
    ]


_COLOMBIA_DEPARTAMENTOS = [
    ("Amazonas", "Leticia"),
    ("Antioquia", "Medellín"),
    ("Arauca", "Arauca"),
    ("Atlántico", "Barranquilla"),
    ("Bogotá D.C.", "Bogotá"),
    ("Bolívar", "Cartagena"),
    ("Boyacá", "Tunja"),
    ("Caldas", "Manizales"),
    ("Caquetá", "Florencia"),
    ("Casanare", "Yopal"),
    ("Cauca", "Popayán"),
    ("Cesar", "Valledupar"),
    ("Chocó", "Quibdó"),
    ("Córdoba", "Montería"),
    ("Cundinamarca", "Bogotá"),
    ("Guainía", "Inírida"),
    ("Guaviare", "San José del Guaviare"),
    ("Huila", "Neiva"),
    ("La Guajira", "Riohacha"),
    ("Magdalena", "Santa Marta"),
    ("Meta", "Villavicencio"),
    ("Nariño", "Pasto"),
    ("Norte de Santander", "Cúcuta"),
    ("Putumayo", "Mocoa"),
    ("Quindío", "Armenia"),
    ("Risaralda", "Pereira"),
    ("San Andrés y Providencia", "San Andrés"),
    ("Santander", "Bucaramanga"),
    ("Sucre", "Sincelejo"),
    ("Tolima", "Ibagué"),
    ("Valle del Cauca", "Cali"),
    ("Vaupés", "Mitú"),
    ("Vichada", "Puerto Carreño"),
]


def seed_initial(db: Session) -> None:
    """Bootstrap idempotente de datos base (permisos, rol admin, admin, estados, parámetros)."""
    perms: dict[str, Permiso] = {}
    for codigo, nombre, modulo in _PERMISOS:
        p = db.scalar(select(Permiso).where(Permiso.codigo == codigo))
        if not p:
            p = Permiso(codigo=codigo, nombre=nombre, modulo=modulo)
            db.add(p)
            db.flush()
        perms[codigo] = p

    rol = db.scalar(select(Rol).where(Rol.codigo == "ADMINISTRADOR"))
    if not rol:
        rol = Rol(codigo="ADMINISTRADOR", nombre="Administrador", descripcion="Acceso total al sistema")
        db.add(rol)
        db.flush()
    existentes = {p.codigo for p in rol.permisos}
    faltantes = [p for codigo, p in perms.items() if codigo not in existentes]
    if faltantes:
        rol.permisos = list(rol.permisos) + faltantes

    admin = db.scalar(select(Usuario).where(Usuario.username == "admin"))
    if not admin and settings.seed_admin_password:
        admin = Usuario(
            username="admin",
            email=settings.seed_admin_email,
            password_hash=hash_password(settings.seed_admin_password),
            nombre="Administrador del sistema",
        )
        db.add(admin)
        db.flush()
    if not admin and not settings.seed_admin_password:
        logger.warning("SEED_ADMIN_PASSWORD no está configurada; no se crea el usuario admin.")
    if admin and rol not in admin.roles:
        admin.roles = list(admin.roles) + [rol]

    for codigo, nombre, color in _ESTADOS:
        existe = db.scalar(select(EstadoActivo).where(EstadoActivo.codigo == codigo))
        if not existe:
            db.add(EstadoActivo(codigo=codigo, nombre=nombre, color=color))

    for clave, valor, descripcion, grupo in _parametros():
        existe = db.scalar(select(Parametro).where(Parametro.clave == clave))
        if not existe:
            db.add(Parametro(clave=clave, valor=valor, descripcion=descripcion, grupo=grupo))

    colombia = db.scalar(select(Pais).where(Pais.nombre == "Colombia"))
    if not colombia:
        colombia = Pais(nombre="Colombia")
        db.add(colombia)
        db.flush()
    for depto_nombre, ciudad_nombre in _COLOMBIA_DEPARTAMENTOS:
        departamento = db.scalar(
            select(Departamento).where(
                Departamento.nombre == depto_nombre,
                Departamento.pais_id == colombia.id,
            )
        )
        if not departamento:
            departamento = Departamento(nombre=depto_nombre, pais_id=colombia.id)
            db.add(departamento)
            db.flush()
        if not db.scalar(
            select(Ciudad).where(Ciudad.nombre == ciudad_nombre, Ciudad.departamento_id == departamento.id)
        ):
            db.add(Ciudad(nombre=ciudad_nombre, departamento_id=departamento.id))

    db.commit()