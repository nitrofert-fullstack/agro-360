# Guía de Instalación y Despliegue — Agro360

**Sistema de Caracterización Predial Agropecuaria**
**Versión:** 1.0 — Entrega formal COA
**Fecha:** Abril 2026

---

## 1. Resumen

Agro360 se despliega en **dos servicios externos**:

1. **Supabase** (base de datos PostgreSQL + Auth + Storage) — https://supabase.com
2. **Vercel** (hosting frontend + funciones serverless) — https://vercel.com

Ambos servicios tienen planes gratuitos suficientes para piloto. Para producción con volumen se recomienda al menos **Supabase Pro** y **Vercel Pro**.

---

## 2. Requisitos previos

### 2.1 Cuentas y accesos

- Cuenta en [Supabase](https://supabase.com/) (plan mínimo Free; recomendado Pro).
- Cuenta en [Vercel](https://vercel.com/) (plan mínimo Hobby; recomendado Pro).
- Cuenta en [GitHub](https://github.com/) (para alojar el repositorio privado).
- Credenciales SMTP para correo saliente (Gmail, SendGrid, AWS SES u otro).
- Cuenta en [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/) (captcha).

### 2.2 Software local (solo para desarrollo o primer deploy manual)

- **Node.js** 20.x o superior.
- **pnpm** 8.x (o npm/yarn).
- **Git**.

### 2.3 Conocimiento técnico

- Nociones básicas de despliegue en Vercel.
- SQL básico (para aplicar migraciones en Supabase).
- Variables de entorno.

---

## 3. Configuración de Supabase (primera vez)

### 3.1 Crear proyecto

1. Entrar a https://supabase.com/dashboard.
2. **New Project** → asignar nombre (ej. `agro360-prod`).
3. Seleccionar región cercana (ej. `South America (São Paulo)`).
4. Establecer **Database Password** (guardar en gestor de contraseñas).
5. Esperar 2–3 minutos a que se aprovisione.

### 3.2 Obtener credenciales

En el proyecto → **Settings → API**:

- `Project URL` → **`NEXT_PUBLIC_SUPABASE_URL`**.
- `anon public` → **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**.
- `service_role` → **`SUPABASE_SERVICE_ROLE_KEY`** ⚠️ secreto, NO exponer al cliente.

Guardar los tres valores.

### 3.3 Aplicar esquema de base de datos

**Orden de ejecución** (SQL Editor → pegar y **Run**):

1. `scripts/001_create_schema.sql` — tablas base.
2. `scripts/002_complete_schema.sql` — ampliación de tablas.
3. `scripts/003_complete_agrosantander_schema.sql` — esquema completo + RLS + triggers.
4. `scripts/005_public_registros_rls.sql` — políticas para formulario público.
5. Migraciones en `supabase/migrations/` (orden por fecha):
   - `20260309_fecha_nacimiento.sql` — añade `beneficiarios.fecha_nacimiento`.
   - `20260309_migracion_completa.sql` — consolidación idempotente (estado default `INICIADO`, limpieza de columnas legacy, política UPDATE en `caracterizaciones`).
   - `20260422_campos_adicionales.sql` — contacto secundario, fotos adicionales, `numero_documento` en `profiles`, rol `analista` en CHECK constraint.

> **Atajo:** todas las migraciones son idempotentes (`IF NOT EXISTS` / `IF EXISTS`) — seguras de reejecutar sin perder datos.

### 3.4 Crear Storage buckets

Los buckets se crean **automáticamente** en el primer envío de caracterización (ver `lib/supabase/storage.ts`). Se pueden crear manualmente en **Storage → New bucket**:

| Bucket | Público | Propósito |
|---|---|---|
| `fotos-productores` | No | Fotos de rostro del beneficiario |
| `firmas` | No | Firmas digitales |
| `fotos-predios` | No | Fotos del predio |
| `documentos-identidad` | No | Foto frontal y trasera del documento |

Tras creación, aplicar políticas: **Storage → Policies** → para cada bucket:
```sql
-- Permitir a usuarios autenticados subir/leer
CREATE POLICY "authenticated_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'fotos-productores');

CREATE POLICY "authenticated_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'fotos-productores');
```

(Repetir para los otros buckets.)

### 3.5 Configurar duración del JWT

**Settings → Auth → JWT Expiry:**
- Recomendado: **18000 segundos** (5 horas) — balance entre seguridad y UX móvil.
- Default: 3600 (1 hora).

### 3.6 Configurar provider de Auth por email

**Settings → Auth → Providers → Email:**
- **Enable Email Provider**: ON.
- **Confirm Email**: ON (recomendado).
- **Secure Email Change**: ON.

**Settings → Auth → URL Configuration:**
- **Site URL**: `https://<dominio-producción>`.
- **Redirect URLs**: agregar:
  - `https://<dominio-producción>/auth/callback`
  - `https://<dominio-producción>/auth/confirm`

### 3.7 Crear usuario admin inicial

Opción A — desde SQL:

```sql
-- Después de crear el usuario via Supabase Dashboard → Authentication → Users → Add user
UPDATE public.profiles
SET rol = 'admin', activo = true
WHERE email = 'admin@tudominio.com';
```

Opción B — desde la UI una vez desplegada la app:

1. Registrarse normalmente.
2. Desde SQL Editor: `UPDATE profiles SET rol = 'admin' WHERE email = '...'`.

---

## 4. Configuración de servicios externos

### 4.1 Cloudflare Turnstile

1. Cuenta Cloudflare → **Turnstile** → **Add site**.
2. Domain: el dominio de la app (y `localhost` para dev).
3. Obtener **Site Key** → `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
4. Obtener **Secret Key** → `TURNSTILE_SECRET_KEY`.

### 4.2 SMTP (correo saliente)

Cualquier proveedor SMTP es válido. Ejemplo Gmail (contraseña de aplicación):

- `SMTP_HOST`: `smtp.gmail.com`
- `SMTP_PORT`: `587`
- `SMTP_USER`: cuenta de envío.
- `SMTP_PASS`: contraseña de aplicación (no la principal).
- `SMTP_FROM`: `"Agro360 <noreply@tudominio.com>"`

Para producción se recomienda **SendGrid**, **AWS SES** o **Mailgun** por confiabilidad y límites.

---

## 5. Variables de entorno

Lista completa:

```env
# --- Supabase (REQUERIDAS) ---
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=ey...
SUPABASE_SERVICE_ROLE_KEY=ey...   # SECRETO, solo en servidor

# --- App ---
NEXT_PUBLIC_APP_URL=https://agro360.tudominio.com

# --- Captcha (REQUERIDAS en producción) ---
NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAAA...
TURNSTILE_SECRET_KEY=0x4AAAAAAA...

# --- SMTP (REQUERIDAS para correos) ---
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@tudominio.com
SMTP_PASS=xxxxxxxxxxxx
SMTP_FROM="Agro360 <noreply@tudominio.com>"

```

---

## 6. Despliegue en Vercel

### 6.1 Opción A — Deploy automático desde GitHub (recomendado)

1. Subir el código a un repositorio GitHub privado.
2. Vercel → **New Project** → **Import Git Repository** → seleccionar el repo.
3. **Framework Preset**: Next.js (se detecta automáticamente).
4. **Root Directory**: `.` (raíz).
5. **Build Command**: `next build` (default).
6. **Output Directory**: `.next` (default).
7. **Install Command**: `pnpm install` (ajustar si se usa npm/yarn).
8. **Environment Variables**: agregar todas las del punto 5.
9. Presionar **Deploy**.
10. Esperar 3–5 minutos — la URL queda publicada.

**Cada `git push` a `main`** redesplegará automáticamente.

### 6.2 Opción B — Deploy manual con Vercel CLI

```bash
# Instalar CLI
npm install -g vercel

# Desde la raíz del proyecto
vercel login
vercel --prod
```

Seguir las indicaciones interactivas.

### 6.3 Configurar dominio personalizado

1. Vercel → Project → **Settings → Domains** → **Add Domain**.
2. Ingresar el dominio (ej. `agro360.tu-dominio.com`).
3. Agregar el registro CNAME o A indicado en el DNS del dominio.
4. Esperar propagación DNS (puede tardar hasta 24 h, normalmente minutos).
5. Vercel genera certificado TLS automático (Let's Encrypt).

### 6.4 Actualizar `NEXT_PUBLIC_APP_URL`

Tras asignar dominio:

1. Vercel → **Settings → Environment Variables** → editar `NEXT_PUBLIC_APP_URL` con la URL final.
2. **Settings → Deployments → Redeploy** el último deploy.

### 6.5 Actualizar Supabase Auth URLs

En Supabase → **Auth → URL Configuration**, actualizar Site URL y Redirect URLs con el dominio final.

---

## 7. Desarrollo local

### 7.1 Clonar e instalar

```bash
git clone <repo-url> agro-360
cd agro-360
pnpm install
```

### 7.2 Crear `.env.local`

Copiar las variables del punto 5 en un archivo `.env.local` en la raíz.

### 7.3 Ejecutar en modo desarrollo

```bash
pnpm dev
```

La app se abre en `http://localhost:3000`.

### 7.4 Build local

```bash
pnpm build
pnpm start
```

### 7.5 Lint y typecheck

```bash
pnpm lint          # ESLint
npx tsc --noEmit   # TypeScript sin emitir
```

---

## 8. Primeros pasos después del despliegue

1. **Verificar `/status`**: debe retornar **"ok"**.
2. **Crear usuario admin** (ver 3.7).
3. **Iniciar sesión** con admin → `/admin`.
4. **Invitar al primer asesor** → `/admin/usuarios → Invitar`.
5. **Crear caracterización de prueba** → `/formulario`.
6. **Verificar registro** → debe aparecer en `/admin/caracterizaciones`.
7. **Verificar correo** → revisar que el asesor recibió la invitación.

---

## 9. Actualizaciones

### 9.1 Push de cambios de código

```bash
git add .
git commit -m "descripción del cambio"
git push origin main
```

Vercel redespliega automáticamente. Verificar en **Deployments** que el build pasó.

### 9.2 Aplicar migración de BD

1. Colocar el nuevo archivo SQL en `supabase/migrations/YYYYMMDD_nombre.sql`.
2. Commit + push (para que quede en el repo).
3. Ir a Supabase → **SQL Editor** → pegar el contenido → **Run**.
4. Verificar que no hubo errores.

### 9.3 Actualizar dependencias

```bash
pnpm update
pnpm audit
```

Revisar cambios breaking en `CHANGELOG` de las dependencias mayores.

---

## 10. Rollback

### 10.1 Rollback de frontend

Vercel → **Deployments** → seleccionar un deploy anterior → **"Promote to Production"**.

### 10.2 Rollback de BD

1. Supabase → **Database → Backups** → seleccionar backup anterior → **Restore**.
2. Advertencia: se pierden los datos posteriores al backup.

### 10.3 Rollback con migración inversa

Para migraciones que no deben restaurarse desde backup:

```sql
-- Ejemplo: revertir una columna añadida
ALTER TABLE caracterizaciones DROP COLUMN IF EXISTS nueva_columna;
```

---

## 11. Checklist de salida a producción

- [ ] Supabase configurado y migraciones aplicadas.
- [ ] Storage buckets creados con políticas.
- [ ] Variables de entorno en Vercel completas.
- [ ] Dominio personalizado configurado y certificado TLS activo.
- [ ] Auth Site URL y Redirect URLs correctas en Supabase.
- [ ] Usuario admin creado.
- [ ] SMTP funcionando (probar con correo de invitación).
- [ ] Turnstile captcha funcionando.
- [ ] `/status` responde OK.
- [ ] Respaldos automáticos habilitados en Supabase.
- [ ] Documentación entregada al operador.

---

## 12. Troubleshooting

### "Variables de entorno faltantes"

→ Faltan `NEXT_PUBLIC_SUPABASE_URL` o `NEXT_PUBLIC_SUPABASE_ANON_KEY` en Vercel. Agregarlas y redesplegar.

### "Error: Could not fetch user"

→ El JWT expiró o la URL de Supabase está mal. Revisar env vars.

### "No se envían correos"

→ Verificar SMTP en logs de Vercel. Revisar spam del destinatario. Confirmar credenciales correctas.

### "RLS policy violation"

→ Falta una política o el rol no es correcto. Revisar `auth.uid()` y el valor de `profiles.rol` del usuario.

### "Envío falla con 500"

→ Revisar logs del endpoint `/api/caracterizaciones`. Causa común: `SUPABASE_SERVICE_ROLE_KEY` faltante o incorrecta.

---

## 13. Contacto

Para soporte al despliegue, utilizar el canal operativo acordado con el operador. SLAs y términos en el **Documento de Soporte y Garantía**.
