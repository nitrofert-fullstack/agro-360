# Agro360 — Sistema de Caracterización Predial Agropecuaria

Aplicación web progresiva (PWA) **offline-first** para la caracterización de predios rurales de pequeños y medianos productores agropecuarios en Santander, Colombia. Permite a asesores técnicos, analistas y administradores levantar fichas completas de caracterización con datos del beneficiario, predio, producción, información financiera, fotos, firma digital y autorización de tratamiento de datos.

- **Stack**: Next.js 16 (App Router) · React 19 · TypeScript · Supabase · Dexie (IndexedDB) · Tailwind CSS · Radix UI · Leaflet.
- **Despliegue**: Vercel (frontend + serverless) + Supabase (PostgreSQL + Auth + Storage).
- **Capacidades offline**: trabajo sin conexión, sincronización diferida al recuperar internet.
- **Roles**: admin, asesor, analista, agricultor.

## Documentación de entrega

Toda la documentación formal (para el operador COA) se encuentra en `docs/entrega-coa/`:

| # | Documento | Descripción |
|---|---|---|
| 1 | Acta de entrega | (elaborado por el cliente) |
| 2 | [Alcance funcional final](docs/entrega-coa/02-alcance-funcional.md) | Funcionalidades del sistema |
| 3 | [Manual de usuario](docs/entrega-coa/03-manual-usuario.md) | Uso de la aplicación |
| 4 | [Manual de administrador](docs/entrega-coa/04-manual-administrador.md) | Operación administrativa |
| 5 | [Manual técnico y de arquitectura](docs/entrega-coa/05-manual-tecnico-arquitectura.md) | Stack, flujos, patrones |
| 6 | [Guía de instalación y despliegue](docs/entrega-coa/06-guia-instalacion-despliegue.md) | Setup Supabase + Vercel |
| 7 | Código fuente + README | Este repositorio |
| 8 | [Diccionario de datos](docs/entrega-coa/08-diccionario-datos.md) | Esquema BD completo |
| 9 | Soporte y garantía | (elaborado por el cliente) |

---

## Inicio rápido (desarrollo local)

```bash
# 1. Clonar e instalar
git clone <repo-url> agro-360
cd agro-360
pnpm install

# 2. Configurar .env.local (ver sección "Variables de entorno")
cp .env.example .env.local   # editar con tus credenciales

# 3. Levantar servidor de desarrollo
pnpm dev
# → http://localhost:3000
```

### Scripts disponibles

| Comando | Acción |
|---|---|
| `pnpm dev` | Servidor de desarrollo (hot reload) |
| `pnpm build` | Build de producción |
| `pnpm start` | Servir build de producción |
| `pnpm lint` | Ejecutar ESLint |
| `npx tsc --noEmit` | Verificar tipos sin emitir |

---

## Variables de entorno

Archivo `.env.local` (desarrollo) o en Vercel → **Settings → Environment Variables** (producción).

**Requeridas:**

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=ey...
SUPABASE_SERVICE_ROLE_KEY=ey...         # Secreto, solo servidor
NEXT_PUBLIC_APP_URL=https://tu-dominio
NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x...
TURNSTILE_SECRET_KEY=0x...
SMTP_HOST=smtp.tu-proveedor.com
SMTP_PORT=587
SMTP_USER=noreply@tu-dominio
SMTP_PASS=xxxxxxxx
SMTP_FROM="Agro360 <noreply@tu-dominio>"
```

**Opcionales** (NDVI y clima):

```env
AGROMONITORING_API_KEY=xxxxxxxxxxxxxxxx
OPENWEATHER_API_KEY=xxxxxxxxxxxxxxxx
```

Para detalles de cada variable y obtención de claves, consultar [guía de instalación](docs/entrega-coa/06-guia-instalacion-despliegue.md).

---

## Estructura del proyecto

```
agro-360/
├── app/                   # Next.js App Router (páginas + API)
│   ├── (rutas)/           # formulario, dashboard, admin, mapa...
│   └── api/               # Route handlers serverless
├── components/            # Componentes React
│   ├── characterization-form-complete.tsx   # Formulario 9 pasos
│   ├── admin-dashboard.tsx
│   └── ui/                # shadcn/ui primitives
├── context/               # AuthContext (estado de sesión)
├── hooks/                 # use-auth, use-sync, use-online-status...
├── lib/
│   ├── db/indexed-db.ts   # Dexie schema (IndexedDB)
│   ├── supabase/          # Clientes Supabase
│   ├── email/             # Templates de correo
│   └── utils.ts
├── supabase/migrations/   # Migraciones SQL
├── scripts/               # SQL inicial
├── public/                # Assets estáticos + PWA (sw.js, manifest.json)
├── types/                 # Declaraciones ambient
├── proxy.ts               # Middleware Next.js 16 (auth)
└── docs/entrega-coa/      # Documentación formal
```

Ver [manual técnico](docs/entrega-coa/05-manual-tecnico-arquitectura.md) para arquitectura completa.

---

## Flujos principales

- **Asesor autenticado** → `/formulario` → guarda en IndexedDB → botón Sincronizar → `POST /api/sync` → datos en Supabase.
- **Agricultor sin login** → `/formulario` con Turnstile → `POST /api/sync-public` → creación de cuenta con credenciales temporales.
- **Agricultor autenticado** → `/dashboard` → ve su caracterización, estado y QR.
- **Admin** → `/admin` → gestión total de usuarios y caracterizaciones.
- **Analista** → cambia estado `EN_ESTUDIO_CREDITO` → `APROBADO` / `CANCELADO`.

---

## Despliegue

### Producción

1. Crear proyecto en [Supabase](https://supabase.com) y aplicar migraciones (`scripts/` + `supabase/migrations/`).
2. Subir repo a GitHub.
3. Importar repo en [Vercel](https://vercel.com) → configurar variables de entorno → **Deploy**.
4. Configurar dominio personalizado en Vercel.
5. Actualizar Site URL y Redirect URLs en Supabase → **Auth**.

Detalles en [guía de instalación](docs/entrega-coa/06-guia-instalacion-despliegue.md).

### CI/CD

Cada `git push` a `main` desencadena un nuevo deploy automático en Vercel. Los pull requests obtienen un preview deploy único.

---

## Documentos legales (protección de datos)

La carpeta `agro360 docs/` contiene las plantillas legales que respaldan el tratamiento de datos personales bajo la Ley 1581 de 2012 y normas concordantes:

- `Politica-Tratamiento-Datos.docx`
- `Aviso-Privacidad.docx`
- `Autorizacion-Tratamiento-Datos.docx`
- `Autorizacion-Uso-Imagen.docx`

El operador debe publicar los dos primeros en un enlace público. Los dos últimos alimentan las autorizaciones que el agricultor acepta en el formulario de caracterización.

---

## Base de datos

El esquema principal se define en:

- `scripts/003_complete_agrosantander_schema.sql` — tablas base + RLS + triggers.
- `supabase/migrations/*.sql` — ampliaciones y ajustes cronológicos.

Tablas principales:

- `visitas`, `beneficiarios`, `predios`, `caracterizacion_predio`.
- `abastecimiento_agua`, `riesgos_predio`, `area_productiva`, `informacion_financiera`.
- `caracterizaciones` (tabla central; URLs de fotos/firma se guardan en sus propias columnas).
- `profiles` (extensión de `auth.users` con rol y metadata), `invitations`.

Consultar [diccionario de datos](docs/entrega-coa/08-diccionario-datos.md) para esquema detallado.

---

## Seguridad

- **Row Level Security (RLS)** habilitado en todas las tablas.
- **JWT** en cookies `HttpOnly`, `Secure`, `SameSite=Lax`.
- **Doble capa de auth**: middleware `proxy.ts` (servidor) + `AuthContext` (cliente).
- **Claves de servicio** (`SUPABASE_SERVICE_ROLE_KEY`) solo en endpoints del servidor.
- **Captcha** (Cloudflare Turnstile) en formulario público.
- **HTTPS** forzado por Vercel.

---

## Soporte

Para soporte técnico, contactar al canal operativo acordado con el operador. Para niveles de servicio y garantía, ver el **Documento de Soporte y Garantía** entregado por separado.

---

## Licencia

Software entregado formalmente al operador. Todos los derechos reservados bajo los términos del contrato de servicio.
