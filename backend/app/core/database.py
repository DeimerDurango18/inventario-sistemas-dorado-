from pathlib import Path
from urllib.parse import quote_plus

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import DB_CONFIG, DB_ENGINE

if DB_ENGINE == "sqlite":
    # Modo desarrollo: no requiere driver ODBC ni SQL Server instalado.
    db_path = Path(__file__).resolve().parents[2] / "storage" / "inventario.db"
    db_path.parent.mkdir(parents=True, exist_ok=True)
    connection_string = f"sqlite:///{db_path}"
    engine = create_engine(connection_string, connect_args={"check_same_thread": False})
else:
    conn_str = (
        f"DRIVER={{{DB_CONFIG['driver']}}};"
        f"SERVER={DB_CONFIG['server']};"
        f"DATABASE={DB_CONFIG['database']};"
        f"UID={DB_CONFIG['username']};"
        f"PWD={DB_CONFIG['password']};"
        "TrustServerCertificate=yes;"
    )
    connection_string = f"mssql+pyodbc:///?odbc_connect={quote_plus(conn_str)}"
    engine = create_engine(connection_string, pool_pre_ping=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def init_db() -> None:
    import app.models  # noqa: F401
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
