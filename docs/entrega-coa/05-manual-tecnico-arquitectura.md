# Manual Técnico y de Arquitectura — Agro360

**Sistema de Caracterización Predial Agropecuaria**
**Versión:** 1.0 — Entrega formal COA
**Fecha:** Abril 2026

---

## 1. Resumen ejecutivo

Agro360 es una aplicación web construida sobre **Next.js 16 (App Router)**, **React 19**, **TypeScript** y **Supabase** como backend como servicio (BaaS). Los datos se capturan en el navegador del asesor y se envían al servidor mediante endpoints serverless. La aplicación incorpora soporte **offline-first** con almacenamiento temporal en IndexedDB y sincronización diferida.

El frontend se despliega en **Vercel** (edge network + serverless functions). No hay servidor Node persistente — todo se ejecuta como funciones serverless en demanda.

---

## 2. Pila tecnológica (stack)

### 2.1 Frontend

| Componente | Versión | Rol |
|---|---|---|
| **Next.js** | 16.0.10 | Framework React con App Router, SSR, ISR |
| **React** | 19.2.0 | Biblioteca de UI |
| **TypeScript** | 5.x | Tipado estático |
| **Tailwind CSS** | 4.1.9 | Sistema de estilos utility-first |
| **Radix UI** | 1.x | Primitivas accesibles (diálogos, menús, etc.) |
| **shadcn/ui** | — | Sistema de componentes basado en Radix + Tailwind |
| **React Hook Form** | 7.60 | Gestión de formularios |
| **Zod** | 3.25 | Validación de esquemas |
| **Leaflet** | 1.9.4 | Mapas interactivos |
| **qrcode.react** | 4.2 | Generación de códigos QR |

### 2.2 Backend / infraestructura

| Componente | Rol |
|---|---|
| **Supabase** | Auth + PostgreSQL + Storage + RLS |
| **Vercel** | Hosting, edge functions, CDN |
| **Nodemailer** | Envío de correos (SMTP) |

### 2.3 Base de datos

- **PostgreSQL 15+** gestionado por Supabase.
- **Row Level Security (RLS)** habilitado en todas las tablas.
- Tablas principales: `visitas`, `beneficiarios`, `predios`, `caracterizacion_predio`, `abastecimiento_agua`, `riesgos_predio`, `area_productiva`, `informacion_financiera`, `caracterizaciones`, `profiles`, `invitations`.

Ver **Diccionario de Datos** (`08-diccionario-datos.md`) para esquema completo.

---

## 3. Arquitectura de alto nivel

```
┌──────────────────────────────────────────────────────────┐
│                        Cliente (Navegador)               │
│   ┌─────────────┐  ┌──────────────┐                      │
│   │   React UI  │→ │ React Hook   │                      │
│   │  (Next.js)  │  │ Form + Zod   │                      │
│   └─────────────┘  └──────────────┘                      │
└───────────────────────────┬──────────────────────────────┘
                            │ HTTPS
┌───────────────────────────▼────────────────────────────────┐
│                   Edge / Vercel                           │
│   ┌────────────────────────────────────────────────────┐  │
│   │    proxy.ts (middleware)                           │  │
│   │    • Refresh session  • Auth guard                 │  │
│   └────────────────────────────────────────────────────┘  │
│                          ↓                                 │
│   ┌──────────────────────────────────────────────────────┐│
│   │  Route Handlers (serverless, app/api/*)              ││
│   │  • /api/caracterizaciones  • /api/actualizar-form    ││
│   │  • /api/admin/*            • /api/registro-agricultor││
│   │  • /api/invitar                                      ││
│   └──────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────┐
│                     Supabase                               │
│  ┌───────────────────┐  ┌──────────────────────────────┐   │
│  │ Auth (JWT)        │  │ PostgreSQL + RLS policies    │   │
│  │ • signIn / signUp │  │ • visitas, beneficiarios...  │   │
│  │ • session refresh │  │ • caracterizaciones          │   │
│  └───────────────────┘  └──────────────────────────────┘   │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Storage (S3-compatible)                            │    │
│  │ • fotos-productores  • firmas                      │    │
│  │ • fotos-predios      • documentos-identidad        │    │
│  └────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────┘
             ↓                ↓
   ┌──────────┐ ┌────────────────────┐
   │ SMTP     │
   │ correos  │
   └──────────┘
```

---

## 4. Estructura del proyecto

```
agro-360/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Layout raíz
│   ├── page.tsx                  # Home
│   ├── globals.css               # Estilos globales
│   ├── (rutas públicas)
│   │   ├── formulario/           # Formulario de caracterización
│   │   ├── registro/             # Registro agricultor
│   │   ├── auth/                 # Login, signup, forgot-password
│   │   └── exito/                # Confirmación de envío
│   ├── (rutas protegidas)
│   │   ├── dashboard/            # Dashboard asesor/agricultor
│   │   ├── admin/                # Panel admin
│   │   ├── mapa/                 # Visor de mapas
│   │   ├── profile/              # Perfil usuario
│   │   └── settings/             # Configuración
│   └── api/                      # Route Handlers (serverless)
│       ├── caracterizaciones/    # Crear caracterización (asesor o público)
│       ├── admin/                # Endpoints admin
│       ├── actualizar-formulario/
│       ├── registro-agricultor/
│       ├── invitar/              # Invitaciones por correo
│       ├── upload/               # Subida archivos
│       ├── beneficiario/
│       ├── caracterizacion/[id]/
│       ├── estado/               # Cambio de estado
│       └── health/               # Health check
├── components/
│   ├── characterization-form-complete.tsx  # Formulario 9 pasos (principal)
│   ├── admin-dashboard.tsx       # Dashboard admin
│   ├── agricultor-dashboard.tsx  # Dashboard agricultor
│   ├── legal-document-modal.tsx  # Modal documentos legales
│   ├── photo-upload.tsx          # Captura de fotos
│   ├── signature-pad.tsx         # Firma digital
│   ├── location-picker.tsx       # Selector de ubicación
│   ├── map-viewer.tsx            # Visor de mapas
│   ├── session-validator.tsx
│   ├── user-profile.tsx
│   ├── theme-provider.tsx
│   ├── theme-toggle.tsx
│   ├── env-var-checker.tsx
│   ├── form-field.tsx
│   └── ui/                       # shadcn/ui components
├── context/
│   └── auth-context.tsx          # Provider de autenticación
├── hooks/
│   ├── use-auth.ts               # Re-exporta AuthContext
│   ├── use-session-validation.ts
│   ├── use-mobile.ts
│   └── use-toast.ts
├── lib/
│   ├── email/                    # Templates HTML correos
│   ├── supabase/
│   │   ├── client.ts             # Cliente browser
│   │   ├── server.ts             # Cliente server (RSC, API)
│   │   ├── middleware.ts         # updateSession
│   │   └── storage.ts            # Helpers Storage
│   ├── generate-pdf.ts
│   └── utils.ts                  # cn() y utilitarios
├── supabase/
│   └── migrations/               # Migraciones SQL
├── scripts/                      # SQL inicial (legacy)
├── public/
│   └── icons/                    # Iconos de la aplicación
├── types/
│   └── leaflet.d.ts              # Declaraciones ambient
├── proxy.ts                      # Middleware Next.js 16
├── next.config.mjs
├── tsconfig.json
├── package.json
└── README.md
```

---

## 5. Patrones arquitectónicos clave

### 5.1 Envío directo al servidor

El formulario envía los datos directamente al servidor al completar el paso 9 cuando hay conectividad. Si no hay red, la app conserva un borrador local y sincroniza después:

```typescript
// components/characterization-form-complete.tsx
const res = await fetch('/api/caracterizaciones', {
  method: 'POST',
  body: JSON.stringify(payload),
})
const { radicadoOficial } = await res.json()
router.push(`/exito?radicado=${radicadoOficial}`)
```

El endpoint `/api/caracterizaciones` (servidor):
1. Si hay JWT de asesor: asigna `asesor_id = user.id`.
2. Inserta en cascada: `beneficiarios` → `predios` → sub-tablas → `visitas` → `caracterizaciones`.
3. Sube fotos/firmas a Supabase Storage.
4. Genera `radicado_oficial` (`RAD-000XXX`).
5. Si el beneficiario tiene correo: crea cuenta con rol `agricultor` y envía correo con credenciales.
6. Retorna `{ radicadoOficial }`.

### 5.2 Autenticación

- **Supabase Auth** (JWT en cookies HttpOnly).
- `proxy.ts` (middleware Next.js 16): refresca sesión en cada request, redirige a `/auth/login` si ruta protegida y no hay usuario.
- `context/auth-context.tsx`: provider cliente que expone `user`, `profile`, `isAsesor`, `isAdmin`, `signOut()`.
- Listener `visibilitychange` refresca sesión al volver a la pestaña.
- Manejo de `refresh_token_not_found` → cierre limpio de sesión.

### 5.3 Row Level Security (RLS)

Todas las tablas tienen RLS habilitado. Políticas principales:

- **Asesor**: SELECT/INSERT/UPDATE sobre sus propias visitas y cascada.
- **Admin**: acceso total.
- **Agricultor**: SELECT sobre sus propias caracterizaciones (vía `numero_documento` en profile).
- **Analista**: SELECT global, UPDATE de `estado` en `caracterizaciones`.

Detalle en `scripts/003_complete_agrosantander_schema.sql` y `supabase/migrations/20260302_update_policies.sql`.

### 5.4 Route Handlers (serverless)

Todos los endpoints en `app/api/*` se ejecutan como **Vercel Functions** (serverless, Node.js 20). Sin estado entre invocaciones.

Endpoints sensibles (admin) usan `SUPABASE_SERVICE_ROLE_KEY` solo en el servidor — nunca se expone al cliente.

---

## 6. Seguridad

### 6.1 Protección de rutas

**Doble capa:**
1. **Servidor** (middleware `proxy.ts`): redirige si no hay JWT válido.
2. **Cliente** (AuthContext + redirect): verifica rol antes de renderizar.

### 6.2 Claves y secretos

- Variables `NEXT_PUBLIC_*` se exponen al cliente — solo para claves públicas.
- `SUPABASE_SERVICE_ROLE_KEY` solo en servidor — bypasea RLS, **no exponer**.
- SMTP, API keys externas — solo en servidor.

### 6.3 Sanitización

- **Zod** valida formas en cliente y servidor.
- **Supabase client** parametriza queries (protección SQL injection automática).
- **React** escapa contenido por defecto (protección XSS).

### 6.4 HTTPS

Vercel fuerza HTTPS en todos los entornos. Los cookies de sesión son `Secure` + `HttpOnly` + `SameSite=Lax`.

### 6.5 Cache-Control

Rutas protegidas (`/admin`, `/dashboard`, `/mapa`, `/profile`, `/settings`) llevan `Cache-Control: no-store` para evitar caché en bfcache del navegador (ver `next.config.mjs`).

---

## 7. Flujos críticos

### 7.1 Flujo de caracterización (asesor autenticado)

```
1. Asesor abre /formulario
2. Completa paso 1..9 → datos en estado React
3. Al llegar al paso 9 + "Enviar":
   → POST /api/caracterizaciones (con JWT del asesor)
   → servidor procesa, retorna radicadoOficial
4. Redirección a /exito?radicado=RAD-000XXX
```

### 7.2 Flujo de caracterización (agricultor sin login)

```
1. Agricultor abre /formulario
2. Completa el formulario (no se auto-llena nombre técnico)
3. Acepta autorizaciones en paso 9
4. Envía → POST /api/caracterizaciones (sin JWT)
5. Servidor procesa con asesor_id = null
6. Si proporcionó correo, recibe credenciales de acceso
```

### 7.3 Flujo de cambio de estado

```
Admin/Analista/Asesor abre /dashboard/caracterizacion/[id]
→ Botón "Cambiar estado" → selecciona estado
→ POST /api/admin/update-estado { id, nuevoEstado }
→ Servidor valida transición según rol
→ UPDATE caracterizaciones SET estado = ...
→ (opcional) envío de correo al beneficiario
```

### 7.4 Flujo de invitación

```
Admin en /admin/usuarios → "Invitar" → ingresa email + rol
→ POST /api/invitar
→ Servidor genera token, inserta en invitations
→ Envía correo con enlace /auth/invitation?token=...
→ Usuario clic → /auth/invitation valida token
→ Crea cuenta en auth.users con rol
→ Redirige a login
```

---

## 8. Correos transaccionales

**`lib/email/`** contiene templates HTML para:

- Notificación de registro + credenciales (primer registro del beneficiario).
- Confirmación de radicado (cuentas existentes).
- Invitación a registrarse.
- Cambio de estado (opcional).

**Motor:** Nodemailer + SMTP (configurado vía env vars).

**Reintento:** si falla el envío, se reintenta una vez tras 3 segundos. Si falla dos veces, se loguea la alerta (se recomienda revisar config SMTP).

---

## 9. Observabilidad

- **Logs** en Vercel Dashboard (retención 1 día plan Hobby, 7 días Pro).
- **Prefijos** para filtrar: `[v0]`, `[v0 AUTH]`.
- **Endpoint `/api/health`** para monitoreo externo.

**Recomendación post-entrega:** integrar Sentry o similar para rastreo de errores en producción.

---

## 10. Performance

- **SSG** (static generation) en páginas no autenticadas (`/`, `/auth/*`).
- **SSR on-demand** en páginas dinámicas (`/dashboard/caracterizacion/[id]`).
- **Bundle splitting** automático de Next.js.
- **Leaflet** cargado dinámicamente solo en `/mapa` y donde se necesita.
- **Imágenes** servidas como `unoptimized: true` (Vercel no facturó optimización adicional).

---

## 11. Limitaciones conocidas

1. **Firma digital**: requiere pantalla táctil o mouse — no usable solo con teclado.
2. **Subida de fotos**: imágenes >10MB se comprimen automáticamente a calidad 0.8 / max 1600px.
3. **Correos SMTP**: sin reintentos persistentes — si el servidor SMTP está caído >3s, el correo no se envía.

---

## 12. Extensibilidad

Para agregar nuevos campos al formulario:

1. Agregar columna en Supabase (migración SQL).
2. Agregar campo en formulario (`components/characterization-form-complete.tsx`).
3. Actualizar mapeo en `/api/caracterizaciones/route.ts`.
4. Actualizar vista detalle y exportaciones (`admin-dashboard.tsx`).

Para agregar un nuevo rol:

1. Actualizar CHECK constraint en `profiles.rol` (migración SQL).
2. Actualizar `AuthContext` helpers (`is<NuevoRol>`).
3. Actualizar políticas RLS.
4. Actualizar UI condicional.

---

## 13. Referencias

- **Next.js:** https://nextjs.org/docs
- **Supabase:** https://supabase.com/docs
- **Radix UI:** https://www.radix-ui.com/primitives/docs
- **Leaflet:** https://leafletjs.com/reference.html

Ver también:
- `docs/entrega-coa/06-guia-instalacion-despliegue.md` — instalación paso a paso.
- `docs/entrega-coa/08-diccionario-datos.md` — esquema BD completo.
