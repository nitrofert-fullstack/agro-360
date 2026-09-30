# 07-documento-arquitectura

> Convertido desde `07-documento-arquitectura.docx`.

**Agro360**

Sistema de Caracterización Predial Agropecuaria

**07. Documento de Arquitectura**

|  |  |
| --- | --- |
| **Campo** | **Valor** |
| Cliente: | Operador COA / Agrosantander |
| Versión: | 1.0 |
| Fecha: | Abril 2026 |
| Elaborado por: | Equipo de Desarrollo |

# 1. Resumen

Agro360 es una SPA/SSR construida con Next.js 16 App Router. No existe servidor Node persistente: todo corre como funciones serverless en Vercel. La base de datos es PostgreSQL gestionada por Supabase con RLS habilitado en todas las tablas.

# 2. Stack Tecnológico

|  |  |  |  |
| --- | --- | --- | --- |
| **Capa** | **Tecnología** | **Versión** | **Rol** |
| Frontend | Next.js | 16.0.10 | Framework React SSR/SSG/serverless |
| Frontend | React | 19.2.0 | Biblioteca de UI |
| Frontend | TypeScript | 5.x | Tipado estático |
| Estilos | Tailwind CSS | 4.1.9 | Utility-first CSS |
| Componentes | Radix UI / shadcn | 1.x | Primitivas accesibles |
| Formularios | React Hook Form | 7.x | Gestión de formularios |
| Validación | Zod | 3.x | Schemas de validación |
| Mapas | Leaflet | 1.9.4 | Mapas interactivos |
| QR | qrcode.react | 4.x | Generación de códigos QR |
| BD | PostgreSQL (Supabase) | 15+ | Base de datos relacional + RLS |
| Auth | Supabase Auth | — | JWT, OAuth, sesiones |
| Storage | Supabase Storage | — | S3-compatible para fotos/firmas |
| Hosting | Vercel | — | Edge + serverless functions |
| Correos | Nodemailer | — | SMTP transaccional |
| Captcha | Cloudflare Turnstile | — | Anti-bot en formulario público |

# 3. Principios Arquitectónicos

* Sin estado entre invocaciones: cada función serverless es independiente.
* Seguridad por capas: middleware proxy.ts (servidor) + AuthContext (cliente) + RLS (BD).
* Service role key solo en servidor: nunca expuesta al cliente.
* Envío directo al servidor: el formulario NO usa almacenamiento local offline.
* Cero dependencias de servidor dedicado: Vercel + Supabase gestionan toda la infraestructura.

# 4. Patrones de Diseño Aplicados

|  |  |
| --- | --- |
| **Patrón** | **Dónde se aplica** |
| Repository pattern | lib/prisma.ts — acceso a BD centralizado vía Prisma ORM |
| Singleton | globalForPrisma en lib/prisma.ts — evita múltiples conexiones en dev |
| Provider pattern | context/auth-context.tsx — estado de autenticación global |
| Middleware guard | proxy.ts — protección de rutas server-side |
| Service layer | app/api/\* — Route Handlers como capa de servicios |
