# Manual de Administrador — Agro360

**Sistema de Caracterización Predial Agropecuaria**
**Versión:** 1.0 — Entrega formal COA
**Fecha:** Abril 2026

---

## 1. Alcance del rol administrador

El administrador (`rol = 'admin'`) tiene acceso completo al sistema:

- Gestión de usuarios (crear, desactivar, cambiar rol, eliminar).
- Gestión de todas las caracterizaciones (editar, cambiar estado, eliminar).
- Asignación de asesores a caracterizaciones huérfanas.
- Visualización de estadísticas agregadas.
- Invitación de nuevos usuarios por correo.
- Gestión de la base de datos (Supabase) — accesos separados.

---

## 2. Acceso al panel de administración

1. Iniciar sesión con credenciales de administrador.
2. Acceder a `/admin` desde el menú superior (solo visible para el rol admin).
3. Se despliega el panel con cuatro secciones principales:
   - **Dashboard** (`/admin`): resumen general.
   - **Caracterizaciones** (`/admin/caracterizaciones`): listado completo.
   - **Usuarios** (`/admin/usuarios`): gestión de cuentas.
   - **Estadísticas** (`/admin/estadisticas`): reportes y gráficos.

---

## 3. Gestión de usuarios

### 3.1 Ver listado

En `/admin/usuarios`:

- Tabla con todos los usuarios registrados.
- Columnas: nombre, correo, rol, estado (activo/inactivo), fecha de registro.
- Filtros por rol y estado.
- Buscador por nombre o correo.

### 3.2 Crear un asesor (invitación por correo)

1. Presionar **"Invitar usuario"**.
2. Ingresar correo electrónico.
3. Seleccionar rol a asignar (`asesor`, `analista`, `admin`, `agricultor`).
4. Enviar. El sistema dispara correo con enlace de invitación (24 h de validez).
5. El usuario completa registro desde el enlace.

**Flujo técnico:** `POST /api/invitar` → genera token → inserta en tabla `invitations` → envía correo vía `nodemailer` (SMTP configurado).

### 3.3 Cambiar rol de un usuario

1. En la fila del usuario, presionar el menú **⋮** → **"Cambiar rol"**.
2. Seleccionar nuevo rol.
3. Confirmar.

**Restricciones:**
- No se puede quitar el rol admin al último administrador activo.
- Cambiar a `agricultor` revoca accesos a dashboard y admin.

**Endpoint:** `POST /api/admin/change-role` — requiere rol admin.

### 3.4 Desactivar / activar usuario

1. Menú **⋮** → **"Desactivar"** o **"Activar"**.
2. Un usuario desactivado no puede iniciar sesión pero sus datos se conservan.

**Endpoint:** `POST /api/admin/toggle-user`.

### 3.5 Eliminar usuario

**⚠️ Operación destructiva.**

1. Menú **⋮** → **"Eliminar usuario"**.
2. Confirmar con el nombre del usuario.
3. Se elimina de `profiles` y de `auth.users` de Supabase.

**Nota:** las caracterizaciones asociadas NO se eliminan — quedan con `asesor_id = null`. Luego se pueden reasignar (ver 3.6).

**Endpoint:** `POST /api/admin/delete-user`.

### 3.6 Reasignar asesor de una caracterización

Caracterizaciones huérfanas (sin asesor) se pueden reasignar:

1. Ir a `/admin/caracterizaciones`.
2. Filtrar por **"Sin asesor"**.
3. Seleccionar caracterización → **"Asignar asesor"**.
4. Elegir del listado.

**Endpoint:** `POST /api/admin/assign-asesor`.

---

## 4. Gestión de caracterizaciones

### 4.1 Ver listado completo

`/admin/caracterizaciones`:

- Tabla paginada con todas las caracterizaciones.
- Columnas: radicado, beneficiario, predio, estado, asesor, fecha.
- Filtros por estado, asesor, municipio, rango de fechas.
- Buscador por radicado o documento.

### 4.2 Editar una caracterización

1. Presionar una fila → se abre la vista detallada.
2. Presionar **"Editar"** (solo admin y asesores).
3. Se abre el formulario pre-llenado.
4. Modificar y guardar.

**Endpoint:** `POST /api/actualizar-formulario`.

### 4.3 Cambiar estado

El administrador puede transicionar a cualquier estado:

| Desde → Hasta | Admin | Asesor | Analista |
|---|---|---|---|
| `INICIADO` → `REVISADO` | ✅ | ✅ | ❌ |
| `REVISADO` → `EN_ESTUDIO_CREDITO` | ✅ | ❌ | ✅ |
| `EN_ESTUDIO_CREDITO` → `APROBADO` | ✅ | ❌ | ✅ |
| `EN_ESTUDIO_CREDITO` → `CANCELADO` | ✅ | ❌ | ✅ |
| `APROBADO` / `CANCELADO` → (cualquier otro) | ✅ | ❌ | ❌ |

**Labels en UI:** `APROBADO` → "Viable", `CANCELADO` → "No Viable" (los valores en BD no cambian).

**Endpoint:** `POST /api/admin/update-estado`.

### 4.4 Eliminar una caracterización

**⚠️ Elimina todos los datos relacionados (cascada):** visita, beneficiario (si no tiene otras visitas), predio, caracterización de predio, abastecimiento de agua, riesgos, área productiva, información financiera.

1. En la fila o desde la vista detallada, presionar **"Eliminar"**.
2. Confirmar con el radicado.
3. Operación irreversible.

**Recomendación:** antes de eliminar, descargar la ficha en PDF como respaldo.

---

## 5. Estadísticas

`/admin/estadisticas` muestra:

- **Total de caracterizaciones** por estado.
- **Distribución por municipio** (gráfico).
- **Distribución por asesor** (gráfico).
- **Evolución temporal** (líneas — registros por mes).
- **Tasa de aprobación** (Viable vs No Viable).
- **Área caracterizada** (hectáreas totales).

Los datos se pueden descargar como CSV con **"Exportar estadísticas"**.

**Endpoint:** `GET /api/admin/stats`.

---

## 6. Verificación de salud del sistema

`/status` (accesible solo para admin) muestra:

- Estado de la conexión con Supabase.
- Total de caracterizaciones registradas.
- Errores recientes en el log.

**Endpoint:** `GET /api/health` — retorna `{ status: "ok", ... }` si todos los servicios responden.

---

## 7. Administración de la base de datos (Supabase)

Se accede al panel de Supabase para operaciones avanzadas:

- URL: `https://supabase.com/dashboard/project/<PROJECT_REF>`
- Credenciales: entregadas por separado al administrador.

### 7.1 Operaciones comunes en Supabase

- **SQL Editor**: ejecutar queries, aplicar migraciones.
- **Authentication → Users**: ver usuarios, resetear contraseñas.
- **Storage**: revisar buckets `fotos-productores`, `firmas`, `fotos-predios`, `documentos-identidad`.
- **Database → Backups**: configurar respaldos diarios (Supabase Pro).

### 7.2 Aplicar una migración SQL

1. Ir a **SQL Editor**.
2. Abrir archivo `supabase/migrations/<fecha>_<nombre>.sql` del repositorio.
3. Copiar contenido y pegar.
4. Presionar **"Run"**.

---

## 8. Configuración del entorno

Las variables de entorno se gestionan en Vercel (producción) o en `.env.local` (desarrollo).

Variables requeridas (ver **Guía de Instalación** para detalles):

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave admin de Supabase (NO exponer al cliente) |
| `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` | Configuración correo saliente |
| `TURNSTILE_SECRET_KEY` | Captcha Cloudflare |
| `NEXT_PUBLIC_APP_URL` | URL pública de la app |

**⚠️ Nunca commitear claves al repositorio.** Usar Vercel → Settings → Environment Variables.

---

## 9. Respaldo y recuperación

### 9.1 Respaldo automático

- **Supabase** realiza respaldos diarios automáticos (plan Pro en adelante).
- Los respaldos se conservan 7 días por defecto (configurable).

### 9.2 Exportación manual

1. Supabase → **Database → Backups → Download backup**.
2. Se descarga un archivo `.sql` (dump completo).
3. Guardar en ubicación segura.

### 9.3 Restauración

1. Crear proyecto Supabase nuevo o limpiar el existente.
2. SQL Editor → importar el dump.
3. Verificar que los buckets de Storage se migraron (se hacen aparte).
4. Actualizar variables de entorno en Vercel si cambió la URL del proyecto.

### 9.4 Export CSV de datos

Desde `/admin/caracterizaciones` → **"Exportar todo a CSV"** — descarga un archivo con todas las caracterizaciones.

---

## 10. Monitoreo

### 10.1 Logs de aplicación

- **Vercel Dashboard** → proyecto → **"Logs"**: logs en tiempo real de las funciones.
- Logs con prefijo `[v0]` son informativos.
- Errores `ERROR` deben revisarse.

### 10.2 Correos no entregados

Si un beneficiario no recibe su correo:

1. Verificar spam del destinatario.
2. Revisar logs de Vercel buscando el correo.
3. Confirmar credenciales SMTP en variables de entorno.
4. Reenviar manualmente desde `/api/invitar` si necesario.

---

## 11. Políticas de seguridad y acceso (RLS)

La base de datos utiliza **Row Level Security (RLS)** de Supabase:

- Los asesores solo ven sus propias caracterizaciones.
- Los agricultores solo ven sus propios registros (por `numero_documento`).
- Los administradores y analistas ven todo.

Las políticas están definidas en `supabase/migrations/*.sql` (ver Manual Técnico).

---

## 12. Procedimientos operativos recomendados

### 12.1 Onboarding de un nuevo asesor

1. Invitar por correo desde `/admin/usuarios`.
2. Rol: `asesor`.
3. Una vez registrado, verificar que puede crear caracterizaciones de prueba.
4. Entregarle el Manual de Usuario.

### 12.2 Cierre de una jornada de campo

1. Verificar en `/admin/caracterizaciones` que todos los registros del día quedaron correctamente registrados.
2. Confirmar que los radicados oficiales fueron asignados.

### 12.3 Auditoría mensual

1. Exportar CSV completo de caracterizaciones.
2. Revisar usuarios inactivos y considerar desactivarlos.
3. Verificar respaldos de Supabase funcionando.

---

## 13. Contacto técnico

Para escalamiento técnico utilizar el canal operativo acordado con el operador. Niveles de servicio y SLAs en el **Documento de Soporte y Garantía**.
