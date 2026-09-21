import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(ROOT))

import pyodbc

from app.core.config import settings as s

env_val = os.getenv("DB_PASSWORD", "")
file_val = "Deimer180705*/"


def ver_ok(pwd: str) -> bool:
    encrypt = "yes" if int(s.db_encrypt) else "no"
    sv = f"{s.db_server},{s.db_port}"
    cs = (
        f"DRIVER={{{s.db_driver}}};SERVER={sv};DATABASE={s.db_database};"
        f"UID={s.db_username};PWD={pwd};Encrypt={encrypt};TrustServerCertificate=yes"
    )
    try:
        cn = pyodbc.connect(cs, timeout=10)
        cn.close()
        return True
    except Exception:
        return False


print("env DB_PASSWORD len:", len(env_val), "->", ver_ok(env_val))
print("file Deimer180705*/ ->", ver_ok(file_val))
print("settings.db_password len:", len(s.db_password or ""), "->", ver_ok(s.db_password or ""))