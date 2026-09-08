# Inventario Equipos

Proyecto de gestión de inventario de equipos, actas de entrada/salida, mantenimiento, soporte y puntos de venta.

- **Backend**: FastAPI + SQLAlchemy + pyodbc (Python 3.14, `.venv`)
- **Frontend**: React + Vite (Node/npm)
- **Base de datos**: SQL Server local — instancia `localhost\SQLExpress`, BD `InventarioEquipos`
- **Túnel público**: Cloudflare (`cloudflared`) para exponer la API en internet

## Requisitos

- Python 3.14 (`C:\Users\ddurango\AppData\Local\Programs\Python\Python314\python.exe`)
- SQL Server Express corriendo (servicio `MSSQL$SQLEXPRESS`)
- Node.js + npm
- Cloudflare (`cloudflared`) en `C:\Program Files (x86)\cloudflared\cloudflared.exe`

## Instalación (primera vez)

```powershell
# 1) Crear entorno virtual e instalar dependencias del backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt

# 2) Instalar dependencias del frontend
cd frontend
npm install
cd ..
```

La BD `InventarioEquipos` debe existir en SQL Server. El backend crea/actualiza las tablas
automáticamente al arrancar (usa el usuario `inventario_app`).

> La configuración (BD, claves JWT, datos de empresa) está directamente en
> `backend/app/core/config.py`. **No se necesitan archivos `.env`.**

## Levantar el proyecto: 3 comandos

Abre 3 terminales (o ejecuta cada `.bat`):

```powershell
# 1) Backend  -> http://localhost:8010  (/health, /docs)
start-backend.bat

# 2) Frontend -> http://localhost:5173
start-frontend.bat

# 3) Túnel público -> guarda la URL en tunel_url.txt (opcional, solo si quieres
#    acceder desde internet o desplegar el frontend apuntando a la API)
start-tunnel.bat
```

Alternativa "todo en uno" para desarrollo local (backend + frontend + navegador):

```powershell
iniciar_proyecto.bat
```

## Acceso

- App: http://localhost:5173
- API: http://127.0.0.1:8010
- Docs API (Swagger): http://127.0.0.1:8010/docs
- Login inicial: `admin@sistemasbogota.com` / `Admin2026!`

## Notas importantes

- El túnel gratuito de Cloudflare (`*.trycloudflare.com`) **cambia en cada reinicio**.
  Si el frontend desplegado (Cloudflare Pages/Netlify) debe apuntar a la API por
  internet, actualiza la URL y re-despliega (ver `scripts/desplegar.ps1`).
- Los tests del backend usan SQLite en memoria (`DB_ENGINE=sqlite`); para correrlos:

```powershell
$env:DB_ENGINE='sqlite'
.\.venv\Scripts\python.exe -m pytest backend\tests -q
```