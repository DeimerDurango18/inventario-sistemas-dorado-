# ETICOS — Gestión de Activos TI

Aplicación web para inventario, trazabilidad y operación de activos tecnológicos.

## Arquitectura

- **Backend:** FastAPI + SQLAlchemy + Alembic + JWT.
- **Frontend:** React 18 + Vite + React Router + Bootstrap + Recharts.
- **Base de datos:** SQL Server (producción) y SQLite (pruebas/desarrollo).
- **Documentos:** almacenamiento local de adjuntos, actas PDF y códigos QR.
- **Despliegue:** compatible con Cloudflare Pages + Function/proxy y un backend externo/túnel.

## Mejoras incluidas

- Configuración segura: secretos fuera del código y sin `.env` incluido en el proyecto.
- JWT con `issuer`, claims requeridos, expiración configurable y manejo correcto de tokens inválidos.
- Protección básica contra fuerza bruta en login.
- CORS restringido a orígenes declarados.
- Cabeceras HTTP de seguridad y `X-Request-ID` para trazabilidad.
- Healthcheck que comprueba realmente la conexión a base de datos.
- Inicio de aplicación con `lifespan`; la creación automática de tablas queda desactivada por defecto.
- Validación de usuarios, contraseñas y correos.
- Sesiones del navegador en `sessionStorage` en lugar de almacenamiento persistente.
- Carga de archivos con límite de tamaño, extensiones permitidas y protección de rutas.
- Manejo de errores y pantalla de recuperación del frontend.
- Navegación móvil y menú de usuario sin depender del JavaScript de Bootstrap.
- Scripts de arranque sin credenciales ni IDs sensibles embebidos.

## Instalación local

### 1. Backend

```powershell
cd backend
python -m venv ..\.venv
..\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

Configura como mínimo en `backend/.env`:

```env
SECRET_KEY=<clave aleatoria de 32+ caracteres>
SEED_ADMIN_PASSWORD=<contraseña de 10+ caracteres>
DB_PASSWORD=<clave de SQL Server>
```

Para una instalación local con SQL Server, configura también `DB_SERVER`, `DB_DATABASE`, `DB_USERNAME` y `DB_DRIVER`.

### 2. Esquema

En producción se recomienda:

```powershell
cd backend
alembic upgrade head
```

No se crean tablas automáticamente en producción.

### 3. Datos iniciales

```powershell
cd backend
python ..\scripts\seed.py
```

El usuario administrador inicial se crea usando `SEED_ADMIN_PASSWORD`; no existe una contraseña administrativa fija dentro del código.

### 4. Frontend

```powershell
cd frontend
npm install
npm run dev
```

## Pruebas

Validación estática del backend:

```powershell
python -m compileall backend/app scripts
```

Smoke test contra una base configurada:

```powershell
$env:SMOKE_PASSWORD="<contraseña del admin>"
python scripts\smoke_test.py
```

Build del frontend:

```powershell
cd frontend
npm run build
```

## Variables de entorno relevantes

| Variable | Propósito |
|---|---|
| `SECRET_KEY` | Firma JWT; obligatoria y larga en producción |
| `SEED_ADMIN_PASSWORD` | Contraseña inicial del administrador |
| `DEBUG` | Modo desarrollo |
| `AUTO_CREATE_SCHEMA` | Solo desarrollo; crea tablas automáticamente |
| `CORS_ORIGINS` | Orígenes frontend permitidos |
| `DB_*` | Conexión a SQL Server |
| `MAX_UPLOAD_MB` | Límite de adjuntos |
| `ALLOWED_UPLOAD_EXTENSIONS` | Extensiones aceptadas |
| `ETICOS_DEPLOY` | Activa despliegue Cloudflare en `start_eticos.ps1` |
| `CLOUDFLARE_ACCOUNT_ID` | ID de cuenta Cloudflare, solo entorno |
| `CLOUDFLARE_API_TOKEN` | Token Cloudflare, solo entorno |
| `CLOUDFLARE_PAGES_PROJECT` | Nombre del proyecto Pages |

## Seguridad operativa

1. Si el archivo `backend/.env` fue compartido fuera del equipo, **rota inmediatamente la contraseña de la base de datos y cualquier secreto contenido allí**.
2. Genera una nueva `SECRET_KEY` para cada entorno.
3. No habilites `AUTO_CREATE_SCHEMA` en producción.
4. Mantén `CORS_ORIGINS` limitado a los dominios reales.
5. Coloca el backend detrás de HTTPS y un proxy/WAF con rate limiting para producción.
6. Ejecuta las migraciones con Alembic durante el despliegue.
7. Realiza copias de seguridad de SQL Server y del directorio de documentos.
