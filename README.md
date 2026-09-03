# Inventario Equipos

Proyecto moderno con Python y JavaScript:

- Backend: FastAPI + SQLAlchemy + pyodbc
- Frontend: React + Vite
- Base de datos: configurable por entorno (SQL Server / SQLite en desarrollo)

## Estructura

```
InventarioEquipos/
├── .env                  # credenciales locales reales (no versionar)
├── .env.example          # ejemplo de variables de entorno
├── backend/
│   ├── app/
│   ├── requirements.txt
│   └── run.py
├── frontend/
│   ├── src/
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## Configuración de entorno

Copia [.env.example](.env.example) a `.env` y ajusta tus valores reales:

```env
DB_ENGINE=mssql
DB_HOST=localhost\SQLExpress
DB_PORT=1433
DB_NAME=InventarioEquipos
DB_USER=sa
DB_PASSWORD=Deimer180705*/
DB_DRIVER=ODBC Driver 18 for SQL Server
SECRET_KEY=change-me-in-production
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
FRONTEND_URL=http://localhost:5173
```

Las credenciales van en variables de entorno en `.env`, no en el código del backend.

## Módulos incluidos

- **Equipos**: inventario general (marca, modelo, serie, categoría, ubicación, valor, observaciones).
- **Entradas / Salidas**: registro de movimientos de equipos.
- **Mantenimiento**: mantenimientos preventivos/correctivos con seguimiento de estado (programado → en proceso → finalizado).
- **Categorías** y **Ubicaciones**: catálogos de apoyo para clasificar y ubicar equipos.
- **Usuarios**: gestión de usuarios y roles (admin / supervisor / operativo).
- **Actas (Órdenes de Salida/Entrada)**: generación de PDF oficial con el formato físico de la compañía (encabezado, tabla de dispositivos, firmas y marca de agua configurable vía `COMPANY_WATERMARK`).
- **Reportes / Dashboard**: indicadores generales de inventario, mantenimientos activos y actas generadas.

## Generación de actas en PDF

`POST /api/reports/actas` crea una acta (encabezado + ítems) y genera automáticamente el PDF en `backend/storage/actas/`. El formato replica la orden física oficial: logo, "SALIDA N° ..." con fecha, título, párrafo de autorización, bloque de proyecto/destino, tabla DISPOSITIVO/MARCA/DETALLE/CANT/SERIAL, observaciones, valor aproximado, cajas, marca de agua diagonal y firmas de despacho. Los datos de la empresa y la marca de agua se configuran en `.env` (`COMPANY_NAME`, `COMPANY_NIT`, `COMPANY_PHONE`, `COMPANY_ADDRESS`, `COMPANY_WATERMARK`).

Para descargar el PDF de una acta ya creada: `GET /api/reports/actas/{id}/pdf`.

## Modo de desarrollo sin SQL Server

Si no tienes SQL Server instalado, en `.env` cambia `DB_ENGINE=mssql` por `DB_ENGINE=sqlite`. El backend usará automáticamente un archivo SQLite en `backend/storage/inventario.db`, sin necesidad de driver ODBC.

## Ejecutar backend

```powershell
Set-Location "D:\proyectos\InventarioEquipos\backend"
& "D:\proyectos\InventarioEquipos\.venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8010
```

## Ejecutar frontend

```powershell
Set-Location "D:\proyectos\InventarioEquipos\frontend"
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

## URLs

- Backend: http://127.0.0.1:8010
- Frontend: http://localhost:5173
- Health check: http://127.0.0.1:8010/health

## Nota

Se eliminó el proyecto Django anterior y quedó la nueva arquitectura basada en FastAPI + React.
