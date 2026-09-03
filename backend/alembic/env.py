"""Entorno de Alembic. Carga la configuración del proyecto desde app.core.config."""
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.core.config import DB_ENGINE
from app.core.database import Base, engine
import app.models  # noqa: F401  (registra los metadatos de todas las tablas)

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def _set_sqlite_pragma(dbapi_connection, connection_record):
    if DB_ENGINE == "sqlite":
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


def run_migrations_offline() -> None:
    context.configure(
        url=str(engine.url),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine

    if DB_ENGINE == "sqlite":
        event_listener = getattr(_set_sqlite_pragma, "engine", None)
        from sqlalchemy import event
        event.listen(connectable, "connect", _set_sqlite_pragma)

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
