# Usuarios Administrador — Inventario de Equipos

Documentación de acceso y credenciales de administración del sistema de inventario.

---

## 1. Cómo funciona el acceso (roles)

El sistema autentica con **JWT**. El primer usuario registrado define quién es administrador,
ya que cualquiera puede auto-registrarse y elegir su rol.

| Rol | Permisos |
|-----|----------|
| `admin` | Acceso total: crear/editar/eliminar equipos, categorías, ubicaciones, usuarios, actas, mantenimientos, ver reportes |
| `supervisor` | Puede modificar inventario (equipos, categorías, actas, mantenimientos) pero **no** gestiona usuarios |
| `operativo` | Solo lectura |

---

## 2. Estado de los usuarios en cada base de datos

### 2.1 Desarrollo / local (SQLite — `backend/storage/inventario.db`)

**Admin funcional para el login** (creado y verificado):

| Correo | Contraseña | Rol |
|--------|-----------|-----|
| `admin@sistemasbogota.com` | `Admin2026!` | admin |

> Cambia la contraseña tras el primer acceso (ver sección 4).

Otros usuarios existentes (contraseñas hasheadas, no recuperables):

| id | Correo | Rol | Activo |
|----|--------|-----|--------|
| 1 | `admin@test.com` | admin | sí |
| 2 | `op@test.com` | operativo | sí |
| 3 | `admin@sistemasbogota.com` | admin | sí |

> Las contraseñas no se guardan en texto plano (bcrypt). Si olvidas la de
> `admin@sistemasbogota.com`, se puede resetear (ver sección 4).

### 2.2 Producción (mssql — `localhost\SQLExpress`, BD `InventarioEquipos`)

- **Actualmente NO hay usuarios** (la tabla `usuarios` está vacía).
- La tabla usa un **esquema antiguo**: le faltan columnas de la nueva versión
  (en particular `password`), por lo que **hay que aplicar la migración** (Alembic)
  antes de poder crear usuarios con el login actual.

**Pasos pendientes para usar mssql con el login:**
1. Aplicar las migraciones: `alembic upgrade head` (desde `backend/`).
2. Crear el primer admin con este endpoint:

```
POST /api/auth/register
Content-Type: application/json

{
  "nombre": "Administrador",
  "correo": "tu.correo@empresa.com",
  "password": "TU_CONTRASENA_SEGURA",
  "rol": "admin"
}
```

usuarios administrador: 

admin@sistemasbogota.com
Admin2026!

---

## 3. Crear un nuevo administrador (sin estar logueado)

El endpoint de registro está abierto (no requiere token). Úsalo para crear un admin:

Ejemplo de registro:

```
curl -X POST http://localhost:8010/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Ing. Sistemas","correo":"sysadmin@empresa.com","password":"MiClaveSegura123!","rol":"admin"}'
```

La respuesta devuelve `access_token`, `token_type` y `user`.

---

## 4. Resetear una contraseña de administrador

Solo objetivo con acceso directo a la base de datos (bcrypt):

```python
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.user import User

db = SessionLocal()
admin = db.query(User).filter(User.correo == "admin@test.com").first()
if admin:
    admin.password = hash_password("NuevaClaveSegura123")
    db.commit()
    print("Contraseña actualizada para:", admin.correo)
db.close()
```

---

## 5. Seguridad / buenas prácticas

- No subir contraseñas reales a git ni a este documento.
- Crear un admin con una contraseña segura (longitud, mayúsculas, números y símbolos).
- La clave `SECRET_KEY` debe ser fija y secreta en producción (usar `.env`, no `change-me-in-production`).
- No usar la contraseña del SQL Server (`sa`) como credencial de la aplicación.

---

## 6. Dónde configurar la base de datos

Configuración del backend en el archivo `.env` (raíz del proyecto):

| Variable | Valor (ejemplo) | Uso |
|----------|-----------------|-----|
| `DB_ENGINE` | `mssql` (producción) / `sqlite` (desarrollo) | Motor de BD |
| `DB_HOST` | `localhost\SQLExpress` | Servidor mssql |
| `DB_NAME` | `InventarioEquipos` | Base de datos |
| `SECRET_KEY` | generar una aleatoria segura | Firma de tokens JWT |