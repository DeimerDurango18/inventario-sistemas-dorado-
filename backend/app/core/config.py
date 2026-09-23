from pathlib import Path
import secrets
import urllib.parse
from typing import List

from dotenv import load_dotenv
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]  # backend/
# No sobrescribimos variables del entorno del proceso con el .env local.
load_dotenv(BASE_DIR / ".env", override=False)


class Settings(BaseSettings):
    """Configuración centralizada y segura de ETICOS.

    Los valores sensibles deben vivir en variables de entorno/.env local y nunca
    en el código fuente. En producción DEBUG debe ser False y SECRET_KEY debe
    ser una clave aleatoria larga.
    """

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # DB
    db_engine: str = "mssql"
    db_driver: str = "ODBC Driver 18 for SQL Server"
    db_server: str = r"localhost\SQLExpress"
    db_port: str = "1433"
    db_database: str = "InventarioEquipos"
    db_username: str = "inventario_app"
    db_password: str = ""
    db_encrypt: int = 0

    # Seguridad
    secret_key: str = ""
    access_token_expire_minutes: int = Field(default=60, ge=5, le=1440)
    jwt_algorithm: str = "HS256"
    seed_admin_email: str = "admin@eticos.local"
    seed_admin_password: str = ""
    allow_dev_seed: bool = True

    # App
    debug: bool = False
    api_port: int = Field(default=8500, ge=1, le=65535)
    frontend_url: str = "http://localhost:5173"
    auto_create_schema: bool = False
    enable_docs: bool = True
    trusted_proxy: bool = False

    # CORS
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Empresa
    company_name: str = "ETICOS S.A.S."
    company_nit: str = ""
    company_phone: str = ""
    company_address: str = ""
    company_city: str = "BOGOTÁ"
    company_encargado: str = "EDILFER AGUIRRE"
    company_encargado_cargo: str = "DESPACHO BODEGA"
    company_destino: str = "BODEGA BOGOTÁ"

    # Storage
    storage_path: str = "./storage"
    max_upload_mb: int = Field(default=10, ge=1, le=100)
    allowed_upload_extensions: str = ".pdf,.png,.jpg,.jpeg,.webp,.xlsx,.csv,.doc,.docx"

    @field_validator("cors_origins")
    @classmethod
    def normalize_cors(cls, value: str) -> str:
        origins = [item.strip().rstrip("/") for item in value.split(",") if item.strip()]
        if "*" in origins:
            raise ValueError("CORS_ORIGINS no puede contener '*' cuando se usan credenciales o sesiones autenticadas.")
        return ",".join(dict.fromkeys(origins))

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def upload_extensions(self) -> set[str]:
        return {x.strip().lower() for x in self.allowed_upload_extensions.split(",") if x.strip()}

    @property
    def database_url(self) -> str:
        if self.db_engine.lower() != "mssql":
            return self.db_engine
        encrypt = "yes" if int(self.db_encrypt) else "no"
        server = f"{self.db_server},{self.db_port}" if self.db_port else self.db_server
        cs = (
            f"DRIVER={{{self.db_driver}}};SERVER={server};DATABASE={self.db_database};"
            f"UID={self.db_username};PWD={self.db_password};Encrypt={encrypt};"
            f"TrustServerCertificate=yes"
        )
        return "mssql+pyodbc://?odbc_connect=" + urllib.parse.quote_plus(cs)

    def validate_security(self) -> None:
        if self.debug and not self.secret_key:
            self.secret_key = secrets.token_urlsafe(48)
        if not self.secret_key or len(self.secret_key) < 32:
            raise RuntimeError("SECRET_KEY debe existir y tener al menos 32 caracteres.")
        if not self.debug and self.seed_admin_password and self.seed_admin_password in {"Admin123!", "admin123", "password"}:
            raise RuntimeError("SEED_ADMIN_PASSWORD no puede usar una contraseña por defecto insegura en producción.")
        if not self.debug:
            self.allow_dev_seed = False


settings = Settings()
settings.validate_security()
