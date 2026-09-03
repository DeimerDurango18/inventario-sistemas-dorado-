from pathlib import Path
import os
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[3]
load_dotenv(PROJECT_ROOT / ".env")

DB_ENGINE = os.getenv("DB_ENGINE", "mssql").lower()

DB_CONFIG = {
    "driver": os.getenv("DB_DRIVER", "ODBC Driver 18 for SQL Server"),
    "server": os.getenv("DB_HOST", r"localhost\SQLExpress"),
    "database": os.getenv("DB_NAME", "InventarioEquipos"),
    "username": os.getenv("DB_USER", "sa"),
    # IMPORTANTE: la contraseña se toma SOLO de variables de entorno (.env), nunca hardcodeada.
    "password": os.getenv("DB_PASSWORD", ""),
    "port": os.getenv("DB_PORT", "1433"),
}

# SECRET_KEY se usa para firmar los tokens JWT. Auto-generado si no se define,
# pero se recomienda fijar una estable en .env para que las sesiones persistan.
import secrets as _secrets
_env_secret = os.getenv("SECRET_KEY", "").strip()
if not _env_secret or _env_secret == "change-me-in-production" or len(_env_secret) < 32:
    # Garantizar mínimo 32 bytes (256 bits) para cumplir con el estándar RFC 7518 de HS256
    SECRET_KEY = "inventario-equipos-jwt-secret-key-32bytes-secure-2026!"
else:
    SECRET_KEY = _env_secret
# Expiración de tokens de acceso (minutos). Por defecto 8 horas (una jornada laboral).
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))

DEBUG = os.getenv("DEBUG", "True").lower() in {"1", "true", "yes"}
ALLOWED_HOSTS = [host.strip() for host in os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",") if host.strip()]
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# Orígenes permitidos para CORS (por defecto: frontend local + hosts permitidos).
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", FRONTEND_URL).split(",")
    if origin.strip()
]

# Datos de la empresa usados en la generación de actas (SALIDA / ENTRADA) en PDF.
COMPANY = {
    "nombre": os.getenv("COMPANY_NAME", "SISTEMAS BOGOTA"),
    "nit": os.getenv("COMPANY_NIT", "900123456-1"),
    "telefono": os.getenv("COMPANY_PHONE", "3157736033"),
    "direccion": os.getenv("COMPANY_ADDRESS", "CALLE 26 N 68C-61 BOGOTA"),
    "marca_agua": os.getenv("COMPANY_WATERMARK", "SISTEMAS BOGOTA"),
}
