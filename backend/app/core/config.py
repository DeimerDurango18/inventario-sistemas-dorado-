from pathlib import Path
import os

# ============================================================
# CONFIGURACION DIRECTA (sin .env)
# ============================================================

# Base de datos - SQL Server local.
# DB_ENGINE puede sobreescribirse vía variable de entorno (los tests usan
# sqlite); para el arranque normal siempre es mssql.
DB_ENGINE = os.getenv("DB_ENGINE", "mssql").lower()
DB_CONFIG = {
    "driver": "ODBC Driver 18 for SQL Server",
    "server": r"localhost\SQLExpress",
    "database": "InventarioEquipos",
    "username": "inventario_app",
    "password": "@Yay0qSOa-@95WSZTCIcIaqe",
    "port": "1433",
}

# Seguridad - JWT
DEBUG = os.getenv("DEBUG", "True").lower() in {"1", "true", "yes"}
SECRET_KEY = "YrGkuxnbe2lQ9PG5Kg8SAhg75gLQ4pk4KF06kW8wIJ1y55scY_6mHA5nMyEDWK9eFWNX7layZ_qo9c7ORQZGcg"
ACCESS_TOKEN_EXPIRE_MINUTES = 480

# Hosts y CORS
ALLOWED_HOSTS = ["localhost", "127.0.0.1"]
FRONTEND_URL = "http://localhost:5173"
CORS_ORIGINS = [
    "https://inventario-equipos.pages.dev",
    "http://localhost:5173",
    "https://durango-dev.netlify.app",
]

# URL base para verificacion de actas QR
VERIFY_URL = "http://localhost:8010"

# SMTP (deshabilitado por defecto)
SMTP = {
    "host": "",
    "port": 587,
    "user": "",
    "password": "",
    "from_addr": "",
    "to": "",
    "use_tls": True,
}

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
