import os
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

cn2 = pyodbc.connect(cs, timeout=15)
c2 = cn2.cursor()
c2.execute(
    "SELECT SERVERPROPERTY('MachineName'), SERVERPROPERTY('InstanceName'), "
    "SERVERPROPERTY('InstanceDefaultBackupPath')"
)
print("server:", c2.fetchone())

p = r"C:\Program Files\Microsoft SQL Server\MSSQL17.SQLEXPRESS\MSSQL\Backup\PracticaCheck.bak"
if os.path.exists(p):
    os.remove(p)
cur.execute("BACKUP DATABASE [InventarioEquipos] TO DISK = ? WITH FORMAT, INIT", p)
print("exec ok, exist right away =", os.path.exists(p))
for i in range(3):
    time.sleep(2)
    print(f"t+{(i+1)*2}s exist =", os.path.exists(p))

c2.execute(
    "SELECT database_name, type, CONVERT(varchar(100), physical_device_name), "
    "backup_finish_date FROM msdb..backupmediafamily bf "
    "JOIN msdb..backupset bs ON bf.media_set_id = bs.media_set_id "
    "WHERE bs.database_name = 'InventarioEquipos' ORDER BY backup_finish_date DESC"
)
print("historial backups:", c2.fetchall()[:5])