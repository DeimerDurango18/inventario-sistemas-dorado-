import os
import shutil
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(ROOT))

import pyodbc

from app.core.config import settings as s

encrypt = "yes" if int(s.db_encrypt) else "no"
sv = f"{s.db_server},{s.db_port}"
cs = (
    f"DRIVER={{{s.db_driver}}};SERVER={sv};DATABASE={s.db_database};"
    f"UID={s.db_username};PWD={s.db_password};Encrypt={encrypt};TrustServerCertificate=yes"
)
cn = pyodbc.connect(cs, timeout=15)
cn.autocommit = True
cur = cn.cursor()

dest = Path("storage/backups") / "respaldado_pre_remaster.bak"
if dest.exists():
    dest.unlink()

p = Path(r"C:\Program Files\Microsoft SQL Server\MSSQL17.SQLEXPRESS\MSSQL\Backup\respaldado_pre_remaster.bak")
if p.exists():
    p.unlink()

cur.execute("BACKUP DATABASE [InventarioEquipos] TO DISK = ? WITH FORMAT, INIT", str(p))
print("backup iniciado")

captured = False
for i in range(30):
    if p.exists():
        try:
            shutil.copy2(str(p), str(dest))
            captured = True
            print(f"COPIADO a los {(i * 0.25):.2f}s -> {dest} ({dest.stat().st_size} bytes)")
            break
        except Exception as e:
            print("error copy:", e)
    time.sleep(0.25)

print("captured:", captured)
for _ in range(3):
    time.sleep(1)
    print(f"origen existe: {p.exists()} | destino existe: {dest.exists()} ({dest.stat().st_size if dest.exists() else 0})")