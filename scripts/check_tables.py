import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from sqlalchemy import create_engine, text  # noqa: E402

from app.core.config import settings  # noqa: E402

e = create_engine(settings.database_url, future=True)
with e.connect() as c:
    total = c.execute(text("SELECT COUNT(*) FROM sys.tables")).scalar()
    print("tablas totales:", total)
    rows = c.execute(
        text("SELECT name FROM sys.tables WHERE is_ms_shipped = 0 ORDER BY name")
    ).fetchall()
    for r in rows:
        print("-", r[0])