from pathlib import Path
import urllib.parse
from typing import List

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]  # backend/
# override=True: el .env del proyecto prevalece sobre variables del sistema
# que puedan existir de instalaciones anteriores.
load_dotenv(BASE_DIR / ".env", override=True)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BASE_DIR / ".env", extra="ignore")

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
    secret_key: str = "eticos-local-secret"
    access_token_expire_minutes: int = 480
    jwt_algorithm: str = "HS256"

    # Seed inicial
    seed_admin_email: str = "admin@eticos.local"
    seed_admin_password: str = "Admin123!"

    # App
    debug: bool = True
    api_port: int = 8500
    frontend_url: str = "http://localhost:5173"

    # CORS (separados por coma)
    cors_origins: str = (
        "http://localhost:5173,http://127.0.0.1:5173,https://inventario-equipos.pages.dev"
    )

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    # Empresa
    company_name: str = "ETICOS S.A.S."
    company_nit: str = "892300678-1"
    company_phone: str = ""
    company_address: str = ""

    # Storage
    storage_path: str = "./storage"

    @property
    def database_url(self) -> str:
        if self.db_engine.lower() != "mssql":
            return self.db_engine  # p. ej. "sqlite:///./inventario.db"
        encrypt = "yes" if int(self.db_encrypt) else "no"
        server = f"{self.db_server},{self.db_port}" if self.db_port else self.db_server
        cs = (
            f"DRIVER={{{self.db_driver}}};SERVER={server};DATABASE={self.db_database};"
            f"UID={self.db_username};PWD={self.db_password};Encrypt={encrypt};"
            f"TrustServerCertificate=yes"
        )
        return "mssql+pyodbc://?odbc_connect=" + urllib.parse.quote_plus(cs)


settings = Settings()