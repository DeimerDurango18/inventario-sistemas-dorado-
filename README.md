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

Antes del primer arranque, copia `backend/.env.example` como `backend/.env` y
completa como mínimo `DB_PASSWORD` y `SECRET_KEY`. El archivo `.env` queda
fuera de Git para que las credenciales no se publiquen.

## Levantar el proyecto: 4 comandos

Abre 4 terminales (o ejecuta cada `.bat`):

```powershell
# 1) Backend  -> http://localhost:8500  (/health, /docs)
start-backend.bat

# 2) Gateway WhatsApp -> http://127.0.0.1:8900  (/health)  para avisos por WhatsApp
start-whatsapp.bat

# 3) Frontend -> http://localhost:4123
start-frontend.bat

# 4) Túnel público -> guarda la URL en tunel_url.txt (opcional, solo si quieres
#    acceder desde internet o desplegar el frontend apuntando a la API)
start-tunnel.bat
```

Alternativa "todo en uno" para desarrollo local
(backend + gateway WhatsApp + frontend + navegador):

```powershell
iniciar_proyecto.bat
```

## Notificaciones por WhatsApp

El sistema puede enviar avisos (mantenimientos vencidos, garantías, actas sin
firmar, préstamos vencidos) por WhatsApp mediante un gateway local
(`whatsapp-gateway/`) basado en `whatsapp-web.js`:

1. Ejecuta `start-whatsapp.bat` (o lo levanta `iniciar_proyecto.bat`).
   La primera vez genera un código QR en la consola: escánalo con
   WhatsApp > **Dispositivos vinculados** > **Vincular un equipo**.
2. La sesión queda guardada en `whatsapp-gateway/session/`; en arranques
   posteriores no hace falta re-escanear (si el teléfono deja de vincular el
   equipo, escanea el QR de nuevo).
3. Configura los números destino en `backend/.env`:

```ini
WHATSAPP_GATEWAY_URL=http://127.0.0.1:8900
WHATSAPP_DESTINOS=3157410696,3153199403
```

4. En la app (Configuración → Notificaciones) usa **Enviar resumen por WhatsApp**
   (endpoint `POST /api/notificaciones/whatsapp`), o envía el mismo resumen por
   correo con **Enviar resumen por correo** (`POST /api/notificaciones/correo`,
   requiere SMTP configurado).

Notas:

- El gateway corre en la misma máquina que el backend (requiere Node.js y
  Chromium descargado por `whatsapp-web.js`).
- La sesión y el caché de `whatsapp-gateway/` están en `.gitignore`.

## Acceso

- App: http://localhost:4123
- API: http://127.0.0.1:8500
- Docs API (Swagger): http://127.0.0.1:8500/docs
- En una instalación nueva, crea el primer administrador mediante
  `POST /api/auth/register` (Swagger en `/docs`). Después, las cuentas nuevas
  se crean desde **Usuarios** por un administrador; el registro público queda
  cerrado automáticamente.

## Notas importantes

- El túnel gratuito de Cloudflare (`*.trycloudflare.com`) **cambia en cada reinicio**.
  Si el frontend desplegado (Cloudflare Pages/Netlify) debe apuntar a la API por
  internet, actualiza la URL y re-despliega (ver `scripts/desplegar.ps1`).
- Los tests del backend usan SQLite en memoria (`DB_ENGINE=sqlite`); para correrlos:

```powershell
$env:DB_ENGINE='sqlite'
.\.venv\Scripts\python.exe -m pytest backend\tests -q
```
