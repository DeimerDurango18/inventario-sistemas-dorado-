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

# SECRET_KEY se usa para firmar los tokens JWT.
# En desarrollo (DEBUG=True): si falta o es débil, se genera una aleatoria por arranque.
# En producción (DEBUG=False): es obligatoria una clave fuerte y se aborta si no la hay.
import secrets as _secrets
_env_secret = os.getenv("SECRET_KEY", "").strip()
_WEAK_SECRETS = {"", "change-me-in-production", "inventario-equipos-jwt-secret-key-32bytes-secure-2026!"}


def _is_weak_secret(value: str) -> bool:
    return value in _WEAK_SECRETS or len(value) < 32


if _is_weak_secret(_env_secret):
    if not DEBUG:
        raise RuntimeError(
            "SECRET_KEY débil o ausente en producción. Genera una con: "
            "python -c \"import secrets; print(secrets.token_urlsafe(64))\""
        )
    SECRET_KEY = _secrets.token_urlsafe(64)
    import warnings as _warnings

    _warnings.warn(
        "SECRET_KEY automática (sesiones temporales). Define SECRET_KEY en .env para sesiones estables.",
        RuntimeWarning,
    )
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

# URL base para la verificación de actas mediante QR
VERIFY_URL = os.getenv("VERIFY_URL", "http://localhost:8010")

# Servidor SMTP para notificaciones por correo hacia el área de sistemas.
# Dejar SMTP_HOST vacío deshabilita el envío (la app seguirá funcionando normal).
SMTP = {
    "host": os.getenv("SMTP_HOST", ""),
    "port": int(os.getenv("SMTP_PORT", "587")),
    "user": os.getenv("SMTP_USER", ""),
    "password": os.getenv("SMTP_PASSWORD", ""),
    "from_addr": os.getenv("SMTP_FROM", ""),
    # Destinatarios por defecto (separados por coma). Si se omite, se usan los
    # correos de los usuarios con rol admin/supervisor.
    "to": os.getenv("SMTP_TO", ""),
    "use_tls": os.getenv("SMTP_TLS", "true").lower() in {"1", "true", "yes"},
}

# Datos de la empresa usados en la generación de actas (SALIDA / ENTRADA) en PDF.
_COMPANY_LOGO_DEFAULT = Path(__file__).resolve().parent.parent / "services" / "logo.jpg"
COMPANY = {
    "nombre": os.getenv("COMPANY_NAME", "SISTEMAS BOGOTA"),
    "nit": os.getenv("COMPANY_NIT", "900123456-1"),
    "telefono": os.getenv("COMPANY_PHONE", "3157736033"),
    "direccion": os.getenv("COMPANY_ADDRESS", "CALLE 26 N 68C-61 BOGOTA"),
    "marca_agua": os.getenv("COMPANY_WATERMARK", "SISTEMAS BOGOTA"),
    "logo_path": os.getenv("COMPANY_LOGO", str(_COMPANY_LOGO_DEFAULT)),
}
