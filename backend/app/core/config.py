from pathlib import Path
import os
import secrets

from dotenv import load_dotenv

# Carga backend/.env si existe (las variables de entorno del sistema tienen prioridad)
load_dotenv(Path(__file__).resolve().parents[3] / "backend" / ".env", override=False)

# ============================================================
# CONFIGURACION
# Se permite sobreescribir cada valor con variables de entorno
# (recomendado para producción). Los valores de abajo son los
# valores por defecto de desarrollo local.
# ============================================================

# Base de datos - SQL Server local.
# DB_ENGINE puede sobreescribirse vía variable de entorno (los tests usan
# sqlite); para el arranque normal siempre es mssql.
DB_ENGINE = os.getenv("DB_ENGINE", "mssql").lower()
DB_CONFIG = {
    "driver": os.getenv("DB_DRIVER", "ODBC Driver 18 for SQL Server"),
    "server": os.getenv("DB_SERVER", r"localhost\SQLExpress"),
    "database": os.getenv("DB_DATABASE", "InventarioEquipos"),
    "username": os.getenv("DB_USERNAME", "inventario_app"),
    "password": os.getenv("DB_PASSWORD", ""),
    "port": os.getenv("DB_PORT", "1433"),
}

# Seguridad - JWT
DEBUG = os.getenv("DEBUG", "True").lower() in {"1", "true", "yes"}
# En desarrollo se usa una clave efímera para no publicar secretos en el
# repositorio. En producción SECRET_KEY es obligatoria: conserva las sesiones
# tras reinicios y evita que otra instalación pueda firmar tokens válidos.
SECRET_KEY = os.getenv("SECRET_KEY") or secrets.token_urlsafe(48)
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))

# Hosts y CORS
ALLOWED_HOSTS = [h.strip() for h in os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",") if h.strip()]
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:4123")
CORS_ORIGINS = [
    o.strip()
    for o in os.getenv(
        "CORS_ORIGINS",
        "https://inventario-equipos.pages.dev,http://localhost:4123,https://durango-dev.netlify.app",
    ).split(",")
    if o.strip()
]

# SMTP (deshabilitado por defecto)
SMTP = {
    "host": os.getenv("SMTP_HOST", ""),
    "port": int(os.getenv("SMTP_PORT", "587")),
    "user": os.getenv("SMTP_USER", ""),
    "password": os.getenv("SMTP_PASSWORD", ""),
    "from_addr": os.getenv("SMTP_FROM", ""),
    "to": os.getenv("SMTP_TO", ""),
    "use_tls": os.getenv("SMTP_TLS", "1") in {"1", "true", "yes"},
}

# WhatsApp (gateway local whatsapp-web.js + números destino)
WHATSAPP_GATEWAY_URL = os.getenv("WHATSAPP_GATEWAY_URL", "http://127.0.0.1:8900")
WHATSAPP_DESTINOS = [
    d.strip()
    for d in os.getenv("WHATSAPP_DESTINOS", "").split(",")
    if d.strip()
]

# Datos de la empresa para PDFs de actas
_COMPANY_LOGO_DEFAULT = Path(__file__).resolve().parent.parent / "services" / "logo.jpg"
COMPANY = {
    "nombre": "SISTEMAS BOGOTA",
    "nit": "892300678-1",
    "telefono": "3157736033",
    "direccion": "Carrera 98 # 25g - 10",
    "marca_agua": "SISTEMAS BOGOTA",
    "logo_path": str(_COMPANY_LOGO_DEFAULT),
}


def get_public_verify_url() -> str:
    """URL pública usada en los QR de las actas.

    Prioridad: 1) variable de entorno VERIFY_URL, 2) el túnel vigente
    guardado en tunel_url.txt (raíz del proyecto), 3) localhost.
    """
    env = os.getenv("VERIFY_URL")
    if env:
        return env.rstrip("/")
    root = Path(__file__).resolve().parents[3]
    tunel_file = root / "tunel_url.txt"
    try:
        url = tunel_file.read_text(encoding="utf-8").strip()
        if url.startswith("http"):
            return url.rstrip("/")
    except OSError:
        pass
    return "http://localhost:8500"
