"""Seed inicial idempotente: permisos, roles, usuario admin, catálogos y geografía.

Uso (from backend/):
    python ../scripts/seed.py
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from sqlalchemy import select  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.core.database import SessionLocal  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.models.asset import Activo, Responsable  # noqa: E402
from app.models.catalog import Categoria, EstadoActivo, Marca, Modelo, Subcategoria  # noqa: E402
from app.models.geo import Ciudad, Departamento, Pais, TipoUbicacion, Sede, Ubicacion  # noqa: E402
from app.models.user import Permiso, Rol, Usuario  # noqa: E402

PERMISOS = [
    ("ver_activos", "Ver activos", "Activos"),
    ("crear_activos", "Registrar activos", "Activos"),
    ("editar_activos", "Editar activos", "Activos"),
    ("crear_movimientos", "Registrar movimientos", "Operaciones"),
    ("aprobar_movimientos", "Aprobar movimientos", "Operaciones"),
    ("registrar_mantenimiento", "Registrar mantenimientos", "Operaciones"),
    ("generar_actas", "Generar actas", "Operaciones"),
    ("gestionar_usuarios", "Gestionar usuarios y roles", "Configuración"),
    ("gestionar_catalogos", "Gestionar catálogos y geografía", "Configuración"),
    ("ver_auditoria", "Ver auditoría", "Configuración"),
    ("exportar_reportes", "Exportar reportes", "Reportes"),
    ("administrar_config", "Administrar configuración", "Configuración"),
]

ROL_ADMIN = "ADMINISTRADOR"
ROLES = {
    ROL_ADMIN: ("Administrador", "Acceso total al sistema."),
    "SUPERVISOR": ("Supervisor Nacional", "Gestión operativa nacional y regional."),
    "TECNICO": ("Técnico TI", "Operaciones y mantenimiento."),
    "INVENTARIO": ("Inventario", "Registro y control de inventario."),
    "CONSULTA": ("Solo Consulta", "Acceso de solo lectura."),
}

ROLES_PERMISOS = {
    "ADMINISTRADOR": [p[0] for p in PERMISOS],
    "SUPERVISOR": [
        "ver_activos", "crear_activos", "editar_activos", "crear_movimientos",
        "aprobar_movimientos", "registrar_mantenimiento", "generar_actas",
        "ver_auditoria", "exportar_reportes", "gestionar_catalogos",
    ],
    "TECNICO": [
        "ver_activos", "crear_movimientos", "registrar_mantenimiento", "generar_actas",
    ],
    "INVENTARIO": [
        "ver_activos", "crear_activos", "editar_activos", "crear_movimientos", "generar_actas",
    ],
    "CONSULTA": ["ver_activos"],
}

ESTADOS = [
    ("DISPONIBLE", "Disponible", "#28a745"),
    ("EN_USO", "En uso", "#007bff"),
    ("BODEGA", "En bodega", "#6c757d"),
    ("PRESTAMO", "En préstamo", "#fd7e14"),
    ("MANTENIMIENTO", "En mantenimiento", "#dc3545"),
    ("BAJA", "Dado de baja", "#343a40"),
    ("GARANTIA_EXPIRADA", "Garantía expirada", "#ffc107"),
]

CATEGORIAS = [
    ("COMPUTADOR", ["Escritorio", "Todo en uno"]),
    ("PORTATIL", ["Notebook", "Ultrabook"]),
    ("IMPRESORA", ["Láser", "Multifuncional", "Térmica"]),
    ("RED", ["Switch", "Router", "Access Point", "Firewall"]),
    ("MONITOR", ["20\"-24\"", "27\"", "32\""]),
    ("UPS", ["Oficina", "Industrial"]),
    ("SERVIDOR", ["Rack", "Torre"]),
    ("TELEFONIA", ["Smartphone", "Teléfono fijo"]),
    ("VIDEOVIGILANCIA", ["Cámara", "DVR", "NVR"]),
    ("ACCESORIO", ["Teclado", "Mouse", "Disco externo"]),
    ("PAPELERIA",["Rollos de Stiker","Cinta termica"]),
]

MARCAS = ["Samsung", "Hewlett Packard", "Dell", "Lenovo", "Epson", "Cisco", "APC", "Logitech", "Xiaomi", "Panasonic"]

TIPOS_UBICACION = [
    ("SEDE", "Sede"),
    ("BODEGA", "Bodega"),
    ("OFICINA", "Oficina"),
    ("LABORATORIO", "Laboratorio"),
    ("PUNTO_VENTA", "Punto de Venta"),
    ("DISPENSARIO", "Dispensario"),
    ("FARMACIA", "Farmacia"),
    ("CEDIS", "Cedis"),
]

# (departamento, [ciudades])
COLOMBIA = [
    ("Bogotá D.C.", ["Bogotá"]),
    ("Antioquia", ["Medellín", "Bello", "Envigado"]),
    ("Atlántico", ["Barranquilla", "Soledad"]),
    ("Bolívar", ["Cartagena"]),
    ("Boyacá", ["Tunja", "Sogamoso"]),
    ("Caldas", ["Manizales"]),
    ("Caquetá", ["Florencia"]),
    ("Casanare", ["Yopal"]),
    ("Cauca", ["Popayán"]),
    ("Cesar", ["Valledupar"]),
    ("Chocó", ["Quibdó"]),
    ("Córdoba", ["Montería"]),
    ("Cundinamarca", ["Bogotá", "Soacha", "Chía"]),
    ("Guainía", ["Inírida"]),
    ("Guaviare", ["San José del Guaviare"]),
    ("Huila", ["Neiva"]),
    ("La Guajira", ["Riohacha"]),
    ("Magdalena", ["Santa Marta"]),
    ("Meta", ["Villavicencio"]),
    ("Nariño", ["Pasto"]),
    ("Norte de Santander", ["Cúcuta"]),
    ("Putumayo", ["Mocoa"]),
    ("Quindío", ["Armenia"]),
    ("Risaralda", ["Pereira"]),
    ("San Andrés y Providencia", ["San Andrés"]),
    ("Santander", ["Bucaramanga", "Floridablanca", "Piedecuesta"]),
    ("Sucre", ["Sincelejo"]),
    ("Tolima", ["Ibagué"]),
    ("Valle del Cauca", ["Cali", "Palmira", "Buenaventura"]),
    ("Vaupés", ["Mitú"]),
    ("Vichada", ["Puerto Carreño"]),
    ("Amazonas", ["Leticia"]),
    ("Arauca", ["Arauca"]),
]

SEDES = [
    ("SEDE-001", "Dorado - Bogotá", "Bogotá"),
    ("SEDE-002", "Centro Distribución Medellín", "Medellín"),
    ("SEDE-003", "Sede Cali", "Cali"),
]


def seed_permisos(db: Session) -> dict:
    mapa = {}
    for codigo, nombre, modulo in PERMISOS:
        p = db.scalar(select(Permiso).where(Permiso.codigo == codigo))
        if not p:
            p = Permiso(codigo=codigo, nombre=nombre, modulo=modulo)
            db.add(p)
            db.flush()
        mapa[codigo] = p
    db.commit()
    return mapa


def seed_roles(db: Session, permisos: dict) -> dict:
    mapa = {}
    for codigo, (nombre, descripcion) in ROLES.items():
        rol = db.scalar(select(Rol).where(Rol.codigo == codigo))
        if not rol:
            rol = Rol(codigo=codigo, nombre=nombre, descripcion=descripcion)
            db.add(rol)
            db.flush()
        rol.permisos = [permisos[c] for c in ROLES_PERMISOS[codigo]]
        mapa[codigo] = rol
    db.commit()
    return mapa


def seed_admin(db: Session, rol_admin: Rol) -> Usuario:
    admin = db.scalar(select(Usuario).where(Usuario.username == "admin"))
    password = settings.seed_admin_password
    if not admin:
        admin = Usuario(
            username="admin",
            email=settings.seed_admin_email,
            password_hash=hash_password(password),
            nombre="Administrador del Sistema",
        )
        db.add(admin)
        db.flush()
    elif not admin.password_hash:
        admin.password_hash = hash_password(password)
    admin.roles = [rol_admin]
    db.commit()
    return admin, password


def seed_estados(db: Session) -> dict:
    mapa = {}
    for codigo, nombre, color in ESTADOS:
        e = db.scalar(select(EstadoActivo).where(EstadoActivo.codigo == codigo))
        if not e:
            e = EstadoActivo(codigo=codigo, nombre=nombre, color=color)
            db.add(e)
            db.flush()
        mapa[codigo] = e
    db.commit()
    return mapa


def seed_categorias(db: Session) -> dict:
    mapa = {}
    for nombre, subs in CATEGORIAS:
        c = db.scalar(select(Categoria).where(Categoria.nombre == nombre))
        if not c:
            c = Categoria(nombre=nombre)
            db.add(c)
            db.flush()
        for s in subs:
            sub = db.scalar(
                select(Subcategoria).where(
                    Subcategoria.categoria_id == c.id, Subcategoria.nombre == s
                )
            )
            if not sub:
                db.add(Subcategoria(categoria_id=c.id, nombre=s))
        mapa[nombre] = c
    db.commit()
    return mapa


def seed_marcas(db: Session) -> dict:
    mapa = {}
    for nombre in MARCAS:
        m = db.scalar(select(Marca).where(Marca.nombre == nombre))
        if not m:
            m = Marca(nombre=nombre)
            db.add(m)
            db.flush()
        mapa[nombre] = m
    db.commit()
    return mapa


def seed_tipos_ubicacion(db: Session) -> dict:
    mapa = {}
    for codigo, nombre in TIPOS_UBICACION:
        t = db.scalar(select(TipoUbicacion).where(TipoUbicacion.codigo == codigo))
        if not t:
            t = TipoUbicacion(codigo=codigo, nombre=nombre)
            db.add(t)
            db.flush()
        mapa[codigo] = t
    db.commit()
    return mapa


def seed_geografia(db: Session) -> dict:
    pais = db.scalar(select(Pais).where(Pais.nombre == "Colombia"))
    if not pais:
        pais = Pais(nombre="Colombia")
        db.add(pais)
        db.flush()
    ciudades = {}
    for depto, citys in COLOMBIA:
        d = db.scalar(
            select(Departamento).where(
                Departamento.nombre == depto, Departamento.pais_id == pais.id
            )
        )
        if not d:
            d = Departamento(nombre=depto, pais_id=pais.id)
            db.add(d)
            db.flush()
        for ciudad in citys:
            if (depto, ciudad) in ciudades:
                continue
            c = db.scalar(
                select(Ciudad).where(
                    Ciudad.nombre == ciudad, Ciudad.departamento_id == d.id
                )
            )
            if not c:
                c = Ciudad(nombre=ciudad, departamento_id=d.id)
                db.add(c)
                db.flush()
            ciudades[ciudad] = c
    db.commit()
    return ciudades


def seed_sedes(db: Session, ciudades: dict, tipos: dict):
    for codigo, nombre, ciudad in SEDES:
        s = db.scalar(select(Sede).where(Sede.codigo == codigo))
        if not s:
            c = ciudades[ciudad]
            s = Sede(
                codigo=codigo,
                nombre=nombre,
                ciudad_id=c.id,
                tipo_ubicacion_id=tipos["SEDE"].id,
                estado="ACTIVA",
            )
            db.add(s)
            db.flush()
        # ubicaciones típicas por sede
        for tipo, nombre_ubi in (("OFICINA", "Administración"), ("Cedis", "Cedis Dorado")):
            u = db.scalar(
                select(Ubicacion).where(
                    Ubicacion.nombre == nombre_ubi, Ubicacion.sede_id == s.id
                )
            )
            if not u:
                db.add(
                    Ubicacion(
                        nombre=nombre_ubi,
                        sede_id=s.id,
                        tipo_ubicacion_id=tipos[tipo].id,
                    )
                )
    db.commit()


def seed_responsables(db: Session, sedes: list):
    datos = [
        ("1062676023", "Deimer David DurangoPetro", "Técnico TI", "Cedis Dorado - Bogotá"),
        ("1030506070", "María Fernanda Gómez", "Administradora sistema", "Sede Principal Bogotá"),
        ("1040607080", "Andrés Felipe Ramírez", "Auxiliar de inventario", "Centro Distribución Medellín"),
    ]
    for documento, nombre, cargo, sede in datos:
        r = db.scalar(select(Responsable).where(Responsable.documento == documento))
        if r:
            continue
        s = next((x for x in sedes if x.nombre == sede), None)
        db.add(
            Responsable(
                documento=documento,
                nombre=nombre,
                cargo=cargo,
                sede_id=s.id if s else None,
            )
        )
    db.commit()


def main() -> None:
    db: Session = SessionLocal()
    try:
        print("[1/8] Permisos...")
        permisos = seed_permisos(db)
        print("[2/8] Roles...")
        roles = seed_roles(db, permisos)
        print("[3/8] Usuario admin...")
        admin, password = seed_admin(db, roles[ROL_ADMIN])
        print(f"       admin listo -> usuario: {admin.username} | contraseña: {password}")
        print("[4/8] Estados de activo...")
        seed_estados(db)
        print("[5/8] Categorías/subcategorías...")
        seed_categorias(db)
        print("[6/8] Marcas...")
        seed_marcas(db)
        print("[7/8] Tipos ubicación y geografía Colombia...")
        seed_tipos_ubicacion(db)
        ciudades = seed_geografia(db)
        print("[7b] Sedes de ejemplo y responsables...")
        tipos = seed_tipos_ubicacion(db)
        seed_sedes(db, ciudades, tipos)
        sedes = db.scalars(select(Sede).order_by(Sede.id)).all()
        seed_responsables(db, sedes)
        print("Seed completado OK.")
    finally:
        db.close()


if __name__ == "__main__":
    main()