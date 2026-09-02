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
    "password": os.getenv("DB_PASSWORD", "Deimer180705*/"),
    "port": os.getenv("DB_PORT", "1433"),
}

SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production")
DEBUG = os.getenv("DEBUG", "True").lower() in {"1", "true", "yes"}
ALLOWED_HOSTS = [host.strip() for host in os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",") if host.strip()]
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# Datos de la empresa usados en la generación de actas (SALIDA / ENTRADA) en PDF.
COMPANY = {
    "nombre": os.getenv("COMPANY_NAME", "SISTEMAS BOGOTA"),
    "nit": os.getenv("COMPANY_NIT", "900123456-1"),
    "telefono": os.getenv("COMPANY_PHONE", "3157736033"),
    "direccion": os.getenv("COMPANY_ADDRESS", "CALLE 26 N 68C-61 BOGOTA"),
    "marca_agua": os.getenv("COMPANY_WATERMARK", "SISTEMAS BOGOTA"),
}
